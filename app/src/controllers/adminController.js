const db = require('../config/db');

// Middleware xác thực quyền Quản trị viên (Admin RBAC)
function requireAdmin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect('/login?returnUrl=/admin&error=' + encodeURIComponent('Vui lòng đăng nhập với tài khoản Admin để truy cập trang quản lý.'));
    }
    if (req.session.user.role !== 'ADMIN') {
        return res.status(403).render('error', {
            title: '403 - Quyền Truy Cập Bị Từ Chối',
            message: 'Tài khoản của bạn không có quyền Quản trị viên (Admin). Vui lòng đăng nhập bằng tài khoản Admin.'
        });
    }
    next();
}

// Bảng điều khiển Quản trị & Quản lý đăng nhập
async function getAdminDashboard(req, res) {
    const activeTab = req.query.tab || 'login_logs';

    try {
        // 1. Thống kê tổng quan
        const usersCountRes = await db.query('SELECT COUNT(*) as count FROM users');
        const loginLogsCountRes = await db.query('SELECT COUNT(*) as count FROM login_logs');
        const bookingsCountRes = await db.query('SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue FROM bookings');
        const moviesCountRes = await db.query('SELECT COUNT(*) as count FROM movies');

        const stats = {
            totalUsers: usersCountRes[0] ? usersCountRes[0].count : 0,
            totalLogins: loginLogsCountRes[0] ? loginLogsCountRes[0].count : 0,
            totalBookings: bookingsCountRes[0] ? bookingsCountRes[0].count : 0,
            totalRevenue: bookingsCountRes[0] ? bookingsCountRes[0].revenue : 0,
            totalMovies: moviesCountRes[0] ? moviesCountRes[0].count : 0
        };

        // 2. Danh sách Nhật ký Đăng nhập (Login Audit Logs)
        const loginLogs = await db.query(`
            SELECT l.*, 
                   COALESCE(u.fullname, 'Khách vãng lai') as fullname,
                   COALESCE(u.role, 'GUEST') as role,
                   DATE_FORMAT(l.created_at, '%d/%m/%Y %H:%i:%s') as formatted_time
            FROM login_logs l
            LEFT JOIN users u ON l.user_id = u.id
            ORDER BY l.created_at DESC
            LIMIT 50
        `);

        // 3. Danh sách Tài khoản người dùng
        const users = await db.query(`
            SELECT u.*, 
                   DATE_FORMAT(u.created_at, '%d/%m/%Y %H:%i') as formatted_created,
                   DATE_FORMAT(u.last_login, '%d/%m/%Y %H:%i') as formatted_last_login,
                   (SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id) as user_bookings_count
            FROM users u
            ORDER BY u.created_at DESC
        `);

        // 4. Danh sách toàn bộ vé đã đặt
        const allBookings = await db.query(`
            SELECT b.*, 
                   m.title as movie_title, 
                   r.name as room_name,
                   DATE_FORMAT(b.booking_time, '%d/%m/%Y %H:%i') as formatted_booking_time,
                   (SELECT GROUP_CONCAT(bd.seat_code SEPARATOR ', ') FROM booking_details bd WHERE bd.booking_id = b.id) as seat_codes
            FROM bookings b
            JOIN showtimes s ON b.showtime_id = s.id
            JOIN movies m ON s.movie_id = m.id
            JOIN rooms r ON s.room_id = r.id
            ORDER BY b.booking_time DESC
            LIMIT 50
        `);

        res.render('admin/dashboard', {
            title: 'Hệ Thống Quản Lý Đăng Nhập & Quản Trị - CINESTAR K23',
            stats,
            loginLogs,
            users,
            allBookings,
            activeTab,
            currentUser: req.session.user,
            success: req.query.success || null,
            error: req.query.error || null
        });

    } catch (err) {
        console.error('[ADMIN DASHBOARD ERROR]', err);
        res.status(500).render('error', { title: 'Lỗi Quản Trị', message: err.message });
    }
}

// Khóa hoặc Mở khóa tài khoản người dùng
async function toggleUserStatus(req, res) {
    const targetUserId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (targetUserId === req.session.user.id) {
        return res.redirect('/admin?tab=users&error=' + encodeURIComponent('Bạn không thể tự khóa tài khoản quản trị của chính mình.'));
    }

    try {
        const newStatus = status === 'BLOCKED' ? 'BLOCKED' : 'ACTIVE';
        await db.query('UPDATE users SET status = ? WHERE id = ?', [newStatus, targetUserId]);
        
        console.log(`[ADMIN ACTION] Quản trị viên ${req.session.user.email} đổi trạng thái User ID ${targetUserId} -> ${newStatus}`);
        res.redirect('/admin?tab=users&success=' + encodeURIComponent(`Đã cập nhật trạng thái tài khoản thành ${newStatus}.`));
    } catch (err) {
        console.error('[ADMIN TOGGLE STATUS ERROR]', err);
        res.redirect('/admin?tab=users&error=' + encodeURIComponent('Lỗi cập nhật: ' + err.message));
    }
}

// Đổi vai trò người dùng (USER <-> ADMIN)
async function toggleUserRole(req, res) {
    const targetUserId = parseInt(req.params.id, 10);
    const { role } = req.body;

    if (targetUserId === req.session.user.id) {
        return res.redirect('/admin?tab=users&error=' + encodeURIComponent('Bạn không thể tự đổi vai trò của chính mình.'));
    }

    try {
        const newRole = role === 'ADMIN' ? 'ADMIN' : 'USER';
        await db.query('UPDATE users SET role = ? WHERE id = ?', [newRole, targetUserId]);
        
        console.log(`[ADMIN ACTION] Quản trị viên ${req.session.user.email} phân quyền User ID ${targetUserId} -> ${newRole}`);
        res.redirect('/admin?tab=users&success=' + encodeURIComponent(`Đã phân quyền tài khoản thành ${newRole}.`));
    } catch (err) {
        console.error('[ADMIN TOGGLE ROLE ERROR]', err);
        res.redirect('/admin?tab=users&error=' + encodeURIComponent('Lỗi phân quyền: ' + err.message));
    }
}

module.exports = {
    requireAdmin,
    getAdminDashboard,
    toggleUserStatus,
    toggleUserRole
};
