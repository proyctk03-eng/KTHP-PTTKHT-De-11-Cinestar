const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const { getMetrics } = require('../controllers/metricsController');
const db = require('../config/db');

// Trang chủ danh sách phim & sự kiện
router.get('/', movieController.getHomePage);

// Chi tiết phim & suất chiếu
router.get('/movie/:id', movieController.getMovieDetail);

// Sơ đồ chọn ghế cho suất chiếu (Bắt buộc đăng nhập tài khoản trước khi chọn ghế)
router.get('/booking/:showtimeId', authController.requireAuth, movieController.getShowtimeSeatMap);

// Trang xem vé điện tử sau khi thanh toán
router.get('/ticket/:bookingCode', bookingController.getTicketDetails);

// Trang tra cứu lịch sử vé
router.get('/history', bookingController.getHistoryPage);

// ==========================================
// AUTHENTICATION ROUTES (ĐĂNG NHẬP / ĐĂNG KÝ)
// ==========================================
router.get('/login', authController.getLoginPage);
router.post('/login', authController.postLogin);
router.get('/register', authController.getRegisterPage);
router.post('/register', authController.postRegister);
router.get('/logout', authController.logout);
router.get('/profile', authController.getProfilePage);

// ==========================================
// ADMIN PORTAL & QUẢN LÝ ĐĂNG NHẬP (RBAC)
// ==========================================
router.get('/admin', adminController.requireAdmin, adminController.getAdminDashboard);
router.post('/admin/users/:id/toggle-status', adminController.requireAdmin, adminController.toggleUserStatus);
router.post('/admin/users/:id/toggle-role', adminController.requireAdmin, adminController.toggleUserRole);

// Endpoint xuất Metrics cho Prometheus
router.get('/metrics', getMetrics);

// Healthcheck endpoint cho Docker & Nginx (Bước 1 & 2)
router.get('/health', async (req, res) => {
    let dbStatus = 'DISCONNECTED';
    const isRealDb = db.isDbConnected();
    try {
        await db.query('SELECT 1');
        dbStatus = isRealDb ? 'CONNECTED (MySQL 8.0)' : 'FALLBACK_MODE (In-Memory)';
    } catch (e) {
        dbStatus = 'ERROR: ' + e.message;
    }
    res.json({
        status: 'UP',
        service: 'webapp',
        student: 'Nguyen Tuan Dat - DTC245200452',
        database: dbStatus,
        is_connected_real_mysql: isRealDb,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

// Endpoint giả lập lỗi Exception / HTTP 500 để kiểm thử câu truy vấn LogQL (Bảo vệ: Chỉ Admin mới được kích hoạt)
router.get('/trigger-error', adminController.requireAdmin, (req, res) => {
    console.error('[ERROR] Simulated Exception: Database transaction Failed during seat reservation!');
    throw new Error('Simulated Uncaught Exception for testing Loki LogQL');
});

module.exports = router;
