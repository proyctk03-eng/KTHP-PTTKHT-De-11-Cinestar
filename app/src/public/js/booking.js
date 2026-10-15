document.addEventListener('DOMContentLoaded', () => {
    const seatElements = document.querySelectorAll('.seat:not(.booked)');
    const selectedListEl = document.getElementById('selected-seats-list');
    const selectedCountEl = document.getElementById('selected-count');
    const totalAmountEl = document.getElementById('total-amount');
    const bookBtn = document.getElementById('btn-submit-booking');
    const bookingForm = document.getElementById('booking-form');
    const paymentButtons = document.querySelectorAll('.payment-btn');

    let selectedSeats = []; // [{ id, code, price }]
    let selectedPayment = 'MOMO';

    // 1. Xử lý click chọn phương thức thanh toán giả lập
    paymentButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            paymentButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedPayment = btn.dataset.method;
        });
    });

    // 2. Xử lý click chọn / hủy chọn ghế
    seatElements.forEach(seat => {
        seat.addEventListener('click', () => {
            const seatId = parseInt(seat.dataset.id, 10);
            const seatCode = seat.dataset.code;
            const seatPrice = parseInt(seat.dataset.price, 10);

            const existingIndex = selectedSeats.findIndex(s => s.id === seatId);

            if (existingIndex > -1) {
                // Đã chọn -> Hủy chọn
                selectedSeats.splice(existingIndex, 1);
                seat.classList.remove('selected');
            } else {
                // Chưa chọn -> Tối đa chọn 8 ghế / lần
                if (selectedSeats.length >= 8) {
                    alert('Bạn chỉ có thể chọn tối đa 8 ghế trong một lần đặt vé.');
                    return;
                }
                selectedSeats.push({ id: seatId, code: seatCode, price: seatPrice });
                seat.classList.add('selected');
            }

            updateSummaryUI();
        });
    });

    // 3. Cập nhật giao diện tổng tiền & danh sách ghế
    function updateSummaryUI() {
        const count = selectedSeats.length;
        selectedCountEl.textContent = count;

        let total = 0;
        selectedListEl.innerHTML = '';

        if (count === 0) {
            selectedListEl.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">Chưa có ghế nào được chọn</span>';
            bookBtn.disabled = true;
            bookBtn.style.opacity = '0.5';
            bookBtn.style.cursor = 'not-allowed';
        } else {
            selectedSeats.forEach(s => {
                total += s.price;
                const chip = document.createElement('span');
                chip.className = 'selected-seat-chip';
                chip.textContent = s.code;
                selectedListEl.appendChild(chip);
            });
            bookBtn.disabled = false;
            bookBtn.style.opacity = '1';
            bookBtn.style.cursor = 'pointer';
        }

        totalAmountEl.textContent = total.toLocaleString('vi-VN') + ' đ';
    }

    // 4. Submit form đặt vé & thanh toán giả lập
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (selectedSeats.length === 0) {
                alert('Vui lòng chọn ít nhất một ghế để tiếp tục đặt vé.');
                return;
            }

            const name = document.getElementById('cust-name').value.trim();
            const phone = document.getElementById('cust-phone').value.trim();
            const email = document.getElementById('cust-email').value.trim();
            const showtimeId = parseInt(document.getElementById('showtime-id').value, 10);

            if (!name || !phone) {
                alert('Vui lòng nhập Họ tên và Số điện thoại nhận vé.');
                return;
            }

            // Kiểm tra định dạng số điện thoại Việt Nam hợp lệ (10 chữ số)
            const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
            if (!phoneRegex.test(phone)) {
                alert('Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại di động Việt Nam 10 chữ số (ví dụ: 0987654321).');
                return;
            }

            // Hiển thị trạng thái đang xử lý
            const originalBtnText = bookBtn.innerHTML;
            bookBtn.disabled = true;
            bookBtn.innerHTML = '⏳ Đang xác nhận thanh toán...';

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            try {
                const response = await fetch('/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        showtime_id: showtimeId,
                        customer_name: name,
                        customer_phone: phone,
                        customer_email: email,
                        seat_ids: selectedSeats.map(s => s.id),
                        payment_method: selectedPayment
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                const data = await response.json();

                if (data.success) {
                    // Chuyển hướng sang trang vé điện tử
                    window.location.href = data.redirect_url;
                } else {
                    // Bắt lỗi chưa đăng nhập
                    if (response.status === 401 || data.require_login) {
                        alert('⚠️ ' + (data.message || 'Vui lòng đăng nhập tài khoản trước khi đặt vé!'));
                        window.location.href = '/login?returnUrl=' + encodeURIComponent(window.location.pathname);
                        return;
                    }

                    alert('Lỗi: ' + data.message);
                    bookBtn.disabled = false;
                    bookBtn.innerHTML = originalBtnText;
                    // Nếu lỗi do ghế bị trùng, tải lại trang để cập nhật sơ đồ ghế
                    if (response.status === 409) {
                        setTimeout(() => location.reload(), 1500);
                    }
                }
            } catch (err) {
                clearTimeout(timeoutId);
                console.error('Lỗi kết nối đặt vé:', err);
                if (err.name === 'AbortError') {
                    alert('Thời gian xử lý giao dịch quá 15 giây (Timeout). Vui lòng kiểm tra lại kết nối mạng của bạn!');
                } else {
                    alert('Không thể kết nối đến máy chủ thanh toán. Vui lòng thử lại!');
                }
                bookBtn.disabled = false;
                bookBtn.innerHTML = originalBtnText;
            }
        });
    }

    // Khởi tạo trạng thái ban đầu
    updateSummaryUI();
});
