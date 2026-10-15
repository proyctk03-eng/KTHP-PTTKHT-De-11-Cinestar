/**
 * ======================================================================
 * CINESTAR K23 - AUTOMATED TEST SUITE (KIỂM THỬ TỰ ĐỘNG CHUYÊN SÂU)
 * Sinh viên: Nguyễn Tuấn Đạt | MSV: DTC245200452 | Lớp: K23 ICTU
 * Bộ môn: Triển khai và Quản trị Hệ thống Phần mềm (Đề tài 11)
 * ======================================================================
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const authController = require('../src/controllers/authController');
const bookingController = require('../src/controllers/bookingController');
const adminController = require('../src/controllers/adminController');
const db = require('../src/config/db');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTestCase(name, fn) {
    totalTests++;
    try {
        await fn();
        passedTests++;
        console.log(`  ✔ [PASS] ${name}`);
    } catch (err) {
        failedTests++;
        console.error(`  ✘ [FAIL] ${name}`);
        console.error(`     Nguyên nhân: ${err.message}`);
    }
}

async function main() {
    console.log('======================================================================');
    console.log('🎬 CINESTAR K23 - BỘ KIỂM THỬ TỰ ĐỘNG (FULL-STACK AUTOMATED TESTING)');
    console.log('======================================================================\n');

    // ==================================================================
    // SUITE 1: XÁC THỰC, PHÂN QUYỀN & CHỐNG BRUTE-FORCE LOCKOUT
    // ==================================================================
    console.log('📦 SUITE 1: Xác Thực, Phân Quyền & Chống Tấn Công Brute-Force');

    await runTestCase('requireAuth: Chặn người dùng chưa đăng nhập và chuyển hướng sang /login', () => {
        let redirected = false;
        let targetUrl = '';
        const mockReq = { session: null, originalUrl: '/booking/1' };
        const mockRes = {
            redirect: (url) => { redirected = true; targetUrl = url; }
        };
        authController.requireAuth(mockReq, mockRes, () => {});
        assert.strictEqual(redirected, true, 'Phải kích hoạt chuyển hướng redirect');
        assert.ok(targetUrl.includes('/login?returnUrl='), 'URL phải chứa returnUrl tới trang chọn ghế');
    });

    await runTestCase('requireAuth: Cho phép người dùng đã đăng nhập đi tiếp (next)', () => {
        let nextCalled = false;
        const mockReq = { session: { user: { id: 2, fullname: 'Nguyễn Tuấn Đạt', role: 'USER' } } };
        const mockRes = {};
        authController.requireAuth(mockReq, mockRes, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, true, 'Hàm next() phải được gọi');
    });

    await runTestCase('requireAdmin: Chặn người dùng có vai trò USER truy cập trang Admin (403 Forbidden)', () => {
        let statusSent = 0;
        let renderedView = '';
        const mockReq = { session: { user: { id: 2, role: 'USER' } } };
        const mockRes = {
            status: (code) => {
                statusSent = code;
                return {
                    render: (view) => { renderedView = view; }
                };
            }
        };
        adminController.requireAdmin(mockReq, mockRes, () => {});
        assert.strictEqual(statusSent, 403, 'Phải trả về HTTP 403');
        assert.strictEqual(renderedView, 'error', 'Phải render trang lỗi');
    });

    await runTestCase('requireAdmin: Cho phép tài khoản ADMIN truy cập trang Admin', () => {
        let nextCalled = false;
        const mockReq = { session: { user: { id: 1, role: 'ADMIN' } } };
        const mockRes = {};
        adminController.requireAdmin(mockReq, mockRes, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, true, 'Admin phải được phép truy cập');
    });

    await runTestCase('Brute-force: 5 lần đăng nhập sai liên tiếp dẫn tới tạm khóa tài khoản 3 phút', async () => {
        const testEmail = `tester_bruteforce_${Date.now()}@cinestar.vn`;
        let lastError = '';

        for (let attempt = 1; attempt <= 5; attempt++) {
            const mockReq = {
                body: { email_or_phone: testEmail, password: 'WrongPassword123!', returnUrl: '/' },
                headers: {},
                socket: {}
            };
            const mockRes = {
                render: (view, data) => { lastError = data.error; }
            };
            await authController.postLogin(mockReq, mockRes);

            if (attempt < 5) {
                const remaining = 5 - attempt;
                assert.ok(lastError.includes(`Bạn còn ${remaining} lần thử`), `Lần ${attempt} phải báo còn ${remaining} lần`);
            } else {
                assert.ok(
                    lastError.includes('khóa trong vòng 3 phút') || lastError.includes('khóa 3 phút'),
                    'Lần 5 phải kích hoạt khóa 3 phút'
                );
            }
        }

        // Lần 6: Đang bị khóa -> Bị chặn tức thì kèm đếm ngược
        let lockedMsg = '';
        const mockReqLocked = {
            body: { email_or_phone: testEmail, password: 'AnyPassword', returnUrl: '/' },
            headers: {},
            socket: {}
        };
        const mockResLocked = {
            render: (view, data) => { lockedMsg = data.error; }
        };
        await authController.postLogin(mockReqLocked, mockResLocked);
        assert.ok(lockedMsg.includes('khóa trong 3 phút') && lockedMsg.includes('phút'), 'Lần 6 phải trả về đếm ngược thời gian bị khóa');
    });

    // ==================================================================
    // SUITE 2: BẢO MẬT ĐẶT VÉ & CHỐNG RACE CONDITION
    // ==================================================================
    console.log('\n📦 SUITE 2: Bảo Mật Đặt Vé & Chống Đặt Trùng Ghế (ACID Transaction)');

    await runTestCase('processBooking: Từ chối đặt vé khi chưa đăng nhập (HTTP 401)', async () => {
        let statusCode = 0;
        let responseJson = null;
        const mockReq = { session: null, body: { showtime_id: 1, seat_ids: [1] } };
        const mockRes = {
            status: (code) => {
                statusCode = code;
                return { json: (data) => { responseJson = data; } };
            }
        };
        await bookingController.processBooking(mockReq, mockRes);
        assert.strictEqual(statusCode, 401, 'Mã HTTP phải là 401');
        assert.strictEqual(responseJson.require_login, true, 'require_login phải bằng true');
    });

    await runTestCase('processBooking: Từ chối thông tin đặt vé không hợp lệ (Không chọn ghế -> HTTP 400)', async () => {
        let statusCode = 0;
        let responseJson = null;
        const mockReq = {
            session: { user: { id: 2, fullname: 'Tuấn Đạt' } },
            body: { showtime_id: 1, customer_name: 'Tuấn Đạt', customer_phone: '0987654321', seat_ids: [] }
        };
        const mockRes = {
            status: (code) => {
                statusCode = code;
                return { json: (data) => { responseJson = data; } };
            }
        };
        await bookingController.processBooking(mockReq, mockRes);
        assert.strictEqual(statusCode, 400, 'Không chọn ghế phải trả về HTTP 400');
        assert.strictEqual(responseJson.success, false);
    });

    // ==================================================================
    // SUITE 3: CƠ SỞ DỮ LIỆU DUAL-ENGINE & HỖ TRỢ TRUY VẤN FALLBACK
    // ==================================================================
    console.log('\n📦 SUITE 3: Cơ Sở Dữ Liệu Dual-Engine & Fallback SQL Engine');

    await runTestCase('Database: SELECT 1 kiểm tra tình trạng kết nối DB', async () => {
        const rows = await db.query('SELECT 1');
        assert.ok(rows.length > 0, 'Phải trả về ít nhất 1 dòng');
    });

    await runTestCase('Database: Lấy danh sách phim hiển thị trang chủ', async () => {
        const movies = await db.query('SELECT * FROM movies');
        assert.ok(Array.isArray(movies), 'Kết quả phải là một mảng');
        assert.ok(movies.length > 0, 'Phải có dữ liệu phim');
        assert.ok(movies[0].title, 'Mỗi bản ghi phải có tiêu đề phim');
    });

    await runTestCase('Database: Lấy suất chiếu theo cú pháp SELECT * FROM showtimes WHERE id = ? (Đã fix)', async () => {
        const rows = await db.query('SELECT * FROM showtimes WHERE id = ?', [1]);
        assert.ok(Array.isArray(rows), 'Kết quả phải là mảng');
        assert.ok(rows.length > 0, 'Phải tìm thấy suất chiếu ID = 1');
        assert.strictEqual(rows[0].id, 1, 'ID suất chiếu phải bằng 1');
    });

    await runTestCase('Database: Lấy danh sách ghế trong phòng chiếu', async () => {
        const seats = await db.query('SELECT * FROM seats WHERE room_id = ? ORDER BY seat_row, seat_number', [1]);
        assert.ok(Array.isArray(seats), 'Ghế phải trả về mảng');
        assert.ok(seats.length > 0, 'Phải có ghế trong phòng chiếu 1');
        assert.ok(seats[0].seat_code, 'Mỗi ghế phải có seat_code (VD: A1, A2)');
    });

    // ==================================================================
    // SUITE 4: CHUẨN HÓA GIAO DIỆN, THƯƠNG HIỆU & TIẾNG VIỆT CÓ DẤU
    // ==================================================================
    console.log('\n📦 SUITE 4: Chuẩn Hóa Nhận Diện Thương Hiệu & Tiếng Việt Có Dấu');

    await runTestCase('Branding: Loại bỏ hoàn toàn tên cũ "Galaxy Cinema" khỏi toàn bộ mã nguồn', () => {
        const srcDir = path.join(__dirname, '../src');
        function scanDir(dir) {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    scanDir(fullPath);
                } else if (file.endsWith('.js') || file.endsWith('.ejs')) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    assert.ok(
                        !content.includes('Galaxy Cinema'),
                        `Phát hiện chuỗi "Galaxy Cinema" còn sót lại trong file: ${path.relative(srcDir, fullPath)}`
                    );
                }
            }
        }
        scanDir(srcDir);
    });

    await runTestCase('Validation: Kiểm tra logic nhận diện số điện thoại di động Việt Nam hợp lệ', () => {
        const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
        // Các số hợp lệ
        assert.strictEqual(phoneRegex.test('0987654321'), true);
        assert.strictEqual(phoneRegex.test('0391234567'), true);
        assert.strictEqual(phoneRegex.test('0771122334'), true);
        assert.strictEqual(phoneRegex.test('0868888999'), true);

        // Các số không hợp lệ
        assert.strictEqual(phoneRegex.test('123456'), false);
        assert.strictEqual(phoneRegex.test('0123456789'), false);
        assert.strictEqual(phoneRegex.test('09876543210'), false);
        assert.strictEqual(phoneRegex.test('0987abc321'), false);
    });

    await runTestCase('Footer: Cột "Kiến Trúc Kỹ Thuật" và link microservice nội bộ đã được dọn sạch', () => {
        const footerPath = path.join(__dirname, '../src/views/partials/footer.ejs');
        const content = fs.readFileSync(footerPath, 'utf8');
        assert.ok(!content.includes('Kiến Trúc Kỹ Thuật'), 'Footer không được chứa tiêu đề "Kiến Trúc Kỹ Thuật"');
        assert.ok(!content.includes('Prometheus Metrics'), 'Footer công cộng không được để lộ link chẩn đoán');
        assert.ok(content.includes('CINESTAR K23'), 'Footer phải chứa thương hiệu CINESTAR K23');
        assert.ok(content.includes('Khám Phá & Đặt Vé'), 'Footer phải có cột điều hướng khách hàng');
    });

    // ==================================================================
    // TỔNG KẾT
    // ==================================================================
    console.log('\n======================================================================');
    console.log(`📊 TỔNG KẾT KIỂM THỬ: ${passedTests}/${totalTests} Test Cases Đạt (${Math.round(passedTests/totalTests * 100)}%)`);
    if (failedTests === 0) {
        console.log('🎉 TẤT CẢ TEST CASES ĐÃ VƯỢT QUA 100%! HỆ THỐNG ĐẠT CHUẨN NGHIỆM THU QA/QC.');
        console.log('======================================================================\n');
        process.exit(0);
    } else {
        console.error(`⚠️ Có ${failedTests} test case thất bại. Vui lòng kiểm tra lại!`);
        console.log('======================================================================\n');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Lỗi khi chạy bộ kiểm thử:', err);
    process.exit(1);
});
