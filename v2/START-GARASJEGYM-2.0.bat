@echo off
setlocal
cd /d "%~dp0"
title GarasjeGym 2.0 - STURMKOPF

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 eller nyare manglar.
  echo Installer Node.js LTS fra https://nodejs.org/
  pause
  exit /b 1
)

if not exist ".env.local" (
  copy ".env.example" ".env.local" >nul
  echo.
  echo Oppretta v2\.env.local.
  echo Fyll inn testprosjektet sin Supabase URL og publishable key.
  notepad ".env.local"
  echo.
  echo Lagre fila og start denne BAT-fila pa nytt.
  pause
  exit /b 0
)

if not exist "node_modules" (
  echo Installerer pakkar forste gong ...
  call npm install
  if errorlevel 1 (
    echo npm install feila.
    pause
    exit /b 1
  )
)

echo.
echo GarasjeGym 2.0 startar pa http://localhost:5173/Garasjegym/
echo Lat dette vindauget sta ope medan du testar.
start "" cmd /c "timeout /t 3 >nul & start http://localhost:5173/Garasjegym/"
call npm run dev -- --host 0.0.0.0
pause
