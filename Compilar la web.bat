@echo off
title Tinker - compilar la web
cd /d "%~dp0"
echo.
echo  Solo hace falta si has cambiado algo dentro de la carpeta "web".
echo  Genera de nuevo la carpeta "public", que es lo que ve el navegador.
echo.
where npm >nul 2>nul
if errorlevel 1 (
  echo  No encuentro npm. Viene con Node.js: instalalo desde https://nodejs.org
  pause
  exit /b
)
if not exist node_modules call npm install --no-audit --no-fund
call npm run build
echo.
echo  Listo. Recarga Tinker en el navegador con Ctrl+F5.
pause
