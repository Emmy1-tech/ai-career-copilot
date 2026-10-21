@echo off
setlocal
title AI Career Copilot - Local Server

echo.
echo ==========================================
echo   AI Career Copilot - Local Setup
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed or is not on PATH.
  echo.
  echo Install Node.js 20 or newer from https://nodejs.org/en/download
  echo Then close this window, reopen it, and double-click this file again.
  echo.
  pause
  exit /b 1
)

for /f "tokens=1 delims=v" %%V in ('node -v') do set NODE_VERSION=%%V
echo Node.js is installed:
node -v
echo.

if not exist package.json (
  echo ERROR: package.json was not found.
  echo Make sure this file is inside the ai-career-copilot project folder.
  echo.
  pause
  exit /b 1
)

if not exist .env (
  if exist .env.example (
    copy .env.example .env >nul
    echo Created .env from .env.example.
    echo The Gemini API key is optional for starting the app, but required for live AI chat.
    echo.
  )
)

if not exist node_modules (
  echo Installing project dependencies. This can take a few minutes...
  call npm install
  if errorlevel 1 (
    echo.
    echo ERROR: Dependency installation failed. Copy the error shown above for troubleshooting.
    pause
    exit /b 1
  )
)

echo Starting AI Career Copilot...
echo When the server is ready, open http://localhost:1295 in your browser.
echo Keep this window open while using the app.
echo To stop the server, return here and press Ctrl+C.
echo.
call npm start
echo.
echo The server has stopped.
pause
