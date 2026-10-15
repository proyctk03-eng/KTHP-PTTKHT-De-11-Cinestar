const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const db = require('../config/db');

// API Đặt vé và thanh toán
router.post('/bookings', bookingController.processBooking);

// API Kiểm tra kết nối trực tiếp giữa Web App và Database (Bước 1 & 2)
router.get('/db-test', async (req, res) => {
    try {
        const rows = await db.query('SELECT 1 AS connection_status, VERSION() AS mysql_version, DATABASE() AS database_name, NOW() AS server_time');
        console.log(`[DATABASE] ✅ [SUCCESS] Kiểm tra kết nối DB thành công từ Web App [Host: ${process.env.DB_HOST || 'db'}]`);
        res.json({
            success: true,
            message: 'Kết nối giữa Web App và Database MySQL thành công 100%!',
            database_info: {
                host: process.env.DB_HOST || 'db',
                port: parseInt(process.env.DB_PORT || '3306', 10),
                database: process.env.DB_NAME || 'ticket_db',
                user: process.env.DB_USER || 'ticket_user',
                is_connected_real_db: db.isDbConnected(),
                is_fallback_mode: db.isFallback()
            },
            test_query_result: rows[0] || rows
        });
    } catch (err) {
        console.error(`[DATABASE] ❌ [ERROR] Lỗi kiểm tra kết nối DB: ${err.message}`);
        res.status(500).json({
            success: false,
            message: 'Không thể kết nối đến cơ sở dữ liệu!',
            error: err.message,
            database_info: {
                host: process.env.DB_HOST || 'db',
                port: process.env.DB_PORT || '3306',
                database: process.env.DB_NAME || 'ticket_db'
            }
        });
    }
});

// API Lấy danh sách phim JSON
router.get('/movies', async (req, res) => {
    try {
        const movies = await db.query('SELECT * FROM movies ORDER BY release_date DESC');
        res.json({ success: true, data: movies });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// API Lấy sơ đồ ghế theo suất chiếu thời gian thực (JSON)
router.get('/seats/:showtimeId', async (req, res) => {
    try {
        const showtimeId = req.params.showtimeId;
        const [showtime] = await db.query('SELECT * FROM showtimes WHERE id = ?', [showtimeId]);
        if (!showtime) {
            return res.status(404).json({ success: false, message: 'Suất chiếu không tồn tại' });
        }
        
        const seats = await db.query('SELECT * FROM seats WHERE room_id = ? ORDER BY seat_row, seat_number', [showtime.room_id]);
        const booked = await db.query('SELECT seat_id FROM booking_details WHERE showtime_id = ?', [showtimeId]);
        const bookedSet = new Set(booked.map(b => b.seat_id));

        const result = seats.map(s => ({
            ...s,
            is_booked: bookedSet.has(s.id),
            final_price: Math.round(Number(showtime.base_price) * Number(showtime.price_multiplier) + Number(s.extra_price))
        }));

        res.json({ success: true, showtime, seats: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
