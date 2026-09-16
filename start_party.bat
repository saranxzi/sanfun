@echo off
title Sanfun Party - Couch Co-Op Server
echo ========================================================
echo       SANFUN COUCH CO-OP PARTY PLATFORM
echo ========================================================
echo.
echo Building latest frontend bundle...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo Starting Unified Party Server with Cloudflare Tunnel & LAN...
backend\venv\Scripts\python.exe run_party.py
pause
