@echo off
REM EVOLVE Web Build Lab - double-click to run locally on http://localhost:8765
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8765/
  node server.js 8765
  goto :eof
)
where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8765/
  python -m http.server 8765
  goto :eof
)
echo Neither Node.js nor Python was found.
echo Install one of them, or just double-click index.html (it also works without a server).
pause
