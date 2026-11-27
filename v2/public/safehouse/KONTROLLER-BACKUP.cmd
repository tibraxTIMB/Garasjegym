@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -STA -File "%~dp0Kontroller-Backup.ps1"
if errorlevel 1 echo Kontroll stoppa. Ikkje bruk kopien som verifisert.
pause
