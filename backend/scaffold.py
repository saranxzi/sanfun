import os
import sys

def write_file(path: str, content: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Wrote {path}")

# ==========================================
# Deployment & Packaging Files
# ==========================================
write_file("../Dockerfile", """# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Backend + Static Assets
FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

WORKDIR /app/backend

ENV HOST=0.0.0.0
ENV PORT=8000
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
""")

write_file("../docker-compose.yml", """version: '3.8'

services:
  sanfun-party:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: sanfun_party_server
    ports:
      - "8000:8000"
    environment:
      - HOST_LAN_IP=${HOST_LAN_IP:-}
      - PUBLIC_TUNNEL_URL=${PUBLIC_TUNNEL_URL:-}
    restart: unless-stopped

  # Optional Cloudflare Tunnel for remote friends over the internet without port forwarding
  # Run with: docker compose --profile tunnel up
  tunnel:
    image: cloudflare/cloudflared:latest
    container_name: sanfun_party_tunnel
    restart: unless-stopped
    command: tunnel --url http://sanfun-party:8000
    profiles:
      - tunnel
    depends_on:
      - sanfun-party
""")

write_file("../start_party.bat", """@echo off
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
echo Starting Unified Party Server on port 8000...
echo Both WebSocket API and Web Client will be hosted on:
echo http://localhost:8000?party=host
echo.

cd backend
start "Sanfun Party Server" .\\\\venv\\\\Scripts\\\\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
cd ..

timeout /t 2 >nul
start http://localhost:8000?party=host

echo.
echo [READY] Server is live! Look at the browser window on your Big Screen.
echo Friends can join on their phones on your local Wi-Fi!
pause
""")

write_file("../start_party.ps1", """# Sanfun Party Couch Co-op 1-Click Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       SANFUN COUCH CO-OP PARTY PLATFORM               " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "Building latest frontend bundle..." -ForegroundColor Green
Set-Location "$PSScriptRoot/frontend"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend build failed!"
    exit $LASTEXITCODE
}

Write-Host "Starting Unified Party Server on port 8000..." -ForegroundColor Green
Set-Location "$PSScriptRoot/backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

Start-Sleep -Seconds 2
Start-Process "http://localhost:8000?party=host"

Write-Host "[READY] Party Lounge opened on Big Screen!" -ForegroundColor Cyan
""")

print("Deployment files written successfully.")
sys.exit(0)

