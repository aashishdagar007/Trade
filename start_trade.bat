@echo off
:: =============================================================================
:: TradePro Launcher - Automatically sets up and starts backend then frontend
:: =============================================================================
:: Save this as start_trade.bat in D:\AASHISH\Projects\trade\
:: =============================================================================

:: Enable delayed expansion for variable manipulation inside loops
setlocal EnableDelayedExpansion

:: Set project root to the directory containing this batch file
set "PROJECT_DIR=%~dp0"
:: Remove trailing backslash
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

echo.
echo =============================================================================
echo TradePro Launcher
echo Project Directory: %PROJECT_DIR%
echo =============================================================================
echo.

:: =============================================================================
:: Step 1: Check and setup Backend (Python virtual environment)
:: =============================================================================
echo [1/4] Checking Backend environment...
set "BACKEND_DIR=%PROJECT_DIR%\backend"
set "VENV_DIR=%BACKEND_DIR%\venv"
set "REQUIREMENTS=%BACKEND_DIR%\requirements.txt"
set "VENV_ACTIVATE=%VENV_DIR%\Scripts\activate.bat"

if not exist "%VENV_DIR%" (
    echo Creating Python virtual environment...
    python -m venv "%VENV_DIR%"
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment. Ensure Python is installed and in PATH.
        pause
        exit /b 1
    )
) else (
    echo Virtual environment already exists.
)

:: Install/upgrade pip and install requirements if needed
echo Checking if requirements need installation...
if not exist "%VENV_DIR%\Lib\site-packages\fastapi" (
    echo Installing backend requirements...
    call "%VENV_ACTIVATE%"
    pip install --upgrade pip
    pip install -r "%REQUIREMENTS%"
    if errorlevel 1 (
        echo ERROR: Failed to install backend requirements.
        pause
        exit /b 1
    )
    echo Backend requirements installed.
) else (
    echo Backend requirements already satisfied.
)

:: =============================================================================
:: Step 2: Check and setup Frontend (Node.js dependencies)
:: =============================================================================
echo.
echo [2/4] Checking Frontend environment...
set "FRONTEND_DIR=%PROJECT_DIR%\frontend"
set "PACKAGE_JSON=%FRONTEND_DIR%\package.json"
set "NODE_MODULES=%FRONTEND_DIR%\node_modules"

if not exist "%NODE_MODULES%" (
    echo Installing frontend dependencies...
    cd /d "%FRONTEND_DIR%"
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install frontend dependencies. Ensure Node.js and npm are installed.
        pause
        exit /b 1
    )
    echo Frontend dependencies installed.
) else (
    echo Frontend dependencies already satisfied.
)

:: =============================================================================
:: Step 3: Start Backend Server
:: =============================================================================
echo.
echo [3/4] Starting Backend server...
cd /d "%BACKEND_DIR%"

:: Start backend in a new window so we can see its output
start "TradePro Backend" cmd /k "
    call "%VENV_ACTIVATE%"
    echo Backend server starting...
    uvicorn main:app --reload --port 8000
"

:: Wait for backend to be ready (polling health endpoint)
echo Waiting for backend to be ready...
set "BACKEND_READY=0"
set /a ATTEMPTS=0
:set MAX_ATTEMPTS=30   :: 30 attempts * 2 seconds = 60 seconds timeout
:wait_loop
if !ATTEMPTS! geq %MAX_ATTEMPTS% (
    echo.
    echo ERROR: Backend did not become ready within 60 seconds.
    echo Please check the backend window for errors.
    pause
    exit /b 1
)

:: Try to fetch the docs endpoint (or any endpoint) to see if server is up
powershell -Command "& { try { $response = Invoke-WebRequest -Uri http://localhost:8000/docs -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 } }"
if !errorlevel! equ 0 (
    set /a ATTEMPTS+=1
    echo Attempt !ATTEMPTS!/%MAX_ATTEMPTS%: Backend not ready yet... waiting 2 seconds
    timeout /t 2 >nul
    goto wait_loop
) else (
    set "BACKEND_READY=1"
    echo.
    echo Backend is ready! (http://localhost:8000)
)

:: =============================================================================
:: Step 4: Start Frontend Server
:: =============================================================================
echo.
echo [4/4] Starting Frontend server...
cd /d "%FRONTEND_DIR%"

:: Start frontend in a new window
start "TradePro Frontend" cmd /k "
    echo Frontend server starting...
    npm run dev
"

echo.
echo =============================================================================
echo Launch complete!
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173 (should open automatically or open manually)
echo.
echo NOTE: 
echo - The backend and frontend are running in separate command windows.
echo - To stop them, close those windows or press Ctrl+C in each.
echo - The default strategy (RSI Mean Reversion) is pre-selected in the UI.
echo   Simply click "Deploy Strategy" to activate it.
echo =============================================================================
echo.

:: Keep this window open so user can see the logs (optional)
pause
endlocal