@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -STA -File "%~dp0Safehouse.ps1"
if errorlevel 1 echo Backup stoppa. Ingen kontrollert kopi er lova.
pause
