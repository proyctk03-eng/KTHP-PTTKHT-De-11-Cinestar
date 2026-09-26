# 📑 DANH SÁCH CÁC CÂU TRUY VẤN LOGQL THỰC HÀNH (LOKI + GRAFANA)
> **Môn học**: Triển khai và Quản trị Hệ thống Phần mềm  
> **Sinh viên**: Nguyễn Tuấn Đạt | **MSV**: DTC245200452  
> **Hệ thống**: Thu thập & Phân tích Log tập trung Loki + Promtail  

---

## 🔍 Hướng Dẫn Truy Vấn Trên Giao Diện Grafana Explore
1. Truy cập Grafana: [http://localhost:3001](http://localhost:3001)
2. Đăng nhập: User `admin` / Password `Admin@123456`
3. Nhấp vào biểu tượng **Explore** (hình chiếc la bàn trên menu bên trái).
4. Chọn Datasource là **Loki**.
5. Nhập các câu truy vấn LogQL dưới đây vào thanh tìm kiếm.

---

### 📌 CÂU TRUY VẤN 1: Truy Vấn Toàn Bộ Log Ứng Dụng Web Đặt Vé
* **Mục đích**: Theo dõi tất cả luồng xử lý, request HTTP và thông điệp server của Web Application.
* **Cú pháp LogQL**:
```logql
{container="ticket-app"}
```
*(Hoặc truy vấn theo job thu thập container: `{job="container-logs"}`)*

---

### 📌 CÂU TRUY VẤN 2: Lọc Các Sự Kiện Đặt Vé & Thanh Toán Thành Công (Audit Log Nghiệp Vụ)
* **Mục đích**: Kiểm tra doanh thu thời gian thực, mã vé được tạo, khách hàng đặt vé và danh sách ghế ngồi đã chốt.
* **Cú pháp LogQL**:
```logql
{container="ticket-app"} |= "BOOKING_SUCCESS"
```
* **Mẫu kết quả log thu được**:
```text
[BOOKING_SUCCESS] Mã vé=TKT-DTC24520-8891 | Khách hàng=Nguyễn Tuấn Đạt | ĐT=0987654321 | Phim=Dune: Hành Tinh Cát - Phần 2 | Ghế=C05,C06 | Tổng tiền=275.000 VND | Phương thức=MOMO | TxID=MOMO_TXN_9918237
```

---

### 📌 CÂU TRUY VẤN 3: Giám Sát Cảnh Báo Lỗi HTTP 4xx hoặc 5xx Trên Nginx
* **Mục đích**: Phát hiện các yêu cầu bị lỗi, tấn công dò quét URL hoặc lỗi máy chủ để kịp thời xử lý.
* **Cú pháp LogQL (Regular Expression)**:
```logql
{container="nginx"} |~ " (4[0-9]{2}|5[0-9]{2}) "
```
* **Mẫu kết quả log thu được**:
```text
192.168.1.15 - - [26/Sep/2026:15:30:12 +0700] "GET /admin/secret HTTP/1.1" 404 153 "-" "Mozilla/5.0"
```

---

### 🎁 CÂU TRUY VẤN MỞ RỘNG (BONUS NÂNG CAO):
* **Query 4 (Lọc các phiên đăng nhập thành công)**:
```logql
{container="ticket-app"} |= "LOGIN_SUCCESS"
```
* **Query 5 (Biến đổi Log thành Metric - Đo tốc độ log sinh ra mỗi giây)**:
```logql
rate({job="container-logs"}[1m])
```
