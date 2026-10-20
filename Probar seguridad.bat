@echo off
title Tinker - pruebas
cd /d "%~dp0"
echo.
echo  Atacando una copia temporal de Tinker (tus datos no se tocan)...
echo.
node --test "tests/*.test.js"
pause
