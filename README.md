# 🎬 HỆ THỐNG ĐẶT VÉ XEM PHIM & SỰ KIỆN TRỰC TUYẾN (CINESTAR K23)
> **Học phần**: Triển khai và Quản trị Hệ thống Phần mềm  
> **Trường**: Đại học Công nghệ Thông tin và Truyền thông - Đại học Thái Nguyên (ICTU)  
> **Đề tài số 11**: Xây dựng & Triển khai Hệ thống Đặt vé Xem phim / Sự kiện  
> **Sinh viên thực hiện**: **Nguyễn Tuấn Đạt** | **Mã SV**: **DTC245200452** | **Lớp**: K23  

---

## 📌 1. TỔNG QUAN HỆ THỐNG & KIẾN TRÚC TRIỂN KHAI

Hệ thống được phát triển theo kiến trúc **Full-stack hoàn chỉnh** (xử lý nghiệp vụ động, có cơ sở dữ liệu quan hệ, **tuyệt đối không phải web tĩnh**) và được đóng gói triển khai tự động hóa thông qua **Docker Compose**.

```text
[ Client Browser ]
        │ (HTTPS: 443 / HTTP: 80)
        ▼
┌────────────────────────────────────────────────────────┐
│               NGINX REVERSE PROXY                      │
│  - SSL / TLS Termination (HTTPS tự ký)                 │
│  - Security Headers & Rate Limiting                    │
└───────────────┬────────────────────────┬───────────────┘
                │ (frontend_net)         │
                ▼                        ▼
┌─────────────────────────────┐   ┌──────────────────────┐
│  WEB APP (Node.js/Express)  │   │  phpMyAdmin (Admin)  │
│  - Port 3000                │   │  - Port 80 / 8080    │
│  - Prometheus /metrics      │   └──────────┬───────────┘
│  - Non-root Container       │              │
└───────────────┬─────────────┘              │
                │ (backend_net)              │
                └───────────────┬────────────┘
                                ▼
                ┌─────────────────────────────┐
                │   MYSQL 8.0 DATABASE        │
                │   - Chuẩn 3NF (ACID Trans)  │
                │   - Tự động nạp init.sql    │
                │   - Volume: mysql_data      │
                └─────────────────────────────┘
```

---

## 🛠️ 2. TECH STACK & CÔNG NGHỆ ÁP DỤNG

* **Backend Logic & Web Server**: Node.js v20 LTS, Express.js, EJS View Engine, `prom-client` (Metrics exporter), `qrcode` (Sinh mã QR vé điện tử).
* **Cơ sở dữ liệu (Database)**: MySQL 8.0 chuẩn 3NF, hỗ trợ ACID Transaction chống đặt trùng ghế khi nhiều người bấm cùng lúc (`FOR UPDATE`).
* **Quản trị Database**: phpMyAdmin Web GUI.
* **Cổng vào & Bảo mật**: Nginx Alpine làm Reverse Proxy, SSL tự ký, Security Headers, Rate Limiting chống DDoS/Spam.
* **Orchestration**: Docker Compose v2, thiết lập phân tách mạng nội bộ (`frontend_net` & `backend_net`) và giới hạn tài nguyên (CPU/RAM limit).

---

## 🚀 3. HƯỚNG DẪN KHỞI CHẠY (QUICK START)

### 🌟 Cách 1: KHỞI ĐỘNG 1 CHẠM TỰ ĐỘNG (DỄ NHẤT TRÊN MÁY KHÁC)
Bạn chỉ cần mang toàn bộ thư mục sang máy khác và:
* **Nhấp đúp chuột vào file `RUN.bat`**:
  * Tự động phát hiện môi trường:
    * Nếu máy có Docker: Tự chạy Docker Compose, bật toàn bộ dịch vụ và **tự động mở trình duyệt web**.
    * Nếu máy chưa cài Docker: Tự động chạy chế độ Dual-Engine In-Memory siêu nhẹ và **tự động mở trình duyệt web** tại `http://localhost:3000`.
* **Để dừng hệ thống**: Nhấp đúp chuột vào file `STOP.bat`.

---

### Cách 2: Khởi chạy thủ công qua dòng lệnh Docker Compose
Chỉ cần thực hiện **01 lệnh duy nhất**:
```bash
docker compose up -d --build
```

Kiểm tra trạng thái các container:
```bash
docker compose ps
```

### Bảng cổng truy cập dịch vụ:

| Dịch vụ | Địa chỉ URL | Cổng Host | Tài khoản mặc định | Ghi chú |
| :--- | :--- | :---: | :---: | :--- |
| **Website Đặt vé (HTTPS)** | [https://localhost](https://localhost) | `443` | - | Truy cập chính thức qua Nginx (Bảo mật SSL) |
| **Website Đặt vé (HTTP)** | [http://localhost](http://localhost) | `80` | - | Nginx tự động chuyển hướng sang HTTPS |
| **Grafana Dashboard** | [http://localhost:3001](http://localhost:3001) | `3001` | `admin` / `Admin@123456` | Tự động Provisioning Dashboard & Datasource |
| **Prometheus Server** | [http://localhost:9090](http://localhost:9090) | `9090` | - | Cào số liệu cAdvisor, Nginx, MySQL, App |
| **Loki Log Engine** | [http://localhost:3100](http://localhost:3100) | `3100` | - | Quản lý log tập trung cho Grafana Explore |
| **phpMyAdmin** | [http://localhost:8080](http://localhost:8080) | `8080` | `ticket_user` / `TicketSecurePass2024!` | Quản trị CSDL trực quan |
| **Đăng Nhập Thành Viên** | [http://localhost/login](http://localhost/login) | `80/443` | Xem bên dưới | Có nút điền nhanh 1-click test Admin/User |
| **Quản Lý Đăng Nhập (Admin)** | [http://localhost/admin](http://localhost/admin) | `80/443` | `admin@cinestar.vn` | Bảng Audit Log, quản lý user và vé |
| **Health Check API** | [http://localhost/health](http://localhost/health) | `80/443` | - | Kiểm tra trạng thái Database & Uptime |
| **Prometheus Metrics** | [http://localhost/metrics](http://localhost/metrics) | `80/443` | - | Endpoint đo lường NodeJS & Business KPIs |

### 🔑 Tài khoản mẫu thử nghiệm hệ thống (Có sẵn nút bấm điền nhanh trên giao diện):
* **Tài khoản Quản Trị (Admin)**: `admin@cinestar.vn` | **Mật khẩu**: `Admin@123456`  
  *(Đầy đủ quyền truy cập Trang Quản lý Đăng nhập, xem toàn bộ Login Logs, khóa/mở khóa user, phân quyền)*
* **Tài khoản Khách Hàng (User)**: `tuandat@ictu.edu.vn` | **Mật khẩu**: `Dat@123456`  
  *(Tự động điền thông tin khi chọn ghế đặt vé, xem hồ sơ cá nhân và vé của tôi)*

---

## 📑 4. CÁC CÂU TRUY VẤN LOGQL THỰC HÀNH (TIÊU CHÍ 5)
Trong Grafana Explore ([http://localhost:3001/explore](http://localhost:3001/explore)), chọn Datasource **Loki** và sử dụng các câu query sau:
1. **Query 1 - Truy vấn toàn bộ log của ứng dụng web đặt vé**:
   ```logql
   {container="ticket-app"}
   ```
2. **Query 2 - Lọc riêng các sự kiện đặt vé thành công (Audit log nghiệp vụ)**:
   ```logql
   {container="ticket-app"} |= "BOOKING_SUCCESS"
   ```
3. **Query 3 - Giám sát các mã lỗi HTTP 4xx hoặc 5xx trên Nginx**:
   ```logql
   {container="nginx"} |~ " (4[0-9]{2}|5[0-9]{2}) "
   ```
*(Xem thêm hướng dẫn chi tiết tại [queries/logql_queries.md](queries/logql_queries.md))*

---

## 🎯 4. CÁC TÍNH NĂNG NGHIỆP VỤ THỰC TẾ ĐÃ HOÀN THIỆN (NGÀY 1)

1. **Trang chủ & Lọc Phim**:
   * Danh mục phim chiếu rạp và sự kiện âm nhạc trực tiếp.
   * Giao diện hiện đại phong cách Dark Cinema sang trọng, hiển thị giá vé, poster, thể loại, thời lượng.
2. **Chi tiết Phim & Lịch chiếu**:
   * Thông tin đạo diễn, diễn viên, tóm tắt nội dung.
   * Bảng danh sách các suất chiếu trong tuần kèm phòng chiếu (IMAX, Dolby Atmos) và hệ số giá giờ vàng.
3. **Sơ đồ Chọn Ghế Trực quan (Interactive Seat Map)**:
   * Mô phỏng màn hình rạp chiếu cong 3D.
   * Phân loại ghế ngồi rõ ràng: Ghế Thường (Standard), Ghế VIP, Ghế Đôi (Sweetbox).
   * Khóa ghế tự động khi đã có người đặt trước trong MySQL (hiển thị màu xám, cấm click).
   * Khách hàng click chọn ghế, hệ thống tự động cộng dồn tổng tiền real-time.
4. **Thanh toán Giả lập & Đặt vé**:
   * Hỗ trợ thanh toán qua Ví MoMo, VNPAY QR hoặc Chuyển khoản Ngân hàng.
   * Cơ chế **ACID Transaction** trong MySQL: Khóa dòng (`FOR UPDATE`) để ngăn chặn tuyệt đối tình trạng 2 khách hàng đặt cùng 1 ghế tại cùng 1 giây.
5. **Xuất Vé Điện Tử (E-Ticket) & Mã QR Code**:
   * Sinh mã vé theo định dạng sinh viên: `TKT-DTC24520-XXXX`.
   * Tự động sinh mã QR Code chứa thông tin vé để quét tại cổng rạp.
   * Hỗ trợ nút **In vé / Lưu file PDF** trực tiếp từ trình duyệt.
6. **Tra Cứu Lịch Sử Vé**:
   * Tìm kiếm vé nhanh qua Số điện thoại hoặc Mã vé.

---

## 🛡️ 5. BIỆN PHÁP HARDENING BẢO MẬT ĐÃ TRIỂN KHAI

* **Non-root Container**: File `Dockerfile` cấu hình chạy dưới user `node` (UID không có quyền root máy chủ).
* **Docker Network Isolation**: Chia tách `frontend_net` (Nginx <-> App) và `backend_net` (App <-> MySQL), cấm kết nối trực tiếp từ Internet vào CSDL MySQL.
* **Nginx Security Headers**: Bổ sung đầy đủ `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Strict-Transport-Security`.
* **Rate Limiting**: Giới hạn tần suất truy cập vào API đặt vé (`/api/bookings`) tối đa 5 req/s để ngăn chặn tool spam đơn ảo.
* **Tài nguyên giới hạn (Resource Limits)**: Khai báo `deploy.resources.limits` cho từng container chống hiện tượng tràn RAM/CPU gây treo máy.

---

## 📦 6. LỘ TRÌNH 03 COMMIT TRÊN GITHUB THEO YÊU CẦU

* **Commit 1 (Ngày 1)**: `feat: initialize fullstack ticket booking app, mysql, phpmyadmin, and nginx reverse proxy with ssl`
* **Commit 2 (Ngày 2)**: `feat: integrate prometheus and grafana monitoring stack with cadvisor and database metrics`
* **Commit 3 (Ngày 3)**: `feat: implement centralized logging with loki, promtail and apply system hardening`

---
*Bản quyền © 2024 - 2026 Nguyễn Tuấn Đạt (DTC245200452) - ICTU.*
