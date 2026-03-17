@echo off
setlocal enabledelayedexpansion
title Kinward — Starting Up
echo.
echo   ╔═══════════════════════════════════╗
echo   ║     KINWARD — Family AI Setup     ║
echo   ╚═══════════════════════════════════╝
echo.

:: ──────────────────────────────────────
:: STEP 1: Check for Node.js
:: ──────────────────────────────────────
where node >NUL 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [1/4] Node.js not found.
    echo.
    echo         Kinward needs Node.js to run.
    echo.
    choice /C YN /M "         Install Node.js automatically? (Y/N)"
    if !ERRORLEVEL! EQU 1 (
        echo.
        echo         Installing Node.js via winget...
        echo         (This may take a minute)
        echo.
        winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements -h
        if !ERRORLEVEL! NEQ 0 (
            echo.
            echo   [!] Automatic install failed.
            echo       Please install Node.js manually from: https://nodejs.org
            echo       Then run start.bat again.
            echo.
            pause
            exit /b 1
        )
        echo.
        echo         Node.js installed! You may need to close and reopen
        echo         this window for the PATH to update.
        echo.
        :: Refresh PATH in current session
        for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "SYSPATH=%%b"
        for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USRPATH=%%b"
        set "PATH=!SYSPATH!;!USRPATH!"
        :: Verify node is now available
        where node >NUL 2>&1
        if !ERRORLEVEL! NEQ 0 (
            echo   [!] Node.js was installed but isn't in PATH yet.
            echo       Please close this window and run start.bat again.
            echo.
            pause
            exit /b 1
        )
    ) else (
        echo.
        echo       To install manually, visit: https://nodejs.org
        echo       Then run start.bat again.
        echo.
        pause
        exit /b 1
    )
) else (
    for /f "tokens=*" %%v in ('node -v') do set NODEVER=%%v
    echo   [1/4] Node.js !NODEVER! found
)

:: ──────────────────────────────────────
:: STEP 2: Check for Ollama
:: ──────────────────────────────────────
where ollama >NUL 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [2/4] Ollama not found.
    echo.
    echo         Kinward uses Ollama to run AI models locally.
    echo.
    choice /C YN /M "         Install Ollama automatically? (Y/N)"
    if !ERRORLEVEL! EQU 1 (
        echo.
        echo         Installing Ollama via winget...
        echo         (This may take a minute)
        echo.
        winget install Ollama.Ollama --accept-source-agreements --accept-package-agreements -h
        if !ERRORLEVEL! NEQ 0 (
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
        :: Refresh PATH
        for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "SYSPATH=%%b"
        for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USRPATH=%%b"
        set "PATH=!SYSPATH!;!USRPATH!"
    ) else (
        echo.
        echo       To install manually, visit: https://ollama.com
        echo       Then run start.bat again.
        echo.
        pause
        exit /b 1
    )
) else (
    echo   [2/4] Ollama found
)

:: ──────────────────────────────────────
:: STEP 2b: Make sure Ollama is running
:: ──────────────────────────────────────
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I "ollama.exe" >NUL
if %ERRORLEVEL% NEQ 0 (
    echo          Starting Ollama...
    start /B "" ollama serve >NUL 2>&1
    timeout /t 3 /nobreak >NUL
) else (
    echo          Ollama is running
)

:: ──────────────────────────────────────
:: STEP 3: Install dependencies
:: ──────────────────────────────────────
if not exist "node_modules" (
    echo   [3/4] Installing dependencies (first run, may take a minute)...
    call npm install --loglevel=error 2>"%TEMP%\kinward-npm-err.log"
    if !ERRORLEVEL! NEQ 0 (
        :: Check if it's a node-gyp / native build failure
        findstr /I "node-gyp gyp ERR MSBuild" "%TEMP%\kinward-npm-err.log" >NUL 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo.
            echo   [!] A native module failed to build (better-sqlite3).
            echo       This usually means build tools are missing.
            echo.
            choice /C YN /M "         Install Windows Build Tools automatically? (Y/N)"
            if !ERRORLEVEL! EQU 1 (
                echo.
                echo         Installing Visual Studio Build Tools via winget...
                echo         (This may take several minutes)
                echo.
                winget install Microsoft.VisualStudio.2022.BuildTools --override "--quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended" --accept-source-agreements --accept-package-agreements -h
                echo.
                echo         Build tools installed! Retrying npm install...
                echo.
                rmdir /S /Q node_modules 2>NUL
                call npm install --loglevel=error
                if !ERRORLEVEL! NEQ 0 (
                    echo.
                    echo   [!] npm install still failed. Please check the errors above.
                    echo       You may need to close and reopen this window, then try again.
                    echo.
                    pause
                    exit /b 1
                )
            ) else (
                echo.
                echo       To install manually:
                echo         1. Install Visual Studio Build Tools from https://visualstudio.microsoft.com/visual-cpp-build-tools/
                echo         2. Select "Desktop development with C++" workload
                echo         3. Run start.bat again
                echo.
                pause
                exit /b 1
            )
        ) else (
            echo.
            echo   [!] npm install failed. Check your network connection and try again.
            echo.
            type "%TEMP%\kinward-npm-err.log"
            echo.
            pause
            exit /b 1
        )
    )
    cd client && call npm install --loglevel=error && cd ..
) else (
    echo   [3/4] Dependencies ready
)

:: ──────────────────────────────────────
:: STEP 4: Launch Kinward
:: ──────────────────────────────────────
echo   [4/4] Launching Kinward...
echo.
echo   ─────────────────────────────────────
echo     Kinward is starting up!
echo     The browser will open automatically.
echo     Close this window to stop the server.
echo   ─────────────────────────────────────
echo.

start /B "kinward-server" node server/index.js

:: Small pause for server to boot
timeout /t 2 /nobreak >NUL

:: Start Vite dev server (opens browser automatically)
cd client && npx vite --open
