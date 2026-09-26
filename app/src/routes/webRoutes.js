const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const bookingController = require('../controllers/bookingController');
const { getMetrics } = require('../controllers/metricsController');
const db = require('../config/db');

// Trang chủ danh sách phim & sự kiện
router.get('/', movieController.getHomePage);

// Chi tiết phim & suất chiếu
router.get('/movie/:id', movieController.getMovieDetail);

// Sơ đồ chọn ghế cho suất chiếu
router.get('/booking/:showtimeId', movieController.getShowtimeSeatMap);

// Trang xem vé điện tử sau khi thanh toán
router.get('/ticket/:bookingCode', bookingController.getTicketDetails);

// Trang tra cứu lịch sử vé
router.get('/history', bookingController.getHistoryPage);

// Endpoint xuất Metrics cho Prometheus
router.get('/metrics', getMetrics);

// Healthcheck endpoint cho Docker & Nginx
router.get('/health', async (req, res) => {
    let dbStatus = 'DISCONNECTED';
    try {
        await db.query('SELECT 1');
        dbStatus = 'CONNECTED';
    } catch (e) {
        dbStatus = 'ERROR: ' + e.message;
    }
    res.json({
        status: 'UP',
        service: 'ticket-booking-app',
        student: 'Nguyen Tuan Dat - DTC245200452',
        database: dbStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
