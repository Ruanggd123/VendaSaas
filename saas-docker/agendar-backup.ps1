# ============================================
#  Nexus AI - Agendar Backup Automático
#  Executa uma vez para criar tarefa no Task Scheduler
#  Backup diário às 03:00 da manhã
# ============================================

$TaskName = "NexusAI_DailyBackup"
$ScriptPath = Join-Path $PSScriptRoot "backup.ps1"

Write-Host ""
Write-Host "Configurando backup automático do banco de dados..." -ForegroundColor Cyan
Write-Host ""

# Verificar se já existe
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Tarefa '$TaskName' já existe. Atualizando..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Criar ação
$Action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`""

# Criar gatilho (todo dia às 03:00)
$Trigger = New-ScheduledTaskTrigger -Daily -At "03:00"

# Configurações
$Settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -DontStopOnIdleEnd `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries

# Registrar tarefa
Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description "Backup diário automático do banco de dados Nexus AI (PostgreSQL)" `
    -RunLevel Highest

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Backup automático configurado!" -ForegroundColor Green
Write-Host "  Tarefa: $TaskName" -ForegroundColor Green
Write-Host "  Horário: Todo dia às 03:00" -ForegroundColor Green
Write-Host "  Script: $ScriptPath" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Para testar agora: execute backup.ps1 manualmente" -ForegroundColor Yellow
Write-Host "Para ver no Taskscheduler: taskschd.msc" -ForegroundColor Yellow
Write-Host ""
