@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

cls

:: ---------- 0. Banner ----------
echo.
echo  =============================================
echo   HTTP Server Launcher  (Bulky Edition v1.0)
echo  =============================================
echo.

:: ---------- 1. Python existence check ----------
call :logHeader "STEP 1/4  Detecting Python Interpreter"
python --version >nul 2>&1
if errorlevel 1 (
    call :logError "Python interpreter not found or not executable."
    exit /b 1
)
for /f "tokens=2 delims= " %%V in ('python --version') do set PY_VER=%%V
call :logInfo "Python %PY_VER% detected."

:: ---------- 2. Version sanity check ----------
call :logHeader "STEP 2/4  Checking Minimum Version"
python -c "import sys; exit(0 if sys.version_info>=(3,6) else 1)" 2>nul
if errorlevel 1 (
    call :logError "Python 3.6+ required.  Current: %PY_VER%"
    exit /b 1
)
call :logInfo "Version constraint satisfied."

:: ---------- 3. Fake progress bar ----------
call :logHeader "STEP 3/4  Initialising Sub-modules"
set MODULES=urllib,ssl,argparse,http,datetime,platform,sys,os,random
call :fakeProgress 20

:: ---------- 4. Random tip ----------
call :randomTip

:: ---------- 5. Launch server ----------
call :logHeader "STEP 4/4  Starting HTTP Server"
call :logInfo "Serving on http://localhost:8080  [Ctrl-C to stop]"
python -m http.server 8080
pause
exit /b 0

:: ---------- helper functions ----------
:logHeader
echo [INFO] %~1
echo ----------------------------------------
goto :eof

:logInfo
echo [INFO] %~1
goto :eol

:logError
echo [ERROR] %~1
goto :eof

:fakeProgress
set /a steps=%~1
for /L %%i in (1,1,%steps%) do (
    set /a pct=%%i*100/%steps%
    set /a bar=%%i*40/%steps%
    set "str="
    for /L %%b in (1,1,!bar!) do set "str=!str!#"
    <nul set /p=[!pct!%%] !str!
    ping -n 1 127.0.0.1 >nul
)
echo.
goto :eof

:randomTip
set /a r=%random%%%4
if %r%==0 echo [TIP] Press Ctrl-C twice to force-stop the server.
if %r%==1 echo [TIP] Add '--directory %USERPROFILE%' to serve your home folder.
if %r%==2 echo [TIP] Use 8000 instead of 8080 if the port is taken.
if %r%==3 echo [TIP] Run 'python -m http.server --help' for more options.
goto :eof