@echo off
REM ============================================
REM  Nexus AI - Restaurar Backup
REM  ATENCAO: Isso SUBSTITUI todos os dados!
REM ============================================

set CONTAINER=saas_postgres
set DB_USER=admin
set DB_NAME=saas
set BACKUP_DIR=%~dp0backups

echo.
echo ========================================
echo   Nexus AI - Restaurar Backup
echo ========================================
echo.
echo   ATENCAO: Todos os dados serao substituidos!
echo.

echo Backups disponiveis:
echo ─────────────────────
set COUNT=0
for %%F in ("%BACKUP_DIR%\nexus_backup_*.sql") do (
    set /a COUNT+=1
    echo   %%~nxF
)
echo.

if %COUNT%==0 (
    echo [ERRO] Nenhum backup encontrado!
    pause
    exit /b 1
)

set /p FILENAME="Digite o nome do arquivo: "
set FULLPATH=%BACKUP_DIR%\%FILENAME%

if not exist "%FULLPATH%" (
    echo [ERRO] Arquivo nao encontrado!
    pause
    exit /b 1
)

echo.
echo Restaurando: %FILENAME%
echo.

docker exec -i %CONTAINER% psql -U %DB_USER% -d %DB_NAME% -q < "%FULLPATH%"

if errorlevel 1 (
    echo [ERRO] Falha ao restaurar!
) else (
    echo.
    echo ========================================
    echo   Backup restaurado com sucesso!
    echo ========================================
)
echo.
pause
