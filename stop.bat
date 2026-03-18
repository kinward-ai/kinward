@echo off
echo.
echo   Stopping Kinward...
echo   =====================================
echo.

taskkill /F /FI "WINDOWTITLE eq kinward-server" >NUL 2>&1
taskkill /F /FI "WINDOWTITLE eq Kinward*" >NUL 2>&1

:: Kill node processes running kinward files
for /f "tokens=2" %%p in ('wmic process where "CommandLine like '%%server/index.js%%'" get ProcessId /value 2^>NUL ^| find "="') do (
    taskkill /F /PID %%p >NUL 2>&1
)
for /f "tokens=2" %%p in ('wmic process where "CommandLine like '%%vite%%'" get ProcessId /value 2^>NUL ^| find "="') do (
    taskkill /F /PID %%p >NUL 2>&1
)

echo   Kinward has been stopped.
echo   To restart, double-click start.bat
echo.
pause
