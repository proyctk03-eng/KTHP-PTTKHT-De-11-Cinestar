const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const db = require('../config/db');

// API Đặt vé và thanh toán
router.post('/bookings', bookingController.processBooking);

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
