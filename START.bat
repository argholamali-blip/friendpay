@echo off
title FriendPay - Local Server
color 0A

echo.
echo  =====================================
echo   FriendPay - Starting Local Servers
echo  =====================================
echo.

:: Open firewall ports
echo [1/3] Opening firewall ports...
netsh advfirewall firewall delete rule name="FriendPay Backend (3000)" >nul 2>&1
netsh advfirewall firewall delete rule name="FriendPay Frontend (5500)" >nul 2>&1
netsh advfirewall firewall add rule name="FriendPay Backend (3000)" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1
netsh advfirewall firewall add rule name="FriendPay Frontend (5500)" dir=in action=allow protocol=TCP localport=5500 >nul 2>&1
echo   Ports 3000 and 5500 opened.
echo.

:: Start backend
echo [2/3] Starting backend API (port 3000)...
start "FriendPay Backend" cmd /k "cd /d E:\FriendPay\FriendPay_Backend && node server.js"
timeout /t 3 /nobreak >nul
echo.

:: Start frontend
echo [3/3] Starting frontend (port 5500)...
start "FriendPay Frontend" cmd /k "node E:\FriendPay\serve-frontend.js"
timeout /t 2 /nobreak >nul
echo.

echo  =====================================
echo   READY!
echo  =====================================
echo.
echo   On this PC   : http://localhost:5500
echo   On your PHONE: http://192.168.100.136:5500
echo.
echo   Make sure your phone is on the same Wi-Fi!
echo   (VPN must be OFF on both devices)
echo.
pause
