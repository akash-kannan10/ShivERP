@echo off
echo ===================================================
echo   ShivERP Auto-Sync to GitHub Started
echo   Checking for changes every 30 seconds...
echo ===================================================

:loop
for /f "delims=" %%i in ('git status --porcelain') do set changes=%%i

if defined changes (
    echo [!time!] Changes detected. Syncing to GitHub...
    git add .
    git commit -m "Auto-update: Syncing local changes"
    git push
    echo [!time!] Sync complete!
    set changes=
)

timeout /t 30 /nobreak > nul
goto loop
