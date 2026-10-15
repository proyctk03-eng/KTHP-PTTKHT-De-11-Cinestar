#!/usr/bin/env bash
# ========================================================
# 1-CLICK LAUNCHER FOR LINUX / MACOS
# ĐỀ TÀI: HỆ THỐNG ĐẶT VÉ XEM PHIM & SỰ KIỆN TRỰC TUYẾN
# SINH VIÊN: NGUYỄN TUẤN ĐẠT - MSV: DTC245200452 - K23 ICTU
# ========================================================

set -e
cd "$(dirname "$0")"

show_menu() {
    clear
    echo "=================================================================="
    echo "🎬 CINESTAR K23 - HỆ THỐNG ĐẶT VÉ XEM PHIM & SỰ KIỆN TRỰC TUYẾN"
    echo "👤 Sinh viên: Nguyễn Tuấn Đạt | MSV: DTC245200452 | Lớp: K23 ICTU"
    echo "=================================================================="
    echo ""
    echo "  [1] Khởi chạy toàn bộ bằng DOCKER COMPOSE (Khuyên dùng - 10 Containers)"
    echo "  [2] Khởi chạy bằng NODE.JS (Tự động kiểm tra và cài thư viện nếu thiếu)"
    echo "  [3] KIỂM TRA & CÀI ĐẶT THƯ VIỆN (Tự động chạy npm install cho Web App)"
    echo "  [4] Dừng toàn bộ hệ thống (Docker & Node.js)"
    echo "  [0] Thoát"
    echo ""
    echo "=================================================================="
    read -r -t 5 -p "Vui lòng nhập lựa chọn [1-4, 0] (Tự động chọn [1] sau 5s): " choice || choice=1
    echo ""
    case "$choice" in
        2) run_node ;;
        3) install_deps ;;
        4) stop_all ;;
        0) exit 0 ;;
        *) run_docker ;;
    esac
}

run_docker() {
    echo "🚀 [1/3] Kiểm tra Docker Engine..."
    if command -v docker &> /dev/null && docker info &> /dev/null; then
        echo "✅ Phát hiện Docker Desktop đang hoạt động!"
        
        # Kiểm tra file .env
        if [ ! -f ".env" ]; then
            echo "ℹ️ Đang tạo file .env từ .env.example..."
            cp .env.example .env
        fi
        
        # Kiểm tra chứng chỉ SSL
        if [ ! -f "nginx/certs/server.crt" ]; then
            echo "ℹ️ Đang tạo chứng chỉ SSL tự ký..."
            if command -v python3 &> /dev/null; then
                python3 nginx/generate_certs.py
            fi
        fi

        echo "🚀 [2/3] Đang khởi chạy 10 containers qua Docker Compose..."
        docker compose up -d --build

        echo "🌐 [3/3] Đang mở trình duyệt..."
        sleep 3
        if command -v xdg-open &> /dev/null; then
            xdg-open https://localhost &
            xdg-open http://localhost:3001 &
        elif command -v open &> /dev/null; then
            open https://localhost &
            open http://localhost:3001 &
        fi
        echo ""
        echo "=================================================================="
        echo "  HỆ THỐNG ĐÃ SẴN SÀNG!"
        echo "  * Website: https://localhost (hoặc http://localhost)"
        echo "  * Grafana: http://localhost:3001 (User: admin / Admin@123456)"
        echo "  * Prometheus: http://localhost:9090"
        echo "  * phpMyAdmin: http://localhost:8080"
        echo "=================================================================="
    else
        echo "⚠️ Không tìm thấy Docker đang chạy! Tự động chuyển sang chế độ Node.js..."
        sleep 2
        run_node
    fi
}

run_node() {
    echo "ℹ️ Khởi động chế độ Node.js độc lập..."
    if ! command -v node &> /dev/null; then
        echo "❌ Máy chưa cài đặt Node.js! Vui lòng cài đặt từ https://nodejs.org/"
        exit 1
    fi

    # Tự động kiểm tra và cài thư viện nếu thiếu
    if [ ! -d "app/node_modules" ]; then
        echo "📦 Chưa tìm thấy thư viện node_modules. Đang tự động chạy npm install..."
        cd app && npm install && cd ..
        echo "✅ Đã cài đặt xong thư viện Node.js!"
    fi

    if [ ! -f ".env" ]; then
        cp .env.example .env
    fi

    echo "🌐 Đang mở trình duyệt tại http://localhost:3000 ..."
    sleep 2
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:3000 &
    elif command -v open &> /dev/null; then
        open http://localhost:3000 &
    fi

    cd app && node src/server.js
}

install_deps() {
    echo "📦 Đang kiểm tra và cài đặt thư viện Node.js cho Web App..."
    if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
        echo "❌ Chưa cài đặt Node.js hoặc npm! Vui lòng cài đặt từ https://nodejs.org/"
        exit 1
    fi

    echo "Node.js: $(node -v) | npm: $(npm -v)"
    if [ ! -f ".env" ]; then
        cp .env.example .env
        echo "✅ Đã tạo file .env từ .env.example"
    fi

    cd app && npm install && cd ..
    echo ""
    echo "=================================================================="
    echo "✅ HOÀN TẤT CÀI ĐẶT THƯ VIỆN THÀNH CÔNG!"
    echo "=================================================================="
}

stop_all() {
    echo "🛑 Đang dừng toàn bộ dịch vụ..."
    if command -v docker &> /dev/null; then
        docker compose down
    fi
    pkill -f "node src/server.js" 2>/dev/null || true
    echo "✅ Đã dừng toàn bộ hệ thống!"
}

show_menu
