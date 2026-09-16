# Sanfun Party Couch Co-op 1-Click Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       SANFUN COUCH CO-OP PARTY PLATFORM               " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

Set-Location $PSScriptRoot

Write-Host "Building latest frontend bundle..." -ForegroundColor Green
Set-Location "$PSScriptRoot/frontend"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend build failed!"
    exit $LASTEXITCODE
}

Set-Location $PSScriptRoot
Write-Host "Starting Unified Party Server with Cloudflare Tunnel & LAN..." -ForegroundColor Green
& "$PSScriptRoot/backend/venv/Scripts/python.exe" "$PSScriptRoot/run_party.py"
