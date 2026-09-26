const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Trang Đăng Nhập
function getLoginPage(req, res) {
    if (req.session && req.session.user) {
        return res.redirect(req.session.user.role === 'ADMIN' ? '/admin' : '/');
    }
    res.render('login', {
        title: 'Đăng Nhập - CINESTAR K23',
        error: req.query.error || null,
        success: req.query.success || null,
        returnUrl: req.query.returnUrl || '/'
    });
}

// Xử lý Đăng Nhập & Ghi Nhật Ký Đăng Nhập (Login Logs)
async function postLogin(req, res) {
    const { email_or_phone, password, returnUrl } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] || 'Browser').substring(0, 250);

    if (!email_or_phone || !password) {
        return res.render('login', {
            title: 'Đăng Nhập - CINESTAR K23',
            error: 'Vui lòng nhập đầy đủ Email/Số điện thoại và Mật khẩu.',
            success: null,
            returnUrl
        });
    }

    try {
        const identifier = email_or_phone.trim();
        const users = await db.query(
            'SELECT * FROM users WHERE email = ? OR phone = ? LIMIT 1',
            [identifier, identifier]
        );

        // 1. Kiểm tra tài khoản tồn tại
        if (!users || users.length === 0) {
            await db.query(
                'INSERT INTO login_logs (user_id, email, ip_address, user_agent, status, failure_reason) VALUES (?, ?, ?, ?, ?, ?)',
                [null, identifier, ipAddress, userAgent, 'FAILED', 'Tài khoản không tồn tại trên hệ thống']
            );
            return res.render('login', {
                title: 'Đăng Nhập - CINESTAR K23',
                error: 'Email hoặc Số điện thoại không chính xác.',
                success: null,
                returnUrl
            });
        }

        const user = users[0];

        // 2. Kiểm tra trạng thái tài khoản
        if (user.status === 'BLOCKED') {
            await db.query(
                'INSERT INTO login_logs (user_id, email, ip_address, user_agent, status, failure_reason) VALUES (?, ?, ?, ?, ?, ?)',
                [user.id, user.email, ipAddress, userAgent, 'FAILED', 'Tài khoản đã bị quản trị viên khóa']
            );
            return res.render('login', {
                title: 'Đăng Nhập - CINESTAR K23',
                error: 'Tài khoản của bạn đã bị khóa bởi Ban Quản Trị. Vui lòng liên hệ Admin.',
                success: null,
                returnUrl
            });
        }

        // 3. So khớp mật khẩu đã băm (Bcrypt)
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            await db.query(
                'INSERT INTO login_logs (user_id, email, ip_address, user_agent, status, failure_reason) VALUES (?, ?, ?, ?, ?, ?)',
                [user.id, user.email, ipAddress, userAgent, 'FAILED', 'Sai mật khẩu đăng nhập']
            );
            return res.render('login', {
                title: 'Đăng Nhập - CINESTAR K23',
                error: 'Mật khẩu không chính xác. Vui lòng thử lại.',
                success: null,
                returnUrl
            });
        }

        // 4. Đăng nhập thành công -> Ghi nhật ký thành công & Cập nhật last_login
        await db.query(
            'INSERT INTO login_logs (user_id, email, ip_address, user_agent, status, failure_reason) VALUES (?, ?, ?, ?, ?, ?)',
            [user.id, user.email, ipAddress, userAgent, 'SUCCESS', null]
        );

        await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

        // Lưu thông tin vào Session
        req.session.user = {
            id: user.id,
            fullname: user.fullname,
            email: user.email,
            phone: user.phone,
            role: user.role
        };

        console.log(`[LOGIN_SUCCESS] User=${user.email} | Vai trò=${user.role} | IP=${ipAddress} | Thời gian=${new Date().toISOString()}`);

        if (user.role === 'ADMIN') {
            return res.redirect('/admin');
        } else {
            return res.redirect(returnUrl && returnUrl !== '/login' ? returnUrl : '/');
        }

    } catch (err) {
        console.error('[AUTH ERROR] Lỗi đăng nhập:', err);
        return res.render('login', {
            title: 'Đăng Nhập - CINESTAR K23',
            error: 'Lỗi hệ thống trong quá trình xác thực: ' + err.message,
            success: null,
            returnUrl
        });
    }
}

// Trang Đăng Ký
function getRegisterPage(req, res) {
    if (req.session && req.session.user) {
        return res.redirect('/');
    }
    res.render('register', {
        title: 'Đăng Ký Thành Viên - CINESTAR K23',
        error: null
    });
}

// Xử lý Đăng Ký
async function postRegister(req, res) {
    const { fullname, phone, email, password, confirm_password } = req.body;

    if (!fullname || !phone || !email || !password) {
        return res.render('register', {
            title: 'Đăng Ký Thành Viên - CINESTAR K23',
            error: 'Vui lòng điền đầy đủ tất cả các trường thông tin.'
        });
    }

    if (password !== confirm_password) {
        return res.render('register', {
            title: 'Đăng Ký Thành Viên - CINESTAR K23',
            error: 'Mật khẩu xác nhận không khớp.'
        });
    }

    if (password.length < 6) {
        return res.render('register', {
            title: 'Đăng Ký Thành Viên - CINESTAR K23',
            error: 'Mật khẩu phải có tối thiểu 6 ký tự.'
        });
    }

    try {
        // Kiểm tra trùng Email hoặc Số điện thoại
        const existing = await db.query(
            'SELECT id, email, phone FROM users WHERE email = ? OR phone = ? LIMIT 1',
            [email.trim(), phone.trim()]
        );

        if (existing && existing.length > 0) {
            return res.render('register', {
                title: 'Đăng Ký Thành Viên - CINESTAR K23',
                error: 'Email hoặc Số điện thoại này đã được đăng ký tài khoản.'
            });
        }

        // Băm mật khẩu
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Lưu vào CSDL
        await db.query(
            'INSERT INTO users (fullname, phone, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)',
            [fullname.trim(), phone.trim(), email.trim(), passwordHash, 'USER', 'ACTIVE']
        );

        console.log(`[REGISTER_SUCCESS] Tạo tài khoản mới: ${email.trim()} (${fullname.trim()})`);

        return res.redirect('/login?success=' + encodeURIComponent('Đăng ký tài khoản thành công! Vui lòng đăng nhập.'));

    } catch (err) {
        console.error('[AUTH ERROR] Lỗi đăng ký:', err);
        return res.render('register', {
            title: 'Đăng Ký Thành Viên - CINESTAR K23',
            error: 'Lỗi đăng ký tài khoản: ' + err.message
        });
    }
}

// Đăng Xuất
function logout(req, res) {
    if (req.session) {
        req.session.destroy(() => {
            res.redirect('/login?success=' + encodeURIComponent('Bạn đã đăng xuất an toàn khỏi hệ thống.'));
        });
    } else {
        res.redirect('/');
    }
}

// Trang Thông Tin Cá Nhân & Vé Của Tôi
async function getProfilePage(req, res) {
    if (!req.session || !req.session.user) {
        return res.redirect('/login?returnUrl=/profile');
    }

    try {
        const user = req.session.user;
        const myBookings = await db.query(
            'SELECT b.*, m.title as movie_title, m.poster_url, r.name as room_name, DATE_FORMAT(s.show_date, "%d/%m/%Y") as formatted_date, TIME_FORMAT(s.start_time, "%H:%i") as formatted_start, (SELECT GROUP_CONCAT(bd.seat_code SEPARATOR ", ") FROM booking_details bd WHERE bd.booking_id = b.id) as seat_codes FROM bookings b JOIN showtimes s ON b.showtime_id = s.id JOIN movies m ON s.movie_id = m.id JOIN rooms r ON s.room_id = r.id WHERE b.user_id = ? OR b.customer_phone = ? ORDER BY b.booking_time DESC',
            [user.id, user.phone]
        );

        res.render('profile', {
            title: `Tài Khoản: ${user.fullname}`,
            user,
            myBookings
        });
    } catch (err) {
        console.error('[AUTH PROFILE ERROR]', err);
        res.status(500).render('error', { title: 'Lỗi Tải Hồ Sơ', message: err.message });
    }
}

module.exports = {
    getLoginPage,
    postLogin,
    getRegisterPage,
    postRegister,
    logout,
    getProfilePage
};
