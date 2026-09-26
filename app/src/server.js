const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Nạp file cấu hình môi trường .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { metricsMiddleware } = require('./controllers/metricsController');
const webRoutes = require('./routes/webRoutes');
const apiRoutes = require('./routes/apiRoutes');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình View Engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Cấu hình Static Files (CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON & URL-encoded Form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware ghi nhận Metrics cho Prometheus
app.use(metricsMiddleware);

// Middleware ghi Log HTTP cho Promtail & Loki thu thập
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = `[HTTP_LOG] ${new Date().toISOString()} | ${req.ip || 'client'} | ${req.method} ${req.originalUrl} | Status=${res.statusCode} | Duration=${duration}ms`;
        if (res.statusCode >= 400) {
            console.warn(logData);
        } else {
            console.log(logData);
        }
    });
    next();
});

// Đăng ký Routes
app.use('/', webRoutes);
app.use('/api', apiRoutes);

// Xử lý 404 Not Found
app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Trang Không Tồn Tại (404)',
        message: `Đường dẫn [${req.originalUrl}] không tồn tại trên hệ thống rạp.`
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[UNCAUGHT ERROR]', err);
    res.status(500).render('error', {
        title: 'Lỗi Máy Chủ (500)',
        message: process.env.NODE_ENV === 'production' 
            ? 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.' 
            : err.message
    });
});

// Khởi chạy máy chủ
app.listen(PORT, '0.0.0.0', () => {
    console.log('================================================================');
    console.log('🎬 HỆ THỐNG ĐẶT VÉ XEM PHIM & SỰ KIỆN TRỰC TUYẾN - K23 ICTU');
    console.log('👤 Sinh viên thực hiện: Nguyễn Tuấn Đạt | MSV: DTC245200452');
    console.log(`🚀 Web Application đang chạy tại: http://localhost:${PORT}`);
    console.log(`📊 Prometheus Metrics endpoint: http://localhost:${PORT}/metrics`);
    console.log(`🩺 Health check endpoint:       http://localhost:${PORT}/health`);
    console.log('================================================================');
});
