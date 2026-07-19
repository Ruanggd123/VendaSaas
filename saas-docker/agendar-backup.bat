@echo off
REM ============================================
REM  Nexus AI - Agendar Backup Automatico
REM  EXECUTE COMO ADMINISTRADOR
REM ============================================

echo.
echo ========================================
echo   Configurando backup automatico...
echo ========================================
echo.

schtasks /create /tn "NexusAI_DailyBackup" /tr "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%~dp0backup.ps1\"" /sc daily /st 03:00 /rl highest /f

if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao criar tarefa!
    echo Execute este arquivo como ADMINISTRADOR
    echo (botao direito ^> Executar como administrador)
) else (
    echo.
    echo ========================================
    echo   Backup automatico configurado!
    echo   Tarefa: NexusAI_DailyBackup
    echo   Horario: Todo dia as 03:00
    echo ========================================
)
echo.
pause
