# 🎬 CINESTAR K23 - HỆ THỐNG ĐẶT VÉ XEM PHIM & SỰ KIỆN TRỰC TUYẾN
> **Học phần**: Triển khai và Quản trị Hệ thống Phần mềm  
> **Trường**: Đại học Công nghệ Thông tin và Truyền thông - Đại học Thái Nguyên (ICTU)  
> **Đề tài số 11**: Xây dựng & Triển khai Hệ thống Đặt vé Xem phim / Sự kiện  
> **Sinh viên thực hiện**: **Nguyễn Tuấn Đạt** | **Mã SV**: **DTC245200452** | **Lớp**: K23  

---

## 📌 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

Dự án được xây dựng theo mô hình **Full-stack Microservices hoàn chỉnh**, đáp ứng đầy đủ các tiêu chuẩn vận hành thực tế: xử lý nghiệp vụ động có lưu trữ cơ sở dữ liệu quan hệ tuân thủ **ACID Transaction**, bảo vệ tầng mạng qua **Nginx Reverse Proxy (SSL/TLS)**, giám sát toàn diện qua **Prometheus + Grafana**, quản lý nhật ký tập trung qua **Loki + Promtail**, và được gia cố an ninh đa tầng (**Security Hardening**).

Toàn bộ hệ sinh thái được đóng gói và tự động hóa 100% thông qua **Docker Compose**.

### 📐 Sơ Đồ Kiến Trúc Luồng Dữ Liệu & Mạng Nội Bộ (System Architecture)

```mermaid
graph TD
    Client["Client / Giảng viên (Web Browser)"]
    
    subgraph Ingress ["TẦNG CỔNG VÀO & BẢO MẬT (INGRESS LAYER)"]
        Client -->|Port 80 HTTP (Redirect 301)| Nginx["Nginx Reverse Proxy\n- SSL Termination (Port 443)\n- OWASP Security Headers\n- Rate Limiting & Gzip\n- Ẩn phiên bản (server_tokens off)"]
        Client -->|Port 443 HTTPS (TLS 1.2/1.3)| Nginx
    end

    subgraph frontend_net ["MẠNG FRONTEND (frontend_net - Bridge)"]
        Nginx -->|Reverse Proxy /| WebApp["Web Application (Node.js 20)\n- Non-root user: appuser (UID 1001)\n- Đặt vé thời gian thực (ACID)\n- Endpoint Metrics: /metrics\n- Endpoint Test: /trigger-error"]
        Nginx -.->|Reverse Proxy /pma/| PMA["phpMyAdmin (Quản trị CSDL)"]
    end

    subgraph backend_net ["MẠNG BACKEND CÔ LẬP (backend_net - internal: true)"]
        WebApp -->|MySQL Port 3306| DB[("MySQL 8.0 Database\n- Chuẩn hóa 3NF / InnoDB\n- Khóa dòng FOR UPDATE\n- Tự động nạp init.sql\n- Persistent Volume db_data")]
        PMA -->|Truy vấn nội bộ| DB
    end

    subgraph monitoring_net ["MẠNG GIÁM SÁT & NHẬT KÝ (monitoring_net - Bridge)"]
        Prometheus["Prometheus Server (Port 9090)\n- Scrape Interval: 10s\n- Lưu trữ TSDB bền vững"]
        Prometheus -->|Scrape metrics| WebApp
        Prometheus -->|Scrape metrics| NginxExp["Nginx Exporter (Port 9113)"]
        Prometheus -->|Scrape metrics| Cadvisor["cAdvisor (Giám sát tài nguyên container)"]
        NginxExp -->|/stub_status| Nginx
        
        Promtail["Promtail Log Collector\n- Mount docker.sock\n- Mount nginx_logs\n- Relabel: job=nginx, job=webapp"] -->|Đẩy log qua HTTP 3100| Loki["Loki Log Engine (Port 3100)\n- Chỉ mục hóa labels\n- Lưu trữ chunks filesystem"]
        
        Grafana["Grafana Analytics (Port 3001)\n- Tự động nạp Dashboard Cinema\n- Tự động kết nối Prometheus & Loki\n- Giao diện Explore truy vấn LogQL"]
        Grafana -->|Truy vấn Metrics| Prometheus
        Grafana -->|Truy vấn LogQL| Loki
        
        Client -->|Truy cập Dashboard 3001| Grafana
        Client -->|Truy cập Prometheus UI 9090| Prometheus
    end
```

---

## 🛠️ 2. DANH MỤC CÔNG NGHỆ ÁP DỤNG (TECH STACK)

| Thành phần | Công nghệ / Thư viện | Vai trò kỹ thuật |
| :--- | :--- | :--- |
| **Backend Framework** | Node.js v20 LTS, Express.js | Xử lý logic nghiệp vụ, routing API, xác thực session |
| **Giao diện Người dùng** | EJS Template Engine, Bootstrap 5, FontAwesome | Giao diện Dark Cinema hiện đại, Responsive, sơ đồ chọn ghế trực quan |
| **Cơ sở dữ liệu** | MySQL 8.0 Community (InnoDB) | Thiết kế chuẩn 3NF, hỗ trợ ACID Transaction chống đặt trùng ghế (`FOR UPDATE`) |
| **Quản trị Database** | phpMyAdmin (Official Docker) | Quản trị dữ liệu trực quan qua Web GUI |
| **Cổng Ingress & Proxy** | Nginx Alpine (v1.25+) | Reverse Proxy, SSL Termination, Cấu hình HTTP/2, Gzip, Rate Limiting |
| **Giám sát Số liệu (Metrics)** | Prometheus v2.51.0, cAdvisor v0.49, Nginx Exporter | Thu thập chỉ số tài nguyên CPU, RAM, Network của container và ứng dụng |
| **Trực quan hóa (Dashboards)** | Grafana v10.4.0 | Dashboard theo dõi KPI thời gian thực, tự động nạp cấu hình (Provisioning) |
| **Quản lý Nhật ký (Logging)** | Grafana Loki v3.0, Promtail v3.0 | Gom log tập trung qua Docker Service Discovery, truy vấn nhanh với LogQL |
| **Bảo mật & Tường lửa** | OpenSSL, UFW, iptables | Chứng chỉ số SSL tự ký, Security Headers OWASP, Tường lửa chặn cổng |
| **Đóng gói & Điều phối** | Docker Engine, Docker Compose v2 | Đóng gói microservices, phân tách mạng 3 tầng, non-root user |

---

## 📂 3. CẤU TRÚC THƯ MỤC DỰ ÁN

```text
film/
├── app/                                    # Mã nguồn ứng dụng Web Đặt vé (Node.js)
│   ├── Dockerfile                          # Hardening: Tạo non-root appuser (UID 1001)
│   ├── package.json                        # Khai báo dependencies (express, mysql2, prom-client,...)
│   └── src/
│       ├── config/db.js                    # Kết nối MySQL Pool (ACID transactions)
│       ├── controllers/                    # Điều khiển nghiệp vụ (auth, movie, booking, admin)
│       ├── routes/                         # Định tuyến web & API (có endpoint test /trigger-error)
│       ├── views/                          # Giao diện EJS (index, detail, seat-selection, eticket, admin)
│       └── server.js                       # Entry point, prom-client metrics, middleware bảo mật
├── monitoring/                             # Hạ tầng Giám sát Metrics & Logging tập trung
│   ├── grafana/
│   │   ├── dashboards/
│   │   │   └── cinema_monitoring_dashboard.json  # Dashboard mẫu tự động import (KPIs, cAdvisor, Logs)
│   │   └── provisioning/
│   │       ├── dashboards/dashboards.yml   # Khai báo provider nạp dashboard tự động
│   │       └── datasources/datasources.yml # Tự động kết nối Prometheus (9090) & Loki (3100)
│   ├── loki/
│   │   └── loki-config.yaml                # Cấu hình máy chủ gom log Loki (TSDB + Filesystem)
│   ├── prometheus/
│   │   └── prometheus.yml                  # Scrape configs: webapp, cadvisor, nginx-exporter
│   └── promtail/
│       └── promtail-config.yaml            # Docker SD, relabeling job="nginx", job="webapp", job="db"
├── mysql/
│   └── init.sql                            # Kịch bản khởi tạo CSDL chuẩn 3NF & dữ liệu mẫu ban đầu
├── nginx/
│   ├── certs/                              # Chứng chỉ SSL tự ký (server.crt & server.key - ignored trên Git)
│   ├── generate_certs.py                   # Script tự động kiểm tra và sinh cặp chứng chỉ SSL
│   └── nginx.conf                          # Reverse Proxy, SSL, Gzip, Rate-limiting, OWASP Headers
├── scripts/
│   └── setup-firewall.sh                   # Script cấu hình tường lửa máy chủ sản xuất (UFW/iptables)
├── queries/
│   └── logql_queries.md                    # Danh sách các câu truy vấn LogQL chi tiết
├── .env.example                            # File biến môi trường mẫu (an toàn, không chứa mật khẩu thật)
├── .gitignore                              # Chặn commit .env, *.key, *.pem, certs, node_modules
├── docker-compose.yml                      # Điều phối toàn bộ 10 container với 3 mạng phân tách
├── RUN.bat                                 # Khởi chạy 1 chạm tự động trên Windows (Docker hoặc Node)
├── STOP.bat                                # Dừng hệ thống an toàn 1 chạm
└── README.md                               # Tài liệu hướng dẫn đồ án chính thức
```

---

## 🚀 4. HƯỚNG DẪN KHỞI CHẠY TỪNG BƯỚC (STEP-BY-STEP GUIDE)

### Bước 1: Tải mã nguồn về máy (Clone Repository)
```bash
git clone https://github.com/proyctk03-eng/KTHP-PTTKHT-De-11-Cinestar.git
cd KTHP-PTTKHT-De-11-Cinestar/film
```

---

### Bước 2: Khởi tạo tệp Biến môi trường (`.env`)
Sao chép từ file mẫu `.env.example`:
```bash
# Trên Linux / macOS
cp .env.example .env

# Trên Windows PowerShell
Copy-Item .env.example .env
```
> [!NOTE]
> Mọi mật khẩu và cổng kết nối nhạy cảm đều được quản lý tại file `.env` này. Docker Compose được cấu hình bắt buộc đọc từ `.env` để ngăn chặn lộ mật khẩu mặc định.

---

### Bước 3: Khởi tạo Cặp Chứng chỉ SSL Tự Ký (HTTPS)
Hệ thống yêu cầu chứng chỉ số `server.crt` và khóa riêng tư `server.key` nằm trong thư mục `nginx/certs/`:

* **Cách 1: Sử dụng Script Python tự động (Khuyên dùng)**:
  ```bash
  python nginx/generate_certs.py
  ```
* **Cách 2: Sử dụng lệnh OpenSSL CLI trực tiếp**:
  ```bash
  mkdir -p nginx/certs
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/certs/server.key \
    -out nginx/certs/server.crt \
    -subj "/C=VN/ST=ThaiNguyen/L=ThaiNguyenCity/O=ICTU/OU=K23/CN=localhost"
  ```

---

### Bước 4: Khởi chạy toàn bộ hệ thống bằng Docker Compose

* **Khởi chạy chính thức bằng Docker Compose CLI**:
  ```bash
  docker compose up -d --build
  ```
* **Kiểm tra trạng thái sẵn sàng của các container**:
  ```bash
  docker compose ps
  ```
  *(Toàn bộ 10 containers bao gồm `ticket_webapp`, `ticket_db`, `ticket_nginx`, `ticket_prometheus`, `ticket_grafana`, `ticket_loki`, `ticket_promtail`, `ticket_cadvisor`, `ticket_nginx_exporter`, `ticket_db_admin` đều ở trạng thái `running` hoặc `healthy`)*.

---

### 🌟 Khởi Động Nhanh "1-Chạm" Trên Windows (`RUN.bat`)
Nếu chạy trên môi trường máy chấm điểm của giảng viên:
* Chỉ cần **nhấp đúp chuột vào file `RUN.bat`**:
  * Tự động kiểm tra Docker Desktop; nếu có sẽ tự build và khởi động toàn bộ cụm container.
  * Tự động kích hoạt mở trình duyệt tại các địa chỉ: `https://localhost`, `http://localhost:3001` (Grafana), và `http://localhost:8080` (phpMyAdmin).
* **Dừng hệ thống**: Nhấp đúp chuột vào file `STOP.bat`.

---

## 🌐 5. DANH SÁCH CỔNG TRUY CẬP DỊCH VỤ & TÀI KHOẢN MẪU

### Bảng Tra Cứu Cổng Dịch Vụ:

| Dịch vụ | Địa chỉ URL | Cổng Host | Tài khoản truy cập | Mục đích sử dụng |
| :--- | :--- | :---: | :---: | :--- |
| **Website Đặt Vé (HTTPS)** | [https://localhost](https://localhost) | `443` | Xem bên dưới | Cổng vào chính thức qua Nginx (Bảo mật SSL, HSTS, CSP) |
| **Website Đặt Vé (HTTP)** | [http://localhost](http://localhost) | `80` | - | Nginx tự động chuyển hướng (Redirect 301) sang HTTPS |
| **Grafana Dashboard** | [http://localhost:3001](http://localhost:3001) | `3001` | `admin` / `Admin@123456` | Trực quan hóa Metrics thời gian thực & Truy vấn LogQL |
| **Prometheus UI** | [http://localhost:9090](http://localhost:9090) | `9090` | - | Kiểm tra Targets, số liệu cào từ cAdvisor và Web App |
| **phpMyAdmin Web GUI** | [http://localhost:8080](http://localhost:8080) | `8080` | `ticket_user` / `TicketSecurePass2024!` | Quản trị CSDL MySQL trực quan (hoặc qua `/pma/`) |
| **Loki Log Ingestion** | `http://localhost:3100` | `3100` | - | Cổng nhận log từ Promtail và phục vụ Grafana Explore |
| **Health Check API** | [https://localhost/health](https://localhost/health) | `443` | - | Kiểm tra sức khỏe ứng dụng & kết nối Database |
| **Prometheus Metrics** | [https://localhost/metrics](https://localhost/metrics) | `443` | - | Endpoint trích xuất chỉ số Node.js & Business KPIs |
| **Endpoint Test Lỗi** | [https://localhost/trigger-error](https://localhost/trigger-error) | `443` | - | Sinh lỗi giả lập 500 phục vụ kiểm chứng LogQL |

### 🔑 Danh Sách Tài Khoản Thử Nghiệm (Có sẵn nút bấm "1-Click" trên giao diện Đăng nhập):
1. **Tài khoản Quản Trị Viên (Admin)**:
   * **Email**: `admin@cinestar.vn` | **Mật khẩu**: `Admin@123456`
   * **Quyền hạn**: Truy cập Trang Quản trị (`/admin`), xem toàn bộ lịch sử đăng nhập (Login Audit Logs), quản lý danh sách người dùng, thống kê doanh thu vé.
2. **Tài khoản Khách Hàng (User)**:
   * **Email**: `tuandat@ictu.edu.vn` | **Mật khẩu**: `Dat@123456`
   * **Quyền hạn**: Chọn suất chiếu, đặt ghế ngồi, nhận vé điện tử E-Ticket kèm mã QR Code.

---

## 🔍 6. HƯỚNG DẪN KIỂM THỬ TRUY VẤN LOGQL (TIÊU CHÍ 5 ĐỀ CƯƠNG)

Hệ thống đã thiết lập sẵn luồng thu thập nhật ký với nhãn chuẩn: `job="nginx"`, `job="webapp"`, `job="db"`.

### Bước kiểm thử thực tế:
1. Mở trình duyệt vào Grafana Explore: **[http://localhost:3001/explore](http://localhost:3001/explore)** (chọn Datasource là **Loki**).
2. Kích hoạt sự kiện sinh lỗi giả lập bằng lệnh gọi endpoint test:
   ```bash
   curl -k -I https://localhost/trigger-error
   ```
   *(Nhận phản hồi ngay: `HTTP/2 500 Internal Server Error`)*.

### 📌 Các Câu Truy Vấn LogQL Mẫu:

* **Câu 1: Lọc mã lỗi HTTP 5xx từ Nginx Access Log**:
  ```logql
  {job="nginx"} |= "HTTP/1.1\" 5"
  ```
  *Kết quả*: Hiển thị dòng log Nginx ghi nhận request `/trigger-error` trả về HTTP Status `500`.

* **Câu 2: Lọc các dòng lỗi / Exception / Failed trong ứng dụng Web App**:
  ```logql
  {job="webapp"} |~ "(ERROR|Exception|Failed)"
  ```
  *Kết quả*: Hiển thị dòng thông báo lỗi màu đỏ từ Node.js container:  
  `[ERROR] Simulated Exception: Database transaction Failed during seat reservation!`

* **Câu 3: Theo dõi các giao dịch Đặt vé Thành công (Audit Log Nghiệp vụ)**:
  ```logql
  {job="webapp"} |= "BOOKING_SUCCESS"
  ```
  *Kết quả*: Trích xuất toàn bộ giao dịch đặt vé gồm Mã vé, Tên khách hàng, Tên phim, Danh sách ghế và Phương thức thanh toán.

* **Câu 4 (Truy vấn LogQL nâng cao): Đo tốc độ phát sinh log trên mỗi giây**:
  ```logql
  rate({job="webapp"}[1m])
  ```

---

## 🛡️ 7. TỔNG HỢP CÁC BIỆN PHÁP HARDENING ĐÃ ÁP DỤNG (BƯỚC 6)

1. **Nguyên tắc Đặc quyền tối thiểu (Least Privilege & Non-Root)**:
   - `film/app/Dockerfile` tạo group `appgroup` (GID 1001) và user `appuser` (UID 1001), chạy container dưới chỉ thị `USER appuser`.
   - Toàn bộ dịch vụ trong `docker-compose.yml` đều được áp dụng cờ bảo mật `security_opt: - no-new-privileges:true` chống leo thang đặc quyền.
2. **Phân tách mạng nội bộ 3 tầng (Multi-tier Network Segmentation)**:
   - `frontend_net`: Chỉ kết nối giữa `nginx` và `webapp` / `db-admin`.
   - `backend_net` (`internal: true`): Cô lập hoàn toàn cơ sở dữ liệu `db` khỏi mạng Internet và mạng bên ngoài (ngăn chặn rò rỉ dữ liệu trái phép).
   - `monitoring_net`: Kênh nội bộ riêng biệt cho Prometheus, Grafana, Loki, Promtail, cAdvisor.
3. **Quản lý biến môi trường & Triệt tiêu Hardcoded Password**:
   - Sử dụng cú pháp bắt buộc `${VAR:?Error}` trong `docker-compose.yml`, không lưu bất kỳ mật khẩu mặc định nào trong mã nguồn.
4. **Bảo vệ Bí mật & Chứng chỉ số trên Git**:
   - Tệp `.gitignore` chặn tuyệt đối việc theo dõi hoặc đẩy file `.env`, các chứng chỉ khóa riêng tư SSL/TLS (`*.key`, `*.pem`, `nginx/certs/`).
5. **Gia cố Nginx & Bộ Security Headers OWASP**:
   - Ẩn thông tin phiên bản Nginx: `server_tokens off;`.
   - Kích hoạt đầy đủ các header: `Strict-Transport-Security` (HSTS preload), `X-Frame-Options` (chống Clickjacking), `X-Content-Type-Options` (chống MIME-sniffing), `X-XSS-Protection`, `Referrer-Policy`, `Content-Security-Policy` (CSP), và `Permissions-Policy`.
6. **Kịch bản Tường lửa Máy chủ Sản xuất**:
   - Xây dựng script `scripts/setup-firewall.sh` hỗ trợ cả `UFW` và `iptables`: Thiết lập chính sách mặc định chặn toàn bộ Inbound, rate-limit cổng SSH 22, mở cổng Web 80/443 và cô lập các cổng quản trị (`3000`, `9090`, `3100`, `8080`, `3306`) chỉ cho phép truy cập từ `127.0.0.1`.

---

## 📦 8. LỘ TRÌNH 04 MỐC GIT COMMIT THEO CHUẨN ĐỀ CƯƠNG

* **Mốc 1 (Bước 1 -> Bước 3)**:
  ```bash
  git commit -m "feat(step1-3): initialize fullstack ticket booking app, mysql 3nf, phpmyadmin, and nginx reverse proxy with ssl"
  ```
* **Mốc 2 (Bước 4)**:
  ```bash
  git commit -m "feat(step4): integrate prometheus and grafana monitoring stack with cadvisor and nginx exporter"
  ```
* **Mốc 3 (Bước 5)**:
  ```bash
  git commit -m "feat(step5): implement centralized logging with loki, promtail and configure logql query pipelines"
  ```
* **Mốc 4 (Bước 6 - Nghiệm thu hoàn thiện)**:
  ```bash
  git commit -m "feat(step6): apply security hardening with non-root appuser, multi-tier network isolation, owasp headers, and firewall script"
  ```

---
*Bản quyền © 2024 - 2026 Nguyễn Tuấn Đạt (DTC245200452) - Học phần Triển khai & Quản trị Hệ thống Phần mềm K23 - ICTU.*
