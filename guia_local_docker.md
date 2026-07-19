# Guia: Como rodar a Infraestrutura SaaS no seu próprio Computador (Modo Local)

Você decidiu não alugar o servidor agora e transformar o seu próprio Windows na máquina de vendas. Isso é excelente para validar o modelo de negócios sem gastar 1 real.

## Passo 1: O Pré-Requisito (Docker Desktop)
Como o nosso sistema usa bancos de dados potentes (Postgres, Redis) e a Evolution API, você precisa do Docker.
1. Baixe o **Docker Desktop** para Windows: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
2. Instale dando "Avançar, Avançar e Concluir". (Ele pode pedir para você reiniciar o PC e ativar o WSL2, é o padrão do Windows).
3. Abra o programa Docker Desktop e deixe ele rodando minimizado perto do relógio.

## Passo 2: O Comando de Ligar a Fábrica
1. Vá na sua pasta `VendasSAAS` e entre na pasta `producao`.
2. Renomeie o arquivo `.env.producao` para `.env` (remova o ".producao" do final).
3. Clique na barra de endereço da pasta, digite `cmd` e dê Enter. A tela preta vai abrir na pasta certa.
4. Digite o comando mágico:
```bash
docker compose up -d
```
Ele vai baixar todos os "motores" e ligar a sua fábrica.

## Passo 3: Acessando o seu Sistema Local
Com o comando acima rodando, o seu computador virou o servidor. Você acessa tudo abrindo seu navegador de internet:
- **Painel do n8n:** `http://localhost:5678`
- **Evolution API:** `http://localhost:8080`

## Passo 4: O Workflow de Segurança (Comando Geral)
No seu n8n (`http://localhost:5678`), importe o nosso fluxo recém-atualizado: `workflows/05_roteamento_multi_cliente.json`.

**Como operar a sua Agência no Airtable agora:**
No seu Airtable (que chamamos de "Comando Geral"), você criará colunas específicas:
- `StatusPagamento` (Se você escrever LIGADO, a IA responde. Se escrever DESLIGADO, a IA bloqueia o cliente inadimplente automaticamente).
- `TabelaPrecos` (Escreva aqui: "Clareamento R$ 500").
- `FeriadosBloqueados` (Escreva aqui: "Dia 25/12 não abrimos").

Se o dentista te ligar e disser: *"Ruan, meu clareamento subiu para R$ 600"*, você só vai no seu Airtable, muda o texto para 600, e não precisa mexer em **absolutamente nenhuma linha de código**. O n8n vai "injetar" essa mudança à força no cérebro da IA no mesmo segundo!
