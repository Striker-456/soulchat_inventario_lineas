@echo off
rem Inicia la API (.NET) y el frontend (Vite) en dos ventanas y abre el navegador.
rem Uso: doble clic en este archivo, o "iniciar.bat" desde la raiz del proyecto.
rem Si la API o el frontend ya estan corriendo, no arranca otra copia.
rem Para detener todo, cierra las ventanas "SoulChat API" y "SoulChat Frontend".
setlocal
cd /d "%~dp0"

where dotnet >nul 2>nul || (echo No se encontro dotnet. Instala el SDK de .NET 10. & pause & exit /b 1)
where npm >nul 2>nul || (echo No se encontro npm. Instala Node.js. & pause & exit /b 1)

if not exist "frontend\node_modules" (
  echo Instalando dependencias del frontend, esto solo pasa la primera vez...
  pushd frontend
  call npm install
  popd
)

call :puerto_en_uso 5095 && (
  echo [API] Ya hay algo escuchando en el puerto 5095: se reutiliza, no se inicia otra.
) || (
  rem Release evita el bloqueo que a veces aplica Windows a los binarios Debug recien compilados.
  echo [API] Iniciando en http://localhost:5095 ...
  start "SoulChat API" cmd /k dotnet run --project backend\SoulChat.Api -c Release
)

call :puerto_en_uso 5173 && (
  echo [WEB] Ya hay algo escuchando en el puerto 5173: se reutiliza, no se inicia otro.
) || (
  echo [WEB] Iniciando en http://localhost:5173 ...
  start "SoulChat Frontend" /d "%~dp0frontend" cmd /k npm run dev
)

if not defined SOULCHAT_NO_BROWSER (
  echo Abriendo el navegador en unos segundos...
  timeout /t 12 /nobreak >nul
  start "" http://localhost:5173
)

echo.
echo Listo. Frontend: http://localhost:5173  ^|  API/Swagger: http://localhost:5095/swagger
echo La primera vez la API tarda un poco porque compila.
endlocal
exit /b 0

:puerto_en_uso
netstat -ano | findstr /R /C:":%1 .*LISTENING" >nul
exit /b %errorlevel%
