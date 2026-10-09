@echo off
echo ========================================================
echo    SANFUN PARTY ARCADE (Spring Boot + React Engine)
echo ========================================================
cd /d "%~dp0frontend-react"
call npm run build
if %ERRORLEVEL% neq 0 (
    echo Frontend build failed!
    exit /b %ERRORLEVEL%
)
cd /d "%~dp0backend-spring"
call .\mvnw.cmd spring-boot:run
