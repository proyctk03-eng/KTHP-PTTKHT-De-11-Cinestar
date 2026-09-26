const client = require('prom-client');

// Khởi tạo Prometheus Register
const register = new client.Registry();

// Bật các metrics mặc định của Node.js (CPU, Memory, Event Loop, GC...)
client.collectDefaultMetrics({
    register,
    prefix: 'nodejs_cinema_'
});

// Custom Metrics: Đếm số lượng request HTTP
const httpRequestsTotal = new client.Counter({
    name: 'cinema_http_requests_total',
    help: 'Tổng số lượt HTTP request đến hệ thống',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
});

// Custom Metrics: Thời gian xử lý request HTTP
const httpRequestDuration = new client.Histogram({
    name: 'cinema_http_request_duration_seconds',
    help: 'Thời gian phản hồi HTTP request tính bằng giây',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [register]
});

// Custom Metrics: Đếm số lượng vé đã đặt
const ticketBookingsTotal = new client.Counter({
    name: 'cinema_ticket_bookings_total',
    help: 'Tổng số đơn vé đã được xử lý qua hệ thống',
    labelNames: ['status', 'payment_method'],
    registers: [register]
});

// Custom Metrics: Tổng doanh thu bán vé
const ticketRevenueTotal = new client.Counter({
    name: 'cinema_ticket_revenue_total_vnd',
    help: 'Tổng doanh thu bán vé tính bằng VNĐ',
    registers: [register]
});

// Middleware ghi nhận request cho Prometheus
function metricsMiddleware(req, res, next) {
    const start = process.hrtime();
    res.on('finish', () => {
        const diff = process.hrtime(start);
        const durationInSeconds = diff[0] + diff[1] / 1e9;
        const route = req.route ? req.route.path : req.path;
        
        httpRequestsTotal.inc({
            method: req.method,
            route: route,
            status_code: res.statusCode
        });

        httpRequestDuration.observe({
            method: req.method,
            route: route,
            status_code: res.statusCode
        }, durationInSeconds);
    });
    next();
}

// Handler trả về metrics cho Prometheus cào dữ liệu
async function getMetrics(req, res) {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).end(err.message);
    }
}

module.exports = {
    metricsMiddleware,
    getMetrics,
    ticketBookingsTotal,
    ticketRevenueTotal
};
