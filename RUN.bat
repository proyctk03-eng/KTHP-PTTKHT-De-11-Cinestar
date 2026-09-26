@echo off
setlocal
title CINESTAR K23 - HE THONG DAT VE XEM PHIM VA SU KIEN
cd /d "%~dp0"

echo ======================================================================
echo   CINESTAR K23 - HE THONG DAT VE XEM PHIM VA SU KIEN
echo   Sinh vien: Nguyen Tuan Dat - MSV: DTC245200452
echo   Mon: Trien khai va Quan tri He thong Phan mem
echo ======================================================================
echo.

echo [1/2] Dang kiem tra moi truong he thong...

where docker >nul 2>&1
if errorlevel 1 goto check_node

docker info >nul 2>&1
if errorlevel 1 goto check_node

goto run_docker

:check_node
where node >nul 2>&1
if errorlevel 1 goto missing_all
goto run_node

:run_docker
echo [1/2] Phat hien Docker Desktop dang hoat dong!
echo       Dang khoi dong he thong bang Docker Compose...
docker compose up -d --build
echo.
echo [2/2] Dang tu dong mo trinh duyet web...
ping 127.0.0.1 -n 4 >nul
start http://localhost
start http://localhost:3001
start http://localhost:8080
echo.
echo ======================================================================
echo   He thong da san sang hoat dong!
echo   Website Dat Ve:      http://localhost  (hoac https://localhost)
echo   Grafana Dashboard:   http://localhost:3001  (User: admin / Admin@123456)
echo   Prometheus UI:       http://localhost:9090
echo   phpMyAdmin Database: http://localhost:8080
echo ======================================================================
echo.
pause
exit /b 0

:run_node
echo [1/2] May chua bat Docker Desktop.
echo       Tu dong chay bang Node.js Engine (Kem Database In-Memory)...
echo.
if not exist "%~dp0app\node_modules" (
    echo Dang cai dat thu vien npm...
    cd /d "%~dp0app"
    call npm.cmd install
    cd /d "%~dp0"
)
echo [2/2] Dang mo trinh duyet web tai http://localhost:3000 ...
start http://localhost:3000
cd /d "%~dp0app"
node src\server.js
exit /b 0

:missing_all
echo.
echo ======================================================================
echo LOI: May tinh chua cai dat Docker Desktop hoac Node.js!
echo Vui long cai dat 1 trong 2:
echo   1. Docker Desktop: https://www.docker.com/products/docker-desktop/
echo   2. Node.js LTS:    https://nodejs.org/
echo ======================================================================
echo.
pause
exit /b 1
