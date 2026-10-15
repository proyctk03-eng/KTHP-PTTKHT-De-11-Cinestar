const db = require('../config/db');

// Lấy danh sách phim hiển thị trang chủ
async function getHomePage(req, res) {
    try {
        const movies = await db.query(`
            SELECT m.*, c.name as category_name 
            FROM movies m
            JOIN categories c ON m.category_id = c.id
            ORDER BY m.type ASC, m.release_date DESC
        `);

        const categories = await db.query(`SELECT * FROM categories ORDER BY name ASC`);
        
        res.render('index', {
            title: 'Hệ Thống Đặt Vé Phim & Sự Kiện - CINESTAR K23',
            movies,
            categories,
            activeTab: req.query.type || 'ALL'
        });
    } catch (err) {
        console.error('[MOVIE CONTROLLER] Lỗi getHomePage:', err);
        res.status(500).render('error', { 
            title: 'Lỗi Hệ Thống', 
            message: 'Không thể kết nối cơ sở dữ liệu. Vui lòng kiểm tra dịch vụ MySQL.' 
        });
    }
}

// Xem chi tiết phim & danh sách suất chiếu
async function getMovieDetail(req, res) {
    const movieId = req.params.id;
    try {
        const movies = await db.query(`
            SELECT m.*, c.name as category_name 
            FROM movies m
            JOIN categories c ON m.category_id = c.id
            WHERE m.id = ?
        `, [movieId]);

        if (movies.length === 0) {
            return res.status(404).render('error', { 
                title: 'Không tìm thấy phim', 
                message: 'Phim hoặc sự kiện bạn tìm kiếm không tồn tại.' 
            });
        }

        const movie = movies[0];

        // Lấy danh sách suất chiếu
        const showtimes = await db.query(`
            SELECT s.*, r.name as room_name, r.room_type,
                   DATE_FORMAT(s.show_date, '%d/%m/%Y') as formatted_date,
                   TIME_FORMAT(s.start_time, '%H:%i') as formatted_start,
                   TIME_FORMAT(s.end_time, '%H:%i') as formatted_end
            FROM showtimes s
            JOIN rooms r ON s.room_id = r.id
            WHERE s.movie_id = ?
            ORDER BY s.show_date ASC, s.start_time ASC
        `, [movieId]);

        res.render('movie-detail', {
            title: `${movie.title} - Lịch Chiếu & Đặt Vé`,
            movie,
            showtimes
        });
    } catch (err) {
        console.error('[MOVIE CONTROLLER] Lỗi getMovieDetail:', err);
        res.status(500).render('error', { 
            title: 'Lỗi Truy Vấn', 
            message: 'Đã xảy ra lỗi khi tải thông tin chi tiết phim. Vui lòng thử lại sau.' 
        });
    }
}

// Lấy sơ đồ ghế của một suất chiếu cụ thể
async function getShowtimeSeatMap(req, res) {
    const showtimeId = req.params.showtimeId;
    try {
        // Thông tin suất chiếu + phim + phòng
        const showtimeInfo = await db.query(`
            SELECT s.*, 
                   m.id as movie_id, m.title as movie_title, m.poster_url, m.base_price, m.rating,
                   r.name as room_name, r.room_type,
                   DATE_FORMAT(s.show_date, '%d/%m/%Y') as formatted_date,
                   TIME_FORMAT(s.start_time, '%H:%i') as formatted_start
            FROM showtimes s
            JOIN movies m ON s.movie_id = m.id
            JOIN rooms r ON s.room_id = r.id
            WHERE s.id = ?
        `, [showtimeId]);

        if (showtimeInfo.length === 0) {
            return res.status(404).render('error', { 
                title: 'Suất chiếu không tồn tại', 
                message: 'Vui lòng chọn suất chiếu hợp lệ từ lịch chiếu.' 
            });
        }

        const showtime = showtimeInfo[0];

        // Lấy tất cả ghế trong phòng chiếu đó
        const seats = await db.query(`
            SELECT * FROM seats 
            WHERE room_id = ? 
            ORDER BY seat_row ASC, seat_number ASC
        `, [showtime.room_id]);

        // Lấy danh sách các ghế ĐÃ BÁN của suất chiếu này
        const bookedDetails = await db.query(`
            SELECT seat_id, seat_code FROM booking_details 
            WHERE showtime_id = ?
        `, [showtimeId]);

        const bookedSeatIds = new Set(bookedDetails.map(b => b.seat_id));

        // Nhóm ghế theo từng hàng (A, B, C, D, E, F)
        const seatRows = {};
        for (const s of seats) {
            if (!seatRows[s.seat_row]) {
                seatRows[s.seat_row] = [];
            }
            // Tính giá ghế thực tế: (Giá gốc * Hệ số giờ) + Phụ thu loại ghế
            const finalPrice = Math.round(Number(showtime.base_price) * Number(showtime.price_multiplier) + Number(s.extra_price));
            seatRows[s.seat_row].push({
                ...s,
                is_booked: bookedSeatIds.has(s.id),
                final_price: finalPrice
            });
        }

        res.render('seat-booking', {
            title: `Chọn Ghế: ${showtime.movie_title} - Suất ${showtime.formatted_start}`,
            showtime,
            seatRows
        });
    } catch (err) {
        console.error('[MOVIE CONTROLLER] Lỗi getShowtimeSeatMap:', err);
        res.status(500).render('error', { 
            title: 'Lỗi Tải Sơ Đồ Ghế', 
            message: 'Đã xảy ra lỗi khi tải sơ đồ ghế của suất chiếu. Vui lòng thử lại sau.' 
        });
    }
}

module.exports = {
    getHomePage,
    getMovieDetail,
    getShowtimeSeatMap
};
