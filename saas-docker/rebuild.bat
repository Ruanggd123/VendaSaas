@echo off
echo ==============================================
echo Reconstruindo e reiniciando os containers...
echo ==============================================
docker compose build nextjs worker
docker compose up -d nextjs worker
echo ==============================================
echo Pronto! Servicos atualizados com sucesso.
echo ==============================================
pause
