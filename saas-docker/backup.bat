@echo off
REM ============================================
REM  Nexus AI - Backup do Banco de Dados
REM ============================================

set CONTAINER=saas_postgres
set DB_USER=admin
set DB_NAME=saas
set BACKUP_DIR=%~dp0backups
set TIMESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%
set FILENAME=nexus_backup_%TIMESTAMP%.sql

echo.
echo ========================================
echo   Nexus AI - Backup do Banco de Dados
echo ========================================
echo.

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

docker ps --format "{{.Names}}" | findstr /I "%CONTAINER%" >nul
if errorlevel 1 (
    echo [ERRO] Container %CONTAINER% nao esta rodando!
    pause
    exit /b 1
)

echo [1/3] Criando backup do banco %DB_NAME%...
docker exec %CONTAINER% pg_dump -U %DB_USER% -d %DB_NAME% --no-owner --no-acl > "%BACKUP_DIR%\%FILENAME%"

if errorlevel 1 (
    echo [ERRO] Falha ao criar backup!
    pause
    exit /b 1
)

for %%A in ("%BACKUP_DIR%\%FILENAME%") do set SIZE=%%~zA
set /a SIZE_KB=%SIZE% / 1024
echo [2/3] Backup salvo: %FILENAME% (%SIZE_KB% KB)

echo [3/3] Limpando backups antigos (mantendo ultimos 30)...
cd /d "%BACKUP_DIR%"
for /f "skip=30 tokens=*" %%F in ('dir /b /o-d nexus_backup_*.sql 2^>nul') do (
    echo   Removendo: %%F
    del "%%F"
)
cd /d "%~dp0"

echo.
echo ========================================
echo   Backup concluido!
echo   Local: %BACKUP_DIR%\%FILENAME%
echo ========================================
echo.
pause
