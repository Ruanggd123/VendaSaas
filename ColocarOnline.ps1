Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Iniciando o VendasSAAS na Internet (Gratuito)" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verifica se o Docker está rodando
Write-Host "Verificando o Docker..." -ForegroundColor Yellow
$dockerStatus = docker info 2>&1
if ($dockerStatus -match "error during connect" -or $dockerStatus -match "failed to connect") {
    Write-Host "ERRO: O Docker Desktop nao esta rodando!" -ForegroundColor Red
    Write-Host "Por favor, abra o Docker Desktop no menu Iniciar do Windows e tente rodar este script novamente." -ForegroundColor Red
    Read-Host "Pressione ENTER para sair"
    exit
}
Write-Host "Docker esta rodando! OK.`n" -ForegroundColor Green

# 2. Sobe os containers (Site, Banco, WhatsApp)
Write-Host "Iniciando o sistema (Isso pode demorar um pouquinho na primeira vez)..." -ForegroundColor Yellow
Set-Location -Path ".\saas-docker"
docker-compose up -d --build
Write-Host "Sistema rodando localmente! OK.`n" -ForegroundColor Green

# 3. Baixa e roda o Cloudflare Tunnel
Set-Location -Path ".."
$cloudflaredPath = ".\cloudflared.exe"

if (-not (Test-Path $cloudflaredPath)) {
    Write-Host "Baixando o Cloudflare Tunnel para expor o site..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $cloudflaredPath
}

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Magenta
Write-Host "O SEU SITE ESTÁ INDO PARA O AR AGORA!" -ForegroundColor Magenta
Write-Host "Na tela preta abaixo, procure por um link parecido com:" -ForegroundColor White
Write-Host "https://palavras-aleatorias.trycloudflare.com" -ForegroundColor Green
Write-Host "Esse é o link oficial do seu site! Copie e mande para os clientes!" -ForegroundColor White
Write-Host "ATENCAO: Não feche esta janela, senao o site sai do ar." -ForegroundColor Red
Write-Host "==========================================================================" -ForegroundColor Magenta
Write-Host ""

# Inicia o túnel no Next.js (Porta 3000)
.\cloudflared.exe tunnel --url http://localhost:3000
