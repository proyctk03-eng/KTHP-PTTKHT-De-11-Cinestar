@echo off
chcp 65001 >nul
title 🎬 CINESTAR K23 - KHOI DONG HE THONG DAT VE XEM PHIM & SU KIEN
color 0A

echo ===============================================================================
echo   🎬 HỆ THỐNG ĐẶT VÉ XEM PHIM ^& SỰ KIỆN TRỰC TUYẾN - K23 ICTU
echo   👤 Sinh viên: NGUYỄN TUẤN ĐẠT - MSV: DTC245200452
echo   📚 Môn: Triển khai và Quản trị Hệ thống Phần mềm
echo ===============================================================================
echo.

cd /d "%~dp0"

echo [1/3] Đang kiểm tra môi trường hệ thống trên máy này...

:: 1. Kiểm tra Docker
where docker >nul 2>nul
if %errorlevel% equ 0 (
    docker info >nul 2>nul
    if %errorlevel% equ 0 (
        echo [2/3] ✅ Phát hiện Docker Desktop đang hoạt động!
        echo       Đang tự động khởi chạy cụm dịch vụ qua Docker Compose...
        echo.
        docker compose up -d --build
        echo.
        echo [3/3] 🚀 Khởi chạy thành công toàn bộ hệ thống!
        echo       Đang tự động mở trình duyệt web...
        timeout /t 3 >nul
        start http://localhost
        start http://localhost:8080
        goto :show_docker_info
    )
)

:: 2. Nếu không có Docker, kiểm tra Node.js
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [2/3] ℹ️ Máy chưa bật Docker Desktop.
    echo       🚀 Tự động kích hoạt CHẾ ĐỘ CHẠY TRỰC TIẾP (Local Standalone Engine)...
    echo.
    if not exist "%~dp0app\node_modules" (
        echo Đang tự động cài đặt thư viện cần thiết...
        cd /d "%~dp0app"
        call npm install
        cd /d "%~dp0"
    )
    echo [3/3] Đang khởi chạy máy chủ Web...
    timeout /t 2 >nul
    start http://localhost:3000
    cd /d "%~dp0app"
    node src/server.js
    goto :end
)

:: 3. Nếu thiếu cả hai
color 0C
echo.
echo ===============================================================================
echo ❌ LỖI: Máy này chưa cài đặt Docker Desktop hoặc Node.js!
echo Để hệ thống hoạt động, bạn chỉ cần cài đặt 1 trong 2:
echo   1. Docker Desktop: https://www.docker.com/products/docker-desktop/ (Khuyến nghị)
echo   2. Hoặc Node.js LTS: https://nodejs.org/ (Chạy độc lập siêu nhẹ)
echo ===============================================================================
echo.
pause
goto :end

:show_docker_info
echo.
echo ===============================================================================
echo 🌟 HỆ THỐNG ĐÃ SẴN SÀNG HOẠT ĐỘNG:
echo   🌐 Website Đặt Vé:  http://localhost  hoặc  https://localhost
echo   🗄️ Quản trị Database (phpMyAdmin): http://localhost:8080 (hoặc /pma/)
echo   🩺 API Health Check: http://localhost/health
echo   📊 Prometheus Metrics: http://localhost/metrics
echo.
echo 💡 Để DỪNG toàn bộ hệ thống, bạn chỉ cần nhấp đúp file STOP.bat!
echo ===============================================================================
echo.
echo Nhấn phím bất kỳ để đóng cửa sổ này (Hệ thống vẫn tiếp tục chạy ngầm)...
pause >nul

:end
