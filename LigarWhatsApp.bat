@echo off
echo =======================================================
echo Iniciando o Servidor Backend (Evolution API e Banco)
echo =======================================================

echo Verificando se o Docker esta aberto...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo =======================================================
    echo ERRO: O Docker Desktop nao esta aberto!
    echo =======================================================
    echo Por favor, abra o "Docker Desktop" e espere o icone ficar verde.
    pause
    exit /b
)

cd saas-docker

echo Ligando o Banco de Dados, Redis, Evolution API e Worker...
docker-compose up -d postgres redis evolution worker

echo Aguardando os servicos iniciarem...
timeout /t 5

cd ..
echo =======================================================
echo Conectando ao Ngrok para liberar o acesso ao Vercel
echo =======================================================

echo.
echo ======================================================================
echo SEU NGROK ESTA INICIANDO!
echo Copie o link "Forwarding" gerado (https://...) e coloque 
echo na variavel EVOLUTION_URL la no painel do Vercel.
echo ======================================================================
echo.

ngrok http 8080

echo.
echo ======================================================================
echo O NGROK FECHOU OU DEU ERRO.
echo ======================================================================
pause