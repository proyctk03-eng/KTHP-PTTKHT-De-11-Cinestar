@echo off
setlocal
title CINESTAR K23 - DUNG HE THONG
cd /d "%~dp0"

echo ======================================================================
echo   DANG DUNG HE THONG CINESTAR K23...
echo ======================================================================
echo.

where docker >nul 2>&1
if not errorlevel 1 (
    echo Dang dung cac container Docker...
    docker compose down
)

echo Dang dung tien trinh Node.js...
taskkill /f /im node.exe >nul 2>&1

echo.
echo ======================================================================
echo   DA DUNG TOAN BO HE THONG THANH CONG!
echo ======================================================================
ping 127.0.0.1 -n 3 >nul
