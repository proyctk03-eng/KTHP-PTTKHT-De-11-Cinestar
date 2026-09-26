@echo off
chcp 65001 >nul
title 🛑 CINESTAR K23 - DUNG HE THONG
color 0E

echo ===============================================================================
echo   🛑 ĐANG DỪNG HỆ THỐNG ĐẶT VÉ XEM PHIM ^& SỰ KIỆN...
echo ===============================================================================
echo.

cd /d "%~dp0"

:: 1. Dừng container Docker nếu đang chạy
where docker >nul 2>nul
if %errorlevel% equ 0 (
    echo Đang dừng và gỡ các container Docker...
    docker compose down
)

:: 2. Dừng tiến trình Node nếu đang chạy cục bộ
taskkill /f /im node.exe >nul 2>nul

echo.
echo ✅ ĐÃ DỪNG TOÀN BỘ DỊCH VỤ THÀNH CÔNG!
echo ===============================================================================
timeout /t 3 >nul
