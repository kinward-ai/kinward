@echo off
title Kinward — Starting Up
echo.
echo   Starting Kinward...
echo   ─────────────────────────────
echo.

:: Check if Ollama is running
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I "ollama.exe" >NUL
if %ERRORLEVEL% NEQ 0 (
    echo   [1/3] Starting Ollama...
    start /B "" ollama serve >NUL 2>&1
    timeout /t 3 /nobreak >NUL
) else (
    echo   [1/3] Ollama already running
)

:: Install deps if node_modules missing
if not exist "node_modules" (
    echo   [2/3] Installing dependencies...
    call npm install
    cd client && call npm install && cd ..
) else (
    echo   [2/3] Dependencies ready
)

:: Start the backend server in background, then the Vite dev server
echo   [3/3] Launching Kinward...
echo.

start /B "kinward-server" node server/index.js

:: Small pause for server to boot
timeout /t 2 /nobreak >NUL

:: Start Vite dev server (opens browser automatically)
cd client && npx vite --open
