@echo off
echo Atualizando containers Docker...
docker-compose up -d --no-build
echo Containers atualizados com sucesso!
echo.
echo Para ver os logs, execute: docker-compose logs -f
echo Para parar os containers, execute: docker-compose down
timeout /t 5 >nul
