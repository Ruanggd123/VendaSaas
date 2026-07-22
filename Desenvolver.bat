@echo off
echo ========================================================
echo Iniciando o VendasSAAS no Modo DEV (Rapido e Ao Vivo!)
echo ========================================================

IF NOT EXIST "cloudflared.exe" (
    echo Baixando o Cloudflared para gerar o link do seu site...
    powershell.exe -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
)

echo 1. Iniciando o servidor de desenvolvimento (Hot Reload)...
cd saas-docker\nextjs
start "NextJS Dev - Nao feche!" cmd /c "npm install && npx next dev -p 3001"
cd ..\..

echo.
echo Aguarde 10 segundos enquanto o site prepara a primeira carga...
timeout /t 10

echo ==========================================================================
echo O SEU SITE COM ATUALIZACAO AO VIVO ESTA INDO PARA O AR AGORA!
echo Na tela preta abaixo, procure pelo link verde (https://...trycloudflare.com)
echo Toda vez que voce salvar o codigo no VSCode, ESSE link atualizara na hora!
echo ==========================================================================

cloudflared.exe tunnel --url http://localhost:3001
pause
