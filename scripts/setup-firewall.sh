#!/usr/bin/env bash
# ========================================================
# KỊCH BẢN THIẾT LẬP TƯỜNG LỬA MÁY CHỦ SẢN XUẤT (FIREWALL HARDENING)
# ĐỀ TÀI: HỆ THỐNG ĐẶT VÉ XEM PHIM & SỰ KIỆN TRỰC TUYẾN
# SINH VIÊN: NGUYỄN TUẤN ĐẠT - MSV: DTC245200452
# HỌC PHẦN: TRIỂN KHAI VÀ QUẢN TRỊ HỆ THỐNG PHẦN MỀM K23 - ICTU
# ========================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}  THIẾT LẬP TƯỜNG LỬA BẢO VỆ MÁY CHỦ (UFW / IPTABLES HARDENING)       ${NC}"
echo -e "${BLUE}  Sinh viên: Nguyễn Tuấn Đạt - MSV: DTC245200452 - Lớp K23 ICTU       ${NC}"
echo -e "${BLUE}======================================================================${NC}"

# 1. Kiểm tra đặc quyền Root / Sudo
if [[ "${EUID}" -ne 0 ]]; then
    echo -e "${RED}[LỖI] Vui lòng chạy script này với quyền root hoặc sử dụng sudo!${NC}"
    echo "Ví dụ: sudo bash $0"
    exit 1
fi

# 2. Phát hiện công cụ tường lửa khả dụng (UFW hoặc iptables)
if command -v ufw >/dev/null 2>&1; then
    echo -e "\n${YELLOW}[+] Phát hiện tường lửa UFW (Uncomplicated Firewall). Đang tiến hành cấu hình...${NC}"

    # Đặt chính sách mặc định an toàn: Chặn toàn bộ Inbound, Cho phép Outbound
    echo -e "  -> Thiết lập chính sách mặc định: Deny Inbound, Allow Outbound..."
    ufw default deny incoming
    ufw default allow outgoing

    # Mở cổng SSH (22) với cơ chế Rate Limiting chống Brute-force
    echo -e "  -> Cho phép SSH (cổng 22) kèm Rate-limiting chống Brute-force..."
    ufw limit 22/tcp comment 'SSH Rate Limited'

    # Mở cổng dịch vụ Web công khai (HTTP 80 và HTTPS 443)
    echo -e "  -> Cho phép lưu lượng Web công khai (HTTP 80, HTTPS 443)..."
    ufw allow 80/tcp comment 'Nginx HTTP'
    ufw allow 443/tcp comment 'Nginx HTTPS'

    # Giới hạn các cổng giám sát & quản trị chỉ mở nội bộ (127.0.0.1 / Localhost)
    echo -e "  -> Giới hạn các cổng quản trị và giám sát chỉ mở cho Localhost (127.0.0.1)..."
    ufw allow from 127.0.0.1 to any port 3000 proto tcp comment 'Grafana Localhost Only'
    ufw allow from 127.0.0.1 to any port 9090 proto tcp comment 'Prometheus Localhost Only'
    ufw allow from 127.0.0.1 to any port 3100 proto tcp comment 'Loki Localhost Only'
    ufw allow from 127.0.0.1 to any port 8080 proto tcp comment 'phpMyAdmin Localhost Only'
    ufw allow from 127.0.0.1 to any port 3306 proto tcp comment 'MySQL Localhost Only'

    # Kích hoạt UFW
    echo -e "  -> Kích hoạt tường lửa UFW..."
    echo "y" | ufw enable
    ufw reload

    echo -e "\n${GREEN}[THÀNH CÔNG] Tường lửa UFW đã được thiết lập an toàn!${NC}"
    echo -e "${BLUE}Trạng thái hiện tại của UFW:${NC}"
    ufw status verbose

elif command -v iptables >/dev/null 2>&1; then
    echo -e "\n${YELLOW}[+] UFW không có sẵn, sử dụng trực tiếp iptables...${NC}"

    # Xóa các rules cũ
    iptables -F
    iptables -X

    # Thiết lập chính sách mặc định
    iptables -P INPUT DROP
    iptables -P FORWARD DROP
    iptables -P OUTPUT ACCEPT

    # Cho phép Loopback (localhost)
    iptables -A INPUT -i lo -j ACCEPT
    iptables -A OUTPUT -o lo -j ACCEPT

    # Cho phép các kết nối đã thiết lập từ trước (ESTABLISHED, RELATED)
    iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

    # Mở SSH có giới hạn tần suất
    iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --set
    iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --update --seconds 60 --hitcount 4 -j DROP
    iptables -A INPUT -p tcp --dport 22 -j ACCEPT

    # Mở Web HTTP và HTTPS
    iptables -A INPUT -p tcp --dport 80 -j ACCEPT
    iptables -A INPUT -p tcp --dport 443 -j ACCEPT

    echo -e "${GREEN}[THÀNH CÔNG] Đã thiết lập các quy tắc tường lửa bằng iptables!${NC}"
    iptables -L -v -n
else
    echo -e "${RED}[LỖI] Không tìm thấy UFW hoặc iptables trên hệ thống!${NC}"
    exit 1
fi

echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN}  HOÀN TẤT THIẾT LẬP TƯỜNG LỬA BẢO MẬT BƯỚC 6 (HARDENING)!             ${NC}"
echo -e "${GREEN}======================================================================${NC}"
