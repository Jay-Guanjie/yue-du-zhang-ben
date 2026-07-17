@echo off
title 月度账本 - 2026
cd /d "%~dp0"
echo ============================
echo   月度账本 - 启动中...
echo ============================
echo.
echo 本地模式：http://localhost:3456
echo.
node server.js
pause
