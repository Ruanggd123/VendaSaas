@echo off
echo Construindo e iniciando containers Docker...
docker-compose build
docker-compose up -d
echo Containers iniciados com sucesso!
echo 
echo Para ver os logs, execute: docker-compose logs -f
echo Para parar os containers, execute: docker-compose down
pause
