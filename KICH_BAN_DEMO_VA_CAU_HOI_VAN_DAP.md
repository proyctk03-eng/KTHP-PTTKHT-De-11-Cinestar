# 🎯 KỊCH BẢN DEMO THỰC HÀNH & BỘ CÂU HỎI VẤN ĐÁP BẢO VỆ KTHP
> **Học phần:** Triển khai và Quản trị Hệ thống Phần mềm (ICTU)  
> **Đề tài 11:** Hệ thống Đặt vé Xem phim & Sự kiện trực tuyến (Cinestar K23)  
> **Sinh viên:** Nguyễn Tuấn Đạt | **Mã SV:** DTC245200452 | **Lớp:** K23C  

---

## ⏱️ PHẦN 1: KỊCH BẢN DEMO THỰC HÀNH 5 PHÚT TRƯỚC HỘI ĐỒNG

### Bước 1: Khởi động 1 chạm tự động (Phút 0 - 1)
1. Mở thư mục dự án `film`, nhấn đúp chuột vào file **`RUN.bat`**.
2. **Thuyết minh với giảng viên:** 
   > *"Thưa thầy/cô, hệ thống được trang bị kịch bản phát hiện môi trường thông minh. Nếu máy chấm thi đã bật Docker Desktop, hệ thống sẽ tự động kích hoạt 6 container (Nginx, Node App, MySQL, Prometheus, Grafana, Loki). Nếu máy không có Docker, hệ thống tự động kích hoạt chế độ Dual-Engine In-Memory để đảm bảo ứng dụng luôn chạy mượt mà ngay lập tức."*
3. Trình duyệt tự động mở trang đặt vé tại `https://localhost` (hoặc `http://localhost:3000`).

---

### Bước 2: Demo Nghiệp vụ Đặt Vé & Chống Trùng Ghế (Phút 1 - 3)
1. **Trang chủ:** Chỉ cho thầy cô thấy giao diện Dark Cinema, danh mục phim và phòng chiếu (IMAX, Dolby Atmos).
2. **Chọn phim & Suất chiếu:** Chọn suất chiếu phim đang hot.
3. **Sơ đồ ghế 3D:**
   - Click chọn các loại ghế: Ghế Standard (vàng nhạt), Ghế VIP (xanh), Ghế Sweetbox (hồng tím).
   - Tổng tiền nhảy theo thời gian thực (Real-time calculation).
4. **Đăng nhập & Thanh toán:**
   - Click nút điền nhanh tài khoản mẫu: `tuandat@ictu.edu.vn` (mật khẩu: `Dat@123456`).
   - Chọn phương thức thanh toán giả lập (VNPAY QR / MoMo).
   - Nhấn **Xác nhận đặt vé**.
5. **Vé điện tử E-Ticket:**
   - Xuất hiện mã vé dạng sinh viên: `TKT-DTC24520-XXXX`.
   - Hiển thị mã QR Code động. Thử click nút **"In vé / Lưu PDF"** để chứng minh tính năng hoàn chỉnh.
6. **Chứng minh chống Race Condition (Trùng ghế):**
   - Mở tab ẩn danh mới hoặc trình duyệt khác, vào lại cùng suất chiếu đó.
   - Các ghế vừa đặt đã chuyển màu xám và **bị khóa hoàn toàn (cấm click)** do cơ chế khóa ACID Transaction `FOR UPDATE` trong MySQL.

---

### Bước 3: Demo Cụm Giám Sát & Log Tập Trung (Phút 3 - 5)
1. **Truy cập Grafana:** Vào `http://localhost:3001` (Tài khoản: `admin` / `Admin@123456`).
2. **Xem Dashboard:** Mở Dashboard đã được Provisioning tự động:
   - Chỉ cho thầy cô thấy biểu đồ Request Rate (tần suất gọi API), CPU/Memory, Active Sessions.
3. **Loki LogQL:** Vào mục **Explore** (chọn nguồn Loki), chạy 2 câu truy vấn thực hành:
   - **Xem log toàn bộ ứng dụng:**
     ```logql
     {container="ticket-app"}
     ```
   - **Lọc audit log sự kiện đặt vé thành công:**
     ```logql
     {container="ticket-app"} |= "BOOKING_SUCCESS"
     ```
4. **Kết thúc buổi demo:** Nhấn đúp chuột vào file **`STOP.bat`** để dọn dẹp tiến trình.

---

## 💡 PHẦN 2: BỘ CÂU HỎI VẤN ĐÁP THƯỜNG GẶP CỦA GIẢNG VIÊN & ĐÁP ÁN

### ❓ Câu 1: Tại sao em phải dùng Nginx làm Reverse Proxy mà không để người dùng truy cập trực tiếp vào Node.js port 3000?
* **Đáp án chuẩn:**
  > *"Thưa thầy/cô, việc sử dụng Nginx mang lại 4 lợi ích sống còn trong môi trường Production:*
  > 1. **Bảo mật SSL/TLS Termination:** Nginx giải mã HTTPS tập trung trên cổng 443, giảm tải tính toán mã hóa cho Node.js app.
  > 2. **Bảo vệ chống tấn công (Rate Limiting):** Em cấu hình giới hạn 5 request/giây trên API đặt vé để chống các tool spam đơn hoặc brute-force.
  > 3. **Phân tách mạng:** Nhờ Nginx, người dùng ngoài Internet không bao giờ biết hoặc truy cập trực tiếp vào port nội bộ của Node.js hay MySQL.
  > 4. **Tối ưu tĩnh & Security Headers:** Nginx thêm các header chống clickjacking (`X-Frame-Options`) và XSS trước khi phản hồi về Client."*

---

### ❓ Câu 2: Em giải quyết bài toán 2 người cùng bấm đặt 1 ghế tại cùng 1 tích tắc như thế nào?
* **Đáp án chuẩn:**
  > *"Em áp dụng cơ chế **ACID Transaction kết hợp Khóa dòng bi quan (Pessimistic Locking)** trong MySQL 8.0:
  > - Khi khách hàng gửi yêu cầu đặt ghế, mã nguồn thực hiện câu lệnh:  
  >   `SELECT * FROM seats WHERE showtime_id = ? AND seat_code = ? FOR UPDATE;`
  > - Câu lệnh `FOR UPDATE` sẽ khóa độc quyền dòng dữ liệu của ghế đó. Giao dịch của người thứ hai đến sau sẽ bị chặn (wait) cho đến khi giao dịch đầu tiên hoàn tất (Commit hoặc Rollback).
  > - Nếu người đầu tiên đặt thành công, trạng thái ghế đổi thành `BOOKED`, giao dịch thứ hai được mở khóa và ngay lập tức bị từ chối với thông báo 'Ghế đã được đặt trước'."*

---

### ❓ Câu 3: Làm thế nào để đảm bảo container Node.js an toàn nếu kẻ tấn công khai thác được lỗi mã nguồn?
* **Đáp án chuẩn:**
  > *"Trong file `Dockerfile`, em không chạy dưới quyền `root` mặc định. Em đã khai báo:  
  > `USER node`  
  > User này chỉ có quyền đọc/thực thi trong thư mục `/app`, không có quyền chỉnh sửa file hệ thống của máy chủ Linux bên dưới hay cài thêm các gói phần mềm độc hại."*

---

### ❓ Câu 4: Sự khác biệt giữa Prometheus và Grafana Loki trong hệ thống của em là gì?
* **Đáp án chuẩn:**
  > *- **Prometheus là hệ thống giám sát Chỉ số số học (Metrics):** Thu thập dữ liệu dạng time-series số học (CPU %, dung lượng RAM, số lượng request/giây, latency) để vẽ biểu đồ và cảnh báo ngưỡng quá tải.  
  > - **Loki là hệ thống giám sát Nhật ký (Logs):** Thu thập các dòng văn bản ghi log của ứng dụng và Nginx, chỉ lập chỉ mục (index) theo metadata nhãn nhãn container giúp tiết kiệm RAM vượt trội so với Elasticsearch, dùng ngôn ngữ LogQL để tra cứu chi tiết ngữ cảnh lỗi hoặc lịch sử giao dịch.*

---

### ❓ Câu 5: Em cấu hình mạng Docker Network như thế nào để bảo vệ CSDL MySQL?
* **Đáp án chuẩn:**
  > *"Em chia tách thành 2 mạng Docker Network riêng biệt:
  > - `frontend_net`: Chỉ kết nối Nginx và Node.js App.
  > - `backend_net`: Chỉ kết nối Node.js App và MySQL.
  > Nhờ vậy, máy chủ MySQL bị cô lập hoàn toàn ở tầng trong cùng, không có đường kết nối nào từ ngoài Internet hay từ Nginx có thể chạm trực tiếp tới MySQL."*
