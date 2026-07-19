Guia rápido de deploy (pelo celular)

1) Pré-requisitos
- Servidor/VM com Docker instalado (pode usar Oracle Free Tier). 
- Acesso SSH ao servidor (Termius, JuiceSSH).
- n8n (self-hosted), Ollama e Evolution API instalados.
- Conta Asaas com API Key.

2) Passos rápidos
- Conecte ao servidor via SSH.
- Clone o repositório e acesse a pasta do projeto.

```bash
# exemplo
git clone <repo-url>
cd VendasSAAS
```

- Suba o Ollama (ou verifique se já está):

```bash
# instalar ollama (exemplo)
# https://ollama.com/docs/installation
sudo apt install ollama
ollama pull llama3:8b
ollama server &
```

- Suba o n8n (docker-compose ou imagem):

```bash
# exemplo rapido
docker run -d --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

- Suba a Evolution API (siga README do subprojeto `evolution-api`).

- No n8n: importe o workflow `workflows/vendedor_autonomo_n8n.json` (Import from Clipboard). Substitua `SUA_SHEET_ID` e `SUA_INSTANCIA`.

- Crie credencial Asaas no n8n (HTTP Header com `access_token`).

3) Teste rápido
- Abra a planilha Google com aba `Memoria` e adicione uma linha com telefone em formato +55...
- No n8n, rode o trigger (ou aguarde o timer). Verifique logs do Ollama e Evolution.

4) Dicas
- Se usar Ollama local, garanta memória suficiente para `llama3:8b` (8GB+ ideal). Use `llama3:4b` se tiver menos memória.
- Configure alertas no fluxo para enviar uma mensagem ao seu número pessoal quando houver venda.

Se quiser, eu já crio variações do workflow com trigger por novo row no Sheets e com um nó de Timer para enviar a primeira abordagem automaticamente.
