@echo off
setlocal
title CINESTAR K23 - KIEM TRA VA CAI DAT THU VIEN WEB
cd /d "%~dp0"

echo ======================================================================
echo   CINESTAR K23 - TU DONG KIEM TRA VA CAI DAT THU VIEN WEB APPLICATION
echo   Sinh vien: Nguyen Tuan Dat - MSV: DTC245200452 - Lop K23 ICTU
echo ======================================================================
echo.

echo [1/3] Kiem tra moi truong Node.js va npm...
where node >nul 2>&1
if errorlevel 1 goto node_missing

where npm >nul 2>&1
if errorlevel 1 goto node_missing

echo       Node.js version:
call node -v
echo       npm version:
call npm -v
echo.

echo [2/3] Kiem tra file cau hinh bien moi truong (.env)...
if not exist "%~dp0.env" (
    echo       Chua co file .env, dang tu dong khoi tao tu .env.example...
    copy "%~dp0.env.example" "%~dp0.env" >nul
    echo       [OK] Da tao file .env!
) else (
    echo       [OK] File .env da co san.
)
echo.

echo [3/3] Dang tien hanh cai dat toan bo thu vien (npm install)...
echo       Vui long doi trong giay lat...
echo.

cd /d "%~dp0app"
call npm.cmd install
cd /d "%~dp0"

echo.
echo ======================================================================
echo   [HOAN TAT] DA KIEM TRA VA CAI DAT TOAN BO THU VIEN THANH CONG!
echo   Thu muc 'app\node_modules' da san sang de chay ung dung web.
echo ======================================================================
echo.
pause
exit /b 0

:node_missing
echo.
echo ======================================================================
echo [LOI] May tinh cua ban chua cai dat Node.js va npm!
echo Vui long truy cap https://nodejs.org/ de tai va cai dat Node.js LTS.
echo ======================================================================
echo.
pause
exit /b 1
