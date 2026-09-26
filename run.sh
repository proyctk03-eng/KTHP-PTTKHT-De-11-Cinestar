#!/bin/bash
# ========================================================
# 1-CLICK LAUNCHER FOR LINUX / MACOS
# ĐỀ TÀI 11 - NGUYỄN TUẤN ĐẠT - DTC245200452
# ========================================================

cd "$(dirname "$0")"

echo "=================================================================="
echo "🎬 HỆ THỐNG ĐẶT VÉ XEM PHIM & SỰ KIỆN - K23 ICTU"
echo "👤 Sinh viên: Nguyễn Tuấn Đạt | MSV: DTC245200452"
echo "=================================================================="

if command -v docker &> /dev/null && docker info &> /dev/null; then
    echo "✅ Phát hiện Docker đang chạy. Khởi động qua Docker Compose..."
    docker compose up -d --build
    echo "🚀 Hệ thống đã sẵn sàng!"
    echo "Website: http://localhost hoặc https://localhost"
    echo "phpMyAdmin: http://localhost:8080"
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost
    elif command -v open &> /dev/null; then
        open http://localhost
    fi
elif command -v node &> /dev/null; then
    echo "ℹ️ Khởi động chế độ Local Standalone..."
    if [ ! -d "app/node_modules" ]; then
        cd app && npm install && cd ..
    fi
    if command -v xdg-open &> /dev/null; then
        sleep 2 && xdg-open http://localhost:3000 &
    elif command -v open &> /dev/null; then
        sleep 2 && open http://localhost:3000 &
    fi
    cd app && node src/server.js
else
    echo "❌ Vui lòng cài đặt Docker hoặc Node.js để chạy hệ thống!"
fi
