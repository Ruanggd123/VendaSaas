# ============================================
#  Nexus AI - Backup Automático (Agendável)
# ============================================

$Container = "saas_postgres"
$DbUser = "admin"
$DbName = "saas"
$BackupDir = Join-Path $PSScriptRoot "backups"
$KeepBackups = 30

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$Filename = "nexus_backup_$Timestamp.sql"
$FullPath = Join-Path $BackupDir $Filename

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Nexus AI - Backup Automatico" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$running = docker ps --format "{{.Names}}" | Select-String "^$Container$"
if (-not $running) {
    Write-Host "[ERRO] Container $Container nao esta rodando!" -ForegroundColor Red
    exit 1
}

Write-Host "[1/3] Criando backup do banco $DbName..." -ForegroundColor Yellow
docker exec $Container pg_dump -U $DbUser -d $DbName --no-owner --no-acl 2>$null | Out-File -FilePath $FullPath -Encoding utf8

if (!(Test-Path $FullPath) -or (Get-Item $FullPath).Length -eq 0) {
    Write-Host "[ERRO] Falha ao criar backup!" -ForegroundColor Red
    if (Test-Path $FullPath) { Remove-Item $FullPath }
    exit 1
}

$Size = [math]::Round((Get-Item $FullPath).Length / 1KB, 2)
Write-Host "[2/3] Backup salvo: $Filename ($Size KB)" -ForegroundColor Green

Write-Host "[3/3] Limpando backups antigos (mantendo ultimos $KeepBackups)..." -ForegroundColor Yellow
$AllBackups = Get-ChildItem -Path $BackupDir -Filter "nexus_backup_*.sql" | Sort-Object LastWriteTime -Descending
if ($AllBackups.Count -gt $KeepBackups) {
    $AllBackups | Select-Object -Skip $KeepBackups | ForEach-Object {
        Write-Host "   Removendo: $($_.Name)" -ForegroundColor DarkGray
        Remove-Item $_.FullName
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Backup concluido!" -ForegroundColor Green
Write-Host "  Total: $((Get-ChildItem -Path $BackupDir -Filter 'nexus_backup_*.sql').Count) backups" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
