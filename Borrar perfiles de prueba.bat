@echo off
title Tinker - borrar perfiles de prueba
cd /d "%~dp0"
node --no-warnings demo\crear-perfiles-demo.js --borrar
pause
