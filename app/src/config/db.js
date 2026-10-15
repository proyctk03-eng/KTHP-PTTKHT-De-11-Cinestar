const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'ticket_user',
    password: process.env.DB_PASSWORD || 'TicketSecurePass2024!',
    database: process.env.DB_NAME || 'ticket_db',
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
};

let pool = null;
let isConnected = false;
let fallbackMode = false;

// ========================================================
// DỮ LIỆU DỰ PHÒNG IN-MEMORY (KHI CHẠY MÁY KHÁC KHÔNG CÓ MYSQL)
// ========================================================
const mockData = {
    users: [
        {
            id: 1,
            fullname: 'Ban Quản Trị Hệ Thống (Admin)',
            phone: '0999999999',
            email: 'admin@cinestar.vn',
            password_hash: '$2b$10$Q52BQelAwYnQ2KoFdDzZfOFVu2zI4Ju1eGNvcQNQkjWOtVOhqiAQO', // Admin@123456
            role: 'ADMIN',
            status: 'ACTIVE',
            created_at: '2026-09-26 08:00:00',
            last_login: new Date().toISOString().replace('T', ' ').substring(0, 19)
        },
        {
            id: 2,
            fullname: 'Nguyễn Tuấn Đạt',
            phone: '0987654321',
            email: 'tuandat@ictu.edu.vn',
            password_hash: '$2b$10$p47XhL33Cq6ZavdW0/tvY.5KBb/r18XBt/cCfARDDX9x8DqqhGGsC', // Dat@123456
            role: 'USER',
            status: 'ACTIVE',
            created_at: '2026-09-26 08:30:00',
            last_login: new Date().toISOString().replace('T', ' ').substring(0, 19)
        }
    ],
    login_logs: [
        {
            id: 1,
            user_id: 1,
            email: 'admin@cinestar.vn',
            ip_address: '127.0.0.1',
            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
            status: 'SUCCESS',
            failure_reason: null,
            created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
        },
        {
            id: 2,
            user_id: 2,
            email: 'tuandat@ictu.edu.vn',
            ip_address: '127.0.0.1',
            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
            status: 'SUCCESS',
            failure_reason: null,
            created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
        }
    ],
    categories: [
        { id: 1, name: 'Khoa học viễn tưởng', description: 'Hành tinh vũ trụ, tương lai, kỹ xảo điện ảnh đỉnh cao' },
        { id: 2, name: 'Hành động - Bom tấn', description: 'Chiến đấu mãn nhãn, âm thanh sống động Dolby Atmos' },
        { id: 3, name: 'Tâm lý - Tình cảm', description: 'Câu chuyện cảm động, gia đình và cuộc sống' },
        { id: 4, name: 'Hoạt hình - Gia đình', description: 'Hoạt hình trinh thám, thiếu nhi và mọi lứa tuổi' },
        { id: 5, name: 'Sự kiện âm nhạc Live', description: 'Concert quy mô lớn, đêm nhạc idol sống động' }
    ],
    movies: [
        {
            id: 1, title: 'Dune: Hành Tinh Cát - Phần 2', category_id: 1, type: 'MOVIE', duration: 166,
            release_date: '2024-03-01', director: 'Denis Villeneuve', cast: 'Timothée Chalamet, Zendaya, Rebecca Ferguson',
            description: 'Paul Atreides hợp lực cùng Chani và người Fremen trên sa mạc Arrakis để báo thù những kẻ đã hủy hoại gia đình mình.',
            poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
            base_price: 95000.00, rating: 'T16', status: 'NOW_SHOWING'
        },
        {
            id: 2, title: 'Godzilla x Kong: Đế Chế Mới', category_id: 2, type: 'MOVIE', duration: 115,
            release_date: '2024-03-29', director: 'Adam Wingard', cast: 'Rebecca Hall, Brian Tyree Henry, Dan Stevens',
            description: 'Hai gã khổng lồ cổ đại Godzilla và Kong tái xuất đối đầu trước một mối đe dọa sinh tử tiềm ẩn sâu bên trong Trái Đất Rỗng.',
            poster_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
            base_price: 90000.00, rating: 'T13', status: 'NOW_SHOWING'
        },
        {
            id: 3, title: 'Mai - Tình Yêu & Định Kiến', category_id: 3, type: 'MOVIE', duration: 131,
            release_date: '2024-02-10', director: 'Trấn Thành', cast: 'Phương Anh Đào, Tuấn Trần, Trấn Thành, Hồng Đào',
            description: 'Mai - người phụ nữ trải qua nhiều tổn thương tìm thấy ánh sáng hy vọng khi gặp Dương, chàng trai trẻ đầy nhiệt huyết.',
            poster_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&auto=format&fit=crop&q=80',
            base_price: 85000.00, rating: 'T18', status: 'NOW_SHOWING'
        },
        {
            id: 4, title: 'Conan: Ngôi Sao 5 Cánh 1 Triệu Đô', category_id: 4, type: 'MOVIE', duration: 110,
            release_date: '2024-08-02', director: 'Chika Nagaoka', cast: 'Takayama Minami, Yamaguchi Kappei, Horikawa Ryo',
            description: 'Vụ án bí ẩn xoay quanh thanh kiếm báu thời Mạc phủ và cuộc đấu trí giữa Conan, Siêu đạo chích Kid và Hattori Heiji.',
            poster_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
            base_price: 80000.00, rating: 'P', status: 'NOW_SHOWING'
        },
        {
            id: 5, title: 'Live Concert: Anh Trai Vượt Ngàn Chông Gai', category_id: 5, type: 'EVENT', duration: 210,
            release_date: '2024-10-19', director: 'Đinh Hà Uyên Thư', cast: '33 Anh Tài, Soobin, Bằng Kiều, Jun Phạm, Kay Trần',
            description: 'Đại nhạc hội bùng nổ cảm xúc với sân khấu ánh sáng đẳng cấp quốc tế, âm thanh vòm đỉnh cao và hơn 30 tiết mục xuất sắc.',
            poster_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
            base_price: 250000.00, rating: 'P', status: 'SPECIAL_EVENT'
        }
    ],
    rooms: [
        { id: 1, name: 'Phòng 01 - IMAX Laser 3D', room_type: 'IMAX Laser' },
        { id: 2, name: 'Phòng 02 - Dolby Atmos Gold', room_type: 'Dolby Atmos' },
        { id: 3, name: 'Phòng 03 - Grand Theater Hall', room_type: 'Hội trường biểu diễn' }
    ],
    showtimes: [
        { id: 1, movie_id: 1, room_id: 1, show_date: '2026-09-26', start_time: '09:30:00', end_time: '12:15:00', price_multiplier: 1.00 },
        { id: 2, movie_id: 1, room_id: 1, show_date: '2026-09-26', start_time: '14:00:00', end_time: '16:45:00', price_multiplier: 1.10 },
        { id: 3, movie_id: 1, room_id: 1, show_date: '2026-09-26', start_time: '19:30:00', end_time: '22:15:00', price_multiplier: 1.25 },
        { id: 4, movie_id: 2, room_id: 2, show_date: '2026-09-26', start_time: '10:00:00', end_time: '11:55:00', price_multiplier: 1.00 },
        { id: 5, movie_id: 2, room_id: 2, show_date: '2026-09-26', start_time: '15:15:00', end_time: '17:10:00', price_multiplier: 1.10 },
        { id: 6, movie_id: 2, room_id: 2, show_date: '2026-09-26', start_time: '20:15:00', end_time: '22:10:00', price_multiplier: 1.25 },
        { id: 7, movie_id: 3, room_id: 2, show_date: '2026-09-26', start_time: '17:45:00', end_time: '19:55:00', price_multiplier: 1.20 },
        { id: 8, movie_id: 4, room_id: 1, show_date: '2026-09-26', start_time: '17:00:00', end_time: '18:50:00', price_multiplier: 1.00 },
        { id: 9, movie_id: 5, room_id: 3, show_date: '2026-09-28', start_time: '18:30:00', end_time: '22:00:00', price_multiplier: 1.50 }
    ],
    seats: [],
    bookings: [
        {
            id: 1, booking_code: 'TKT-DTC24520-8891', customer_name: 'Trần Văn Nam', customer_phone: '0987654321', customer_email: 'nam.tv@gmail.com',
            showtime_id: 3, total_seats: 2, total_amount: 275000.00, payment_method: 'MOMO', payment_status: 'PAID',
            transaction_id: 'MOMO_TXN_9918237', booking_time: '2026-09-26 14:20:00'
        },
        {
            id: 2, booking_code: 'TKT-DTC24520-4420', customer_name: 'Lê Thu Trang', customer_phone: '0912345678', customer_email: 'trang.lt@gmail.com',
            showtime_id: 3, total_seats: 1, total_amount: 143750.00, payment_method: 'VNPAY', payment_status: 'PAID',
            transaction_id: 'VNPAY_TXN_7721834', booking_time: '2026-09-26 14:35:00'
        }
    ],
    booking_details: [
        { id: 1, booking_id: 1, showtime_id: 3, seat_id: 25, seat_code: 'C05', price: 137500.00 },
        { id: 2, booking_id: 1, showtime_id: 3, seat_id: 26, seat_code: 'C06', price: 137500.00 },
        { id: 3, booking_id: 2, showtime_id: 3, seat_id: 37, seat_code: 'D07', price: 143750.00 }
    ]
};

// Khởi tạo 60 ghế cho mỗi phòng trong mockData
let seatIdCounter = 1;
[1, 2, 3].forEach(roomId => {
    ['A', 'B', 'C', 'D', 'E', 'F'].forEach(r => {
        let type = 'STANDARD';
        let extra = 0;
        if (['C', 'D', 'E'].includes(r)) {
            type = 'VIP';
            extra = 20000;
        } else if (r === 'F') {
            type = 'COUPLE';
            extra = 45000;
        }
        for (let n = 1; n <= 10; n++) {
            const code = `${r}${n < 10 ? '0' + n : n}`;
            mockData.seats.push({
                id: seatIdCounter++,
                room_id: roomId,
                seat_code: code,
                seat_row: r,
                seat_number: n,
                seat_type: type,
                extra_price: extra
            });
        }
    });
});

// Khởi tạo kết nối Pool
async function initDatabase() {
    try {
        pool = mysql.createPool(dbConfig);
        const connection = await pool.getConnection();
        console.log(`[DATABASE] ✅ Đã kết nối MySQL [${dbConfig.host}:${dbConfig.port}/${dbConfig.database}]`);
        connection.release();
        isConnected = true;
        fallbackMode = false;
        return true;
    } catch (err) {
        console.warn(`[DATABASE] ⚠️ Chưa thể kết nối MySQL (${err.code || err.message}).`);
        console.log(`[DATABASE] 🔄 Tự động kích hoạt DUAL-ENGINE: Sử dụng In-Memory Dataset để ứng dụng luôn chạy 100% trên máy khác!`);
        isConnected = false;
        fallbackMode = true;
        return false;
    }
}

// Xử lý truy vấn mô phỏng khi không có MySQL
function handleFallbackQuery(sql, params = []) {
    const s = sql.trim().toUpperCase();

    // 1. SELECT 1 (Healthcheck)
    if (s.startsWith('SELECT 1')) {
        return [{ 1: 1 }];
    }

    // 2. Danh sách categories
    if (s.includes('FROM CATEGORIES')) {
        return mockData.categories;
    }

    // 3. Danh sách movies kèm category
    if (s.includes('FROM MOVIES M') && s.includes('JOIN CATEGORIES')) {
        if (s.includes('WHERE M.ID = ?')) {
            const mId = parseInt(params[0], 10);
            const m = mockData.movies.find(x => x.id === mId);
            if (!m) return [];
            const cat = mockData.categories.find(c => c.id === m.category_id);
            return [{ ...m, category_name: cat ? cat.name : '' }];
        }
        return mockData.movies.map(m => {
            const cat = mockData.categories.find(c => c.id === m.category_id);
            return { ...m, category_name: cat ? cat.name : '' };
        });
    }

    // 4. Danh sách phim đơn thuần
    if (s.startsWith('SELECT * FROM MOVIES')) {
        return mockData.movies;
    }

    // 5. Suất chiếu
    if (s.includes('FROM SHOWTIMES S')) {
        if (s.includes('WHERE S.MOVIE_ID = ?')) {
            const mId = parseInt(params[0], 10);
            const filtered = mockData.showtimes.filter(x => x.movie_id === mId);
            return filtered.map(st => {
                const room = mockData.rooms.find(r => r.id === st.room_id) || {};
                return {
                    ...st,
                    room_name: room.name,
                    room_type: room.room_type,
                    formatted_date: st.show_date,
                    formatted_start: st.start_time.substring(0, 5),
                    formatted_end: st.end_time.substring(0, 5)
                };
            });
        }
        if (s.includes('WHERE S.ID = ?')) {
            const stId = parseInt(params[0], 10);
            const st = mockData.showtimes.find(x => x.id === stId);
            if (!st) return [];
            const movie = mockData.movies.find(m => m.id === st.movie_id) || {};
            const room = mockData.rooms.find(r => r.id === st.room_id) || {};
            return [{
                ...st,
                movie_id: movie.id,
                movie_title: movie.title,
                poster_url: movie.poster_url,
                base_price: movie.base_price,
                rating: movie.rating,
                room_name: room.name,
                room_type: room.room_type,
                formatted_date: st.show_date,
                formatted_start: st.start_time.substring(0, 5)
            }];
        }
    }

    // 6. Ghế trong phòng
    if (s.includes('FROM SEATS') && s.includes('WHERE ROOM_ID = ?')) {
        const rId = parseInt(params[0], 10);
        return mockData.seats.filter(x => x.room_id === rId);
    }

    // 7. Chi tiết ghế đã bán
    if (s.includes('FROM BOOKING_DETAILS') && s.includes('WHERE SHOWTIME_ID = ?')) {
        const stId = parseInt(params[0], 10);
        return mockData.booking_details.filter(x => x.showtime_id === stId);
    }

    // 8. Đặt vé: Tra cứu vé theo mã vé
    if (s.includes('FROM BOOKINGS B') && s.includes('WHERE B.BOOKING_CODE = ?')) {
        const code = params[0];
        const b = mockData.bookings.find(x => x.booking_code === code);
        if (!b) return [];
        const st = mockData.showtimes.find(x => x.id === b.showtime_id) || {};
        const m = mockData.movies.find(x => x.id === st.movie_id) || {};
        const r = mockData.rooms.find(x => x.id === st.room_id) || {};
        return [{
            ...b,
            movie_title: m.title,
            poster_url: m.poster_url,
            duration: m.duration,
            rating: m.rating,
            room_name: r.name,
            room_type: r.room_type,
            formatted_date: st.show_date,
            formatted_start: st.start_time ? st.start_time.substring(0, 5) : '19:30',
            formatted_end: st.end_time ? st.end_time.substring(0, 5) : '22:15',
            formatted_booking_time: b.booking_time
        }];
    }

    // 9. Lịch sử vé theo SĐT hoặc mã
    if (s.includes('FROM BOOKINGS B') && s.includes('CUSTOMER_PHONE LIKE ?')) {
        const key = params[0].replace(/%/g, '');
        const filtered = mockData.bookings.filter(b => b.customer_phone.includes(key) || b.booking_code.includes(key));
        return filtered.map(b => {
            const st = mockData.showtimes.find(x => x.id === b.showtime_id) || {};
            const m = mockData.movies.find(x => x.id === st.movie_id) || {};
            const r = mockData.rooms.find(x => x.id === st.room_id) || {};
            const seats = mockData.booking_details.filter(d => d.booking_id === b.id).map(d => d.seat_code).join(', ');
            return {
                ...b,
                movie_title: m.title,
                poster_url: m.poster_url,
                room_name: r.name,
                formatted_date: st.show_date,
                formatted_start: st.start_time ? st.start_time.substring(0, 5) : '19:30',
                seat_codes: seats
            };
        });
    }

    // 10. Ghế của 1 booking
    if (s.includes('FROM BOOKING_DETAILS BD') && s.includes('WHERE BD.BOOKING_ID = ?')) {
        const bId = parseInt(params[0], 10);
        return mockData.booking_details.filter(d => d.booking_id === bId).map(d => {
            const sObj = mockData.seats.find(x => x.id === d.seat_id) || {};
            return { ...d, seat_type: sObj.seat_type || 'STANDARD' };
        });
    }

    // 11. Đăng nhập & Xác thực: Tìm user theo email hoặc phone
    if (s.includes('FROM USERS') && (s.includes('EMAIL = ?') || s.includes('PHONE = ?'))) {
        const identifier = params[0];
        const second = params[1] || identifier;
        return mockData.users.filter(u => u.email === identifier || u.phone === second);
    }

    // 12. Tìm user theo id
    if (s.includes('FROM USERS') && s.includes('WHERE ID = ?')) {
        const uId = parseInt(params[0], 10);
        return mockData.users.filter(u => u.id === uId);
    }

    // 13. Danh sách toàn bộ user (Admin)
    if (s.includes('FROM USERS') && !s.includes('WHERE')) {
        return mockData.users;
    }

    // 14. Thêm user mới (Đăng ký)
    if (s.startsWith('INSERT INTO USERS')) {
        const newId = mockData.users.length + 1;
        const newUser = {
            id: newId,
            fullname: params[0],
            phone: params[1],
            email: params[2],
            password_hash: params[3],
            role: params[4] || 'USER',
            status: 'ACTIVE',
            created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
            last_login: null
        };
        mockData.users.push(newUser);
        return { insertId: newId };
    }

    // 15. Cập nhật user (last_login, status)
    if (s.startsWith('UPDATE USERS')) {
        if (s.includes('LAST_LOGIN = NOW()')) {
            const uId = parseInt(params[0], 10);
            const user = mockData.users.find(u => u.id === uId);
            if (user) user.last_login = new Date().toISOString().replace('T', ' ').substring(0, 19);
            return { affectedRows: 1 };
        }
        if (s.includes('STATUS = ?')) {
            const newStatus = params[0];
            const uId = parseInt(params[1], 10);
            const user = mockData.users.find(u => u.id === uId);
            if (user) user.status = newStatus;
            return { affectedRows: 1 };
        }
        if (s.includes('ROLE = ?')) {
            const newRole = params[0];
            const uId = parseInt(params[1], 10);
            const user = mockData.users.find(u => u.id === uId);
            if (user) user.role = newRole;
            return { affectedRows: 1 };
        }
    }

    // 16. Ghi nhật ký đăng nhập (Login Logs)
    if (s.startsWith('INSERT INTO LOGIN_LOGS')) {
        const logId = mockData.login_logs.length + 1;
        const newLog = {
            id: logId,
            user_id: params[0] || null,
            email: params[1],
            ip_address: params[2] || '127.0.0.1',
            user_agent: params[3] || 'Browser',
            status: params[4] || 'SUCCESS',
            failure_reason: params[5] || null,
            created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };
        mockData.login_logs.unshift(newLog);
        return { insertId: logId };
    }

    // 17. Quản lý lịch sử đăng nhập (Admin xem Login Logs)
    if (s.includes('FROM LOGIN_LOGS')) {
        return mockData.login_logs.slice(0, 50).map(l => {
            const user = mockData.users.find(u => u.id === l.user_id);
            return {
                ...l,
                fullname: user ? user.fullname : 'Khách vãng lai',
                role: user ? user.role : 'GUEST',
                formatted_created_at: l.created_at
            };
        });
    }

    // 18. Lịch sử vé theo user_id
    if (s.includes('FROM BOOKINGS B') && s.includes('WHERE B.USER_ID = ?')) {
        const uId = parseInt(params[0], 10);
        return mockData.bookings.filter(b => b.user_id === uId).map(b => {
            const st = mockData.showtimes.find(x => x.id === b.showtime_id) || {};
            const m = mockData.movies.find(x => x.id === st.movie_id) || {};
            const r = mockData.rooms.find(x => x.id === st.room_id) || {};
            const seats = mockData.booking_details.filter(d => d.booking_id === b.id).map(d => d.seat_code).join(', ');
            return {
                ...b,
                movie_title: m.title,
                poster_url: m.poster_url,
                room_name: r.name,
                formatted_date: st.show_date,
                formatted_start: st.start_time ? st.start_time.substring(0, 5) : '19:30',
                seat_codes: seats
            };
        });
    }

    // 19. Thống kê Admin (COUNT, SUM)
    if (s.includes('COUNT(*) AS USER_COUNT FROM USERS')) {
        return [{
            user_count: mockData.users.length,
            booking_count: mockData.bookings.length,
            log_count: mockData.login_logs.length,
            total_revenue: mockData.bookings.reduce((sum, b) => sum + Number(b.total_amount), 0)
        }];
    }

    return [];
}

// Wrapper query hỗ trợ tái kết nối tự động hoặc fallback
async function query(sql, params = []) {
    if (fallbackMode) {
        return handleFallbackQuery(sql, params);
    }
    if (!pool) {
        pool = mysql.createPool(dbConfig);
    }
    try {
        const [rows] = await pool.execute(sql, params);
        isConnected = true;
        fallbackMode = false;
        return rows;
    } catch (err) {
        console.warn(`[DATABASE] Lỗi kết nối MySQL (${err.code}). Chuyển sang In-Memory Fallback.`);
        fallbackMode = true;
        return handleFallbackQuery(sql, params);
    }
}

// Lấy connection riêng phục vụ Transaction ACID
async function getConnection() {
    if (fallbackMode) {
        return createMockConnection();
    }
    if (!pool) {
        pool = mysql.createPool(dbConfig);
    }
    try {
        return await pool.getConnection();
    } catch (err) {
        fallbackMode = true;
        return createMockConnection();
    }
}

// Mock Connection cho In-Memory Transaction
function createMockConnection() {
    let mockTxBookingId = null;
    return {
        beginTransaction: async () => {},
        execute: async (sql, params = []) => {
            const s = sql.trim().toUpperCase();
            if (s.includes('FROM BOOKING_DETAILS BD') && s.includes('FOR UPDATE')) {
                // Kiểm tra trùng ghế
                const stId = parseInt(params[0], 10);
                const seatIds = params.slice(1).map(Number);
                const conflicts = mockData.booking_details.filter(d => d.showtime_id === stId && seatIds.includes(d.seat_id));
                return [conflicts];
            }
            if (s.includes('FROM SEATS') && s.includes('WHERE ID IN')) {
                const ids = params.map(Number);
                const found = mockData.seats.filter(x => ids.includes(x.id));
                return [found];
            }
            if (s.startsWith('INSERT INTO BOOKINGS')) {
                const newId = mockData.bookings.length + 1;
                mockTxBookingId = newId;
                const newB = {
                    id: newId,
                    booking_code: params[0],
                    customer_name: params[1],
                    customer_phone: params[2],
                    customer_email: params[3],
                    showtime_id: params[4],
                    total_seats: params[5],
                    total_amount: params[6],
                    payment_method: params[7],
                    payment_status: 'PAID',
                    transaction_id: params[8],
                    booking_time: new Date().toISOString().replace('T', ' ').substring(0, 19)
                };
                mockData.bookings.push(newB);
                return [{ insertId: newId }];
            }
            if (s.startsWith('INSERT INTO BOOKING_DETAILS')) {
                const dId = mockData.booking_details.length + 1;
                mockData.booking_details.push({
                    id: dId,
                    booking_id: params[0],
                    showtime_id: params[1],
                    seat_id: params[2],
                    seat_code: params[3],
                    price: params[4]
                });
                return [{ insertId: dId }];
            }
            return [handleFallbackQuery(sql, params)];
        },
        commit: async () => {},
        rollback: async () => {},
        release: () => {}
    };
}

// Thử kết nối ban đầu
initDatabase();

module.exports = {
    query,
    getConnection,
    initDatabase,
    isDbConnected: () => isConnected,
    isFallback: () => fallbackMode,
    dbConfig
};
