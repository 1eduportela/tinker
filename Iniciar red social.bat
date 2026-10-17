@echo off
title Tinker
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  No tienes Node.js instalado.
  echo  Se va a abrir la web: descarga la version LTS, instalala y vuelve a abrir este archivo.
  echo.
  start https://nodejs.org
  pause
  exit /b
)
node --no-warnings server.js
pause
