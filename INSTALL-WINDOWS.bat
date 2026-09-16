@echo off
chcp 65001 >nul
setlocal
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js n'est pas installé.
  echo Installe Node.js LTS puis relance ce fichier.
  pause
  exit /b 1
)
echo Installation des dependances...
npm install
if errorlevel 1 goto error
echo.
echo Construction de PRICE FINDER...
npm run dist:win
if errorlevel 1 goto error
echo.
echo Termine ! Le programme d'installation se trouve dans le dossier release.
pause
exit /b 0
:error
echo.
echo Une erreur est survenue. Verifie le message ci-dessus.
pause
exit /b 1
