const crypto = require('crypto');
const db = require('../config/db');
const QRCode = require('qrcode');
const { ticketBookingsTotal, ticketRevenueTotal } = require('./metricsController');

// Helper làm sạch dữ liệu đầu vào chống Stored XSS (CWE-79)
function sanitizeInput(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/<[^>]*>?/gm, '').trim();
}

// Sinh mã vé độc nhất an toàn (Cryptographically Secure Random - Chống IDOR CWE-330/384)
function generateTicketCode() {
    const secureToken = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `TKT-DTC24520-${secureToken}`;
}

// Xử lý Đặt vé & Thanh toán giả lập (ACID Transaction)
async function processBooking(req, res) {
    // 0. BẮT BUỘC ĐĂNG NHẬP TRƯỚC KHI ĐẶT VÉ
    if (!req.session || !req.session.user) {
        return res.status(401).json({ 
            success: false, 
            require_login: true,
            message: 'Vui lòng đăng nhập tài khoản trước khi thực hiện chọn ghế và thanh toán vé.' 
        });
    }

    const { 
        showtime_id, 
        customer_name, 
        customer_phone, 
        customer_email, 
        seat_ids, 
        payment_method 
    } = req.body;

    const cleanName = sanitizeInput(customer_name);
    const cleanPhone = sanitizeInput(customer_phone);
    const cleanEmail = sanitizeInput(customer_email);

    // Validate input
    if (!showtime_id || !cleanName || !cleanPhone || !seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'Thông tin đặt vé không hợp lệ. Vui lòng chọn ít nhất 1 ghế và điền đầy đủ thông tin.' 
        });
    }

    const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Số điện thoại nhận vé không hợp lệ. Vui lòng nhập số điện thoại di động Việt Nam 10 chữ số.' 
        });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Kiểm tra thông tin suất chiếu
        const [showtimeRows] = await connection.execute(`
            SELECT s.*, m.title as movie_title, m.base_price, r.name as room_name
            FROM showtimes s
            JOIN movies m ON s.movie_id = m.id
            JOIN rooms r ON s.room_id = r.id
            WHERE s.id = ?
        `, [showtime_id]);

        if (showtimeRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Suất chiếu không tồn tại.' });
        }
        const showtime = showtimeRows[0];

        // 2. Chống đặt trùng ghế (Race Condition & Concurrency Check)
        const placeholders = seat_ids.map(() => '?').join(',');
        const [conflictRows] = await connection.execute(`
            SELECT bd.seat_id, s.seat_code 
            FROM booking_details bd
            JOIN seats s ON bd.seat_id = s.id
            WHERE bd.showtime_id = ? AND bd.seat_id IN (${placeholders})
            FOR UPDATE
        `, [showtime_id, ...seat_ids]);

        if (conflictRows.length > 0) {
            await connection.rollback();
            const conflictCodes = conflictRows.map(r => r.seat_code).join(', ');
            return res.status(409).json({ 
                success: false, 
                message: `Rất tiếc! Ghế [${conflictCodes}] vừa có khách hàng khác đặt trước. Vui lòng chọn ghế khác.` 
            });
        }

        // 3. Lấy thông tin chi tiết các ghế để tính tiền
        const [selectedSeats] = await connection.execute(`
            SELECT id, seat_code, seat_type, extra_price 
            FROM seats 
            WHERE id IN (${placeholders})
        `, [...seat_ids]);

        let totalAmount = 0;
        const bookingDetailItems = [];

        for (const s of selectedSeats) {
            const seatPrice = Math.round(Number(showtime.base_price) * Number(showtime.price_multiplier) + Number(s.extra_price));
            totalAmount += seatPrice;
            bookingDetailItems.push({
                seat_id: s.id,
                seat_code: s.seat_code,
                price: seatPrice
            });
        }

        // 4. Sinh mã vé độc nhất an toàn (Cryptographically Secure Random - Chống IDOR CWE-330/384)
        const bookingCode = generateTicketCode();
        const allowedPayments = ['MOMO', 'VNPAY', 'BANKING'];
        const selectedPayment = allowedPayments.includes(payment_method) ? payment_method : 'MOMO';
        const transactionId = `${selectedPayment}_TXN_${Date.now()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        // 5. Lưu vào bảng bookings (gắn với tài khoản người dùng nếu đã đăng nhập)
        const loggedUserId = req.session && req.session.user ? req.session.user.id : null;
        const [bookingResult] = await connection.execute(`
            INSERT INTO bookings (
                user_id, booking_code, customer_name, customer_phone, customer_email, 
                showtime_id, total_seats, total_amount, payment_method, 
                payment_status, transaction_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?)
        `, [
            loggedUserId, bookingCode, cleanName, cleanPhone, cleanEmail || '',
            showtime_id, seat_ids.length, totalAmount, selectedPayment, transactionId
        ]);

        const newBookingId = bookingResult.insertId;

        // 6. Lưu vào bảng booking_details
        for (const item of bookingDetailItems) {
            await connection.execute(`
                INSERT INTO booking_details (booking_id, showtime_id, seat_id, seat_code, price)
                VALUES (?, ?, ?, ?, ?)
            `, [newBookingId, showtime_id, item.seat_id, item.seat_code, item.price]);
        }

        // Cam kết Transaction
        await connection.commit();

        // 7. Ghi nhận Metrics cho Prometheus
        ticketBookingsTotal.inc({ status: 'PAID', payment_method: selectedPayment });
        ticketRevenueTotal.inc(totalAmount);

        // 8. Xuất Log có cấu trúc chuẩn cho Loki / Promtail thu thập
        console.log(`[BOOKING_SUCCESS] Mã vé=${bookingCode} | Khách hàng=${cleanName} | ĐT=${cleanPhone} | Phim=${showtime.movie_title} | Ghế=${bookingDetailItems.map(d=>d.seat_code).join(',')} | Tổng tiền=${totalAmount.toLocaleString('vi-VN')} VND | Phương thức=${selectedPayment} | TxID=${transactionId}`);

        return res.json({
            success: true,
            booking_code: bookingCode,
            total_amount: totalAmount,
            redirect_url: `/ticket/${bookingCode}`
        });

    } catch (err) {
        if (connection) {
            await connection.rollback();
        }
        console.error('[BOOKING_ERROR] Lỗi khi xử lý đặt vé:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Đã xảy ra lỗi máy chủ trong quá trình xử lý thanh toán. Vui lòng thử lại sau.' 
        });
    } finally {
        if (connection) connection.release();
    }
}

// Xem vé điện tử (E-Ticket) với mã QR Code
async function getTicketDetails(req, res) {
    const bookingCode = req.params.bookingCode;
    try {
        const bookings = await db.query(`
            SELECT b.*, 
                   m.title as movie_title, m.poster_url, m.duration, m.rating,
                   r.name as room_name, r.room_type,
                   DATE_FORMAT(s.show_date, '%d/%m/%Y') as formatted_date,
                   TIME_FORMAT(s.start_time, '%H:%i') as formatted_start,
                   TIME_FORMAT(s.end_time, '%H:%i') as formatted_end,
                   DATE_FORMAT(b.booking_time, '%d/%m/%Y %H:%i:%s') as formatted_booking_time
            FROM bookings b
            JOIN showtimes s ON b.showtime_id = s.id
            JOIN movies m ON s.movie_id = m.id
            JOIN rooms r ON s.room_id = r.id
            WHERE b.booking_code = ?
        `, [bookingCode]);

        if (bookings.length === 0) {
            return res.status(404).render('error', {
                title: 'Không tìm thấy vé',
                message: `Mã vé [${bookingCode}] không tồn tại trong hệ thống.`
            });
        }

        const ticket = bookings[0];

        // Lấy danh sách ghế
        const seatDetails = await db.query(`
            SELECT bd.*, s.seat_type 
            FROM booking_details bd
            JOIN seats s ON bd.seat_id = s.id
            WHERE bd.booking_id = ?
        `, [ticket.id]);

        // Tạo mã QR Code base64
        const qrData = JSON.stringify({
            code: ticket.booking_code,
            movie: ticket.movie_title,
            seats: seatDetails.map(s => s.seat_code).join(','),
            date: ticket.formatted_date,
            time: ticket.formatted_start,
            phone: ticket.customer_phone
        });
        const qrCodeUrl = await QRCode.toDataURL(qrData, { width: 220, margin: 2 });

        res.render('ticket-result', {
            title: `Vé Điện Tử: ${ticket.booking_code} - ${ticket.movie_title}`,
            ticket,
            seatDetails,
            qrCodeUrl
        });

    } catch (err) {
        console.error('[BOOKING CONTROLLER] Lỗi getTicketDetails:', err);
        res.status(500).render('error', { title: 'Lỗi tải vé', message: 'Không thể tải thông tin vé lúc này. Vui lòng thử lại sau.' });
    }
}

// Tra cứu lịch sử đặt vé qua Số điện thoại hoặc Mã vé
async function getHistoryPage(req, res) {
    const rawSearch = req.query.search || '';
    const searchKey = rawSearch.replace(/<[^>]*>?/gm, '').trim();
    let tickets = [];

    if (searchKey) {
        try {
            tickets = await db.query(`
                SELECT b.*, 
                       m.title as movie_title, m.poster_url,
                       r.name as room_name,
                       DATE_FORMAT(s.show_date, '%d/%m/%Y') as formatted_date,
                       TIME_FORMAT(s.start_time, '%H:%i') as formatted_start,
                       GROUP_CONCAT(bd.seat_code SEPARATOR ', ') as seat_codes
                FROM bookings b
                JOIN showtimes s ON b.showtime_id = s.id
                JOIN movies m ON s.movie_id = m.id
                JOIN rooms r ON s.room_id = r.id
                LEFT JOIN booking_details bd ON b.id = bd.booking_id
                WHERE b.customer_phone LIKE ? OR b.booking_code LIKE ?
                GROUP BY b.id
                ORDER BY b.booking_time DESC
            `, [`%${searchKey}%`, `%${searchKey}%`]);
        } catch (err) {
            console.error('[BOOKING CONTROLLER] Lỗi searchHistory:', err);
        }
    }

    res.render('history', {
        title: 'Tra Cứu Vé Đã Đặt - CINESTAR K23',
        tickets,
        searchKey
    });
}

module.exports = {
    processBooking,
    getTicketDetails,
    getHistoryPage,
    generateTicketCode,
    sanitizeInput
};
