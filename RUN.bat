@echo off
setlocal enabledelayedexpansion
title CINESTAR K23 - TRINH DIEU KHIEN VA KHOI CHAY HE THONG
cd /d "%~dp0"

:menu
cls
echo ======================================================================
echo   CINESTAR K23 - HE THONG DAT VE XEM PHIM VA SU KIEN TRUC TUYEN
echo   Hoc phan: Trien khai va Quan tri He thong Phan mem - K23 ICTU
echo   Sinh vien: Nguyen Tuan Dat - MSV: DTC245200452
echo ======================================================================
echo.
echo   [1] Khoi chay toan bo bang DOCKER COMPOSE (Khuyen dung - 10 Containers)
echo   [2] Khoi chay bang NODE.JS (Tu dong kiem tra va cai thu vien neu thieu)
echo   [3] KIEM TRA VA CAI DAT THU VIEN (Tu dong chay npm install cho Web App)
echo   [4] Kiem tra va Sinh lai Chung chi SSL tu ky (server.crt ^& server.key)
echo   [5] Dung toan bo he thong (Stop Docker ^& Node.js)
echo   [0] Thoat
echo.
echo ======================================================================
echo   (He thong se tu dong chon [1] sau 5 giay neu khong co thao tac)
choice /c 123450 /t 5 /d 1 /m "Vui long nhap lua chon cua ban [1, 2, 3, 4, 5, 0]: "
set choice_ret=%errorlevel%

if "%choice_ret%"=="6" goto opt_exit
if "%choice_ret%"=="5" goto opt_stop
if "%choice_ret%"=="4" goto opt_ssl
if "%choice_ret%"=="3" goto opt_install
if "%choice_ret%"=="2" goto opt_node
if "%choice_ret%"=="1" goto opt_docker
goto opt_docker

:: ========================================================
:: 1. KHOI CHAY BANG DOCKER COMPOSE
:: ========================================================
:opt_docker
cls
echo ======================================================================
echo   [1/3] DANG KIEM TRA DOCKER DESKTOP...
echo ======================================================================
where docker >nul 2>&1
if errorlevel 1 goto docker_not_found

docker info >nul 2>&1
if errorlevel 1 (
    echo [CANH BAO] Docker da cai dat nhung Docker Desktop chua duoc bat!
    echo Vui long mo phan mem Docker Desktop va doi 30 giay, sau do thu lai.
    echo.
    echo Ban co muon chuyen sang chay bang Node.js Engine khong?
    choice /c YN /m "Nhan Y de chay Node.js, N de quay ve Menu: "
    if errorlevel 2 goto menu
    goto opt_node
)

:: Kiem tra file .env
if not exist "%~dp0.env" (
    echo [INFO] Dang tao file .env tu .env.example...
    copy "%~dp0.env.example" "%~dp0.env" >nul
)

:: Kiem tra chung chi SSL
if not exist "%~dp0nginx\certs\server.crt" (
    echo [INFO] Chua co chung chi SSL, dang sinh tu dong...
    where python >nul 2>&1
    if not errorlevel 1 (
        python "%~dp0nginx\generate_certs.py"
    )
)

echo.
echo ======================================================================
echo   [2/3] DANG KHOI DONG TOAN BO DICH VU DOCKER COMPOSE...
echo ======================================================================
docker compose up -d --build

echo.
echo ======================================================================
echo   [3/3] DANG TU DONG MO TRINH DUYET WEB...
echo ======================================================================
ping 127.0.0.1 -n 4 >nul
start https://localhost
start http://localhost:3001
start http://localhost:8080

echo.
echo ======================================================================
echo   HE THONG DA SAN SANG HOAT DONG!
echo   * Website Dat Ve (HTTPS):    https://localhost
echo   * Website Dat Ve (HTTP):     http://localhost (Tu redirect sang HTTPS)
echo   * Grafana Dashboard:         http://localhost:3001 (User: admin / Admin@123456)
echo   * Prometheus Metrics UI:     http://localhost:9090
echo   * phpMyAdmin Database GUI:   http://localhost:8080
echo ======================================================================
echo.
pause
goto menu

:docker_not_found
echo.
echo [LOI] May tinh chua cai dat Docker Desktop!
echo Tu dong chuyen sang kiem tra va khoi chay bang Node.js...
ping 127.0.0.1 -n 3 >nul
goto opt_node

:: ========================================================
:: 2. KHOI CHAY BANG NODE.JS
:: ========================================================
:opt_node
cls
echo ======================================================================
echo   KHOI CHAY HE THONG BANG NODE.JS ENGINE
echo ======================================================================
where node >nul 2>&1
if errorlevel 1 goto node_missing

:: Tu dong kiem tra va cai thu vien neu thieu
if not exist "%~dp0app\node_modules" (
    echo.
    echo [THONG BAO] Chua tim thay thu muc thu vien 'app\node_modules'.
    echo           Dang tu dong chay 'npm install' de cai dat cac dependencies...
    echo.
    cd /d "%~dp0app"
    call npm.cmd install
    cd /d "%~dp0"
    echo.
    echo [THANH CONG] Da cai dat xong toan bo thu vien Node.js!
)

:: Kiem tra file .env
if not exist "%~dp0.env" (
    copy "%~dp0.env.example" "%~dp0.env" >nul
)

echo.
echo Dang mo trinh duyet tai http://localhost:3000 ...
ping 127.0.0.1 -n 2 >nul
start http://localhost:3000

echo.
echo ======================================================================
echo   DANG CHAY WEB SERVER TAI http://localhost:3000
echo   (Nhan Ctrl + C de dung may chu Web)
echo ======================================================================
cd /d "%~dp0app"
node src\server.js
pause
goto menu

:: ========================================================
:: 3. KIEM TRA VA CAI DAT THU VIEN (NPM INSTALL)
:: ========================================================
:opt_install
cls
echo ======================================================================
echo   KIEM TRA VA CAI DAT THU VIEN CHO WEB APPLICATION
echo ======================================================================
echo.

where node >nul 2>&1
if errorlevel 1 goto node_missing

where npm >nul 2>&1
if errorlevel 1 goto node_missing

echo [1/3] Kiem tra phien ban moi truong:
call node -v
call npm -v
echo.

echo [2/3] Kiem tra file cau hinh bien moi truong:
if not exist "%~dp0.env" (
    echo   -> Chua co file .env, dang khoi tao tu .env.example...
    copy "%~dp0.env.example" "%~dp0.env" >nul
    echo   [OK] Da tao file .env thanh cong!
) else (
    echo   [OK] File .env da ton tai hop le.
)
echo.

echo [3/3] Dang tien hanh cai dat thu vien qua npm install...
echo       (express, mysql2, ejs, prom-client, qrcode, bcryptjs,...)
echo.
cd /d "%~dp0app"
call npm.cmd install
cd /d "%~dp0"

echo.
echo ======================================================================
echo   [HOAN TAT] TOAN BO THU VIEN DA DUOC KIEM TRA VA CAI DAT SAN SANG!
echo ======================================================================
echo.
pause
goto menu

:: ========================================================
:: 4. SINH LAI CHUNG CHI SSL
:: ========================================================
:opt_ssl
cls
echo ======================================================================
echo   KIEM TRA VA SINH CAP CHUNG CHI SSL TU KY (HTTPS)
echo ======================================================================
echo.
where python >nul 2>&1
if not errorlevel 1 (
    python "%~dp0nginx\generate_certs.py"
) else (
    echo [THONG BAO] Khong tim thay Python, thu bang OpenSSL...
    where openssl >nul 2>&1
    if not errorlevel 1 (
        if not exist "%~dp0nginx\certs" mkdir "%~dp0nginx\certs"
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout "%~dp0nginx\certs\server.key" -out "%~dp0nginx\certs\server.crt" -subj "/C=VN/ST=ThaiNguyen/L=ThaiNguyen/O=ICTU/CN=localhost"
        echo [THANH CONG] Da sinh chung chi SSL bang OpenSSL!
    ) else (
        echo [CHUYEN TIEN] Chung chi SSL co san trong thu muc nginx\certs van hop le.
    )
)
echo.
pause
goto menu

:: ========================================================
:: 5. DUNG HE THONG
:: ========================================================
:opt_stop
cls
call "%~dp0STOP.bat"
goto menu

:: ========================================================
:: BAO LOI THIEU NODE
:: ========================================================
:node_missing
echo.
echo ======================================================================
echo [LOI] May tinh chua cai dat Node.js va npm!
echo Vui long cai dat Node.js LTS tu trang chu: https://nodejs.org/
echo (Sau khi cai dat xong, hay mo lai file RUN.bat nay)
echo ======================================================================
echo.
pause
goto menu

:opt_exit
exit /b 0
