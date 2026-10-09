# Sanfun Party Couch Co-op Spring Boot + React 1-Click Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   SANFUN PARTY ARCADE (Spring Boot + React Engine)     " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

Set-Location $PSScriptRoot

Write-Host "Building latest React frontend..." -ForegroundColor Green
Set-Location "$PSScriptRoot/frontend-react"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend build failed!"
    exit $LASTEXITCODE
}

Set-Location "$PSScriptRoot/backend-spring"
Write-Host "Starting Spring Boot Party Engine on port 8000..." -ForegroundColor Green
& ".\mvnw.cmd" spring-boot:run
