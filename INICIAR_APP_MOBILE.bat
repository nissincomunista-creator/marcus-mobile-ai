@echo off
title Marcus Assessoria - Mobile AI
cd /d "%~dp0"

echo ====================================================================
echo   MARCUS ASSESSORIA IMOBILIARIA - SERVIDOR MOBILE & VOZ
echo ====================================================================
echo.
echo Iniciando servidor para celular e comandos por voz...
echo.

node dist/server.cjs
pause
