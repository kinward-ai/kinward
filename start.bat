@echo off
setlocal enabledelayedexpansion
title Kinward - Starting Up
echo.
echo   =====================================
echo        KINWARD - Family AI Setup
echo   =====================================
echo.

:: ---- STEP 1: Check for Node.js ----
where node >NUL 2>&1
if ERRORLEVEL 1 goto :NO_NODE
for /f "tokens=*" %%v in ('node -v') do set NODEVER=%%v
echo   [1/4] Node.js %NODEVER% found
goto :CHECK_OLLAMA

:NO_NODE
echo   [1/4] Node.js not found.
echo.
echo         Kinward needs Node.js to run.
echo.
set /p INSTALL_NODE="         Install Node.js automatically? (Y/N): "
if /I "%INSTALL_NODE%"=="Y" goto :INSTALL_NODE
echo.
echo       To install manually, visit: https://nodejs.org
echo       Then run start.bat again.
echo.
pause
exit /b 1

:INSTALL_NODE
echo.
echo         Installing Node.js via winget...
echo         (This may take a minute)
echo.
winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements -h
if ERRORLEVEL 1 (
    echo.
    echo   [!] Automatic install failed.
    echo       Please install Node.js manually from: https://nodejs.org
    echo       Then run start.bat again.
    echo.
    pause
    exit /b 1
)
echo.
echo         Node.js installed!
echo         Please close this window and run start.bat again
echo         so the PATH updates.
echo.
pause
exit /b 0

:: ---- STEP 2: Check for Ollama ----
:CHECK_OLLAMA
where ollama >NUL 2>&1
if ERRORLEVEL 1 goto :NO_OLLAMA
echo   [2/4] Ollama found
goto :START_OLLAMA

:NO_OLLAMA
echo   [2/4] Ollama not found.
echo.
echo         Kinward uses Ollama to run AI models locally.
echo.
set /p INSTALL_OLLAMA="         Install Ollama automatically? (Y/N): "
if /I "%INSTALL_OLLAMA%"=="Y" goto :INSTALL_OLLAMA
echo.
echo       To install manually, visit: https://ollama.com
echo       Then run start.bat again.
echo.
pause
exit /b 1

:INSTALL_OLLAMA
echo.
echo         Installing Ollama via winget...
echo         (This may take a minute)
echo.
winget install Ollama.Ollama --accept-source-agreements --accept-package-agreements -h
if ERRORLEVEL 1 (
    echo.
    echo   [!] Automatic install failed.
    echo       Please install Ollama manually from: https://ollama.com
    echo       Then run start.bat again.
    echo.
    pause
    exit /b 1
)
echo.
echo         Ollama installed!
echo.

:: ---- STEP 2b: Make sure Ollama is running ----
:START_OLLAMA
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I "ollama.exe" >NUL
if ERRORLEVEL 1 (
    echo          Starting Ollama...
    start /B "" ollama serve >NUL 2>&1
    timeout /t 3 /nobreak >NUL
) else (
    echo          Ollama is running
)

:: ---- STEP 3: Install dependencies ----
if not exist "node_modules" (
    echo   [3/4] Installing dependencies (first run, may take a minute^)...
    call npm install --loglevel=error
    if ERRORLEVEL 1 goto :NPM_FAILED
    cd client && call npm install --loglevel=error && cd ..
    if ERRORLEVEL 1 goto :NPM_FAILED
) else (
    echo   [3/4] Dependencies ready
)
goto :LAUNCH

:NPM_FAILED
echo.
echo   [!] npm install failed.
echo.
echo       This might mean build tools are missing.
echo       Try: winget install Microsoft.VisualStudio.2022.BuildTools
echo       Then run start.bat again.
echo.
echo       If the problem persists, check your internet connection.
echo.
pause
exit /b 1

:: ---- STEP 4: Launch ----
:LAUNCH
echo   [4/4] Launching Kinward...
echo.
echo   -------------------------------------
echo     Kinward is starting up!
echo     The browser will open automatically.
echo     Close this window to stop the server.
echo   -------------------------------------
echo.

start /B "kinward-server" node server/index.js

:: Small pause for server to boot
timeout /t 2 /nobreak >NUL

:: Start Vite dev server (opens browser automatically)
cd client && npx vite --open
