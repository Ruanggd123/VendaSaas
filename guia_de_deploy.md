# Guia de Deploy na Nuvem (Servidor 24/7)

Você tem em mãos todos os arquivos para montar a sua central de vendas (e de seus clientes) na nuvem. Siga este roteiro para subir tudo de forma segura.

## Passo 1: Contratar a VPS
1. Acesse a **Hetzner** ou **Hostinger** e alugue uma VPS (Virtual Private Server).
2. Escolha o sistema operacional **Ubuntu 22.04** ou superior.
3. Guarde o IP do servidor e a senha `root`.

## Passo 2: Preparar o Servidor
Você vai precisar de um terminal (como o PuTTY no Windows ou o próprio CMD) para acessar a máquina:
```bash
ssh root@SEU_IP_DO_SERVIDOR
```
Uma vez dentro do servidor, instale o Docker com apenas um comando mágico:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
```

## Passo 3: Subir os Arquivos
Você precisa enviar a pasta `producao` (que contém o `docker-compose.yml` e o `.env.producao`) do seu computador para o servidor. 
- Você pode usar um programa gratuito chamado **FileZilla** ou **WinSCP** (basta colocar o IP, `root` e a senha) e arrastar a pasta `producao` para lá.

## Passo 4: Ligar o Motor
No terminal do seu servidor (SSH), entre na pasta que você acabou de subir e altere o nome do arquivo `.env.producao` para apenas `.env`:
```bash
cd producao
mv .env.producao .env
```

Agora, o comando final para ligar o mundo:
```bash
docker compose up -d
```
Ele vai baixar o n8n, a Evolution API, o Banco de Dados e deixar rodando para sempre em segundo plano (`-d`).

## Passo 5: A Mágica do Multi-Cliente (O Segredo Comercial)
Com a máquina no ar, acesse o seu n8n (`http://SEU_IP:5678`), crie sua conta e importe o arquivo `workflows/05_roteamento_multi_cliente.json`.

**Como funciona a mágica?**
- Quando você fecha com o cliente "Clínica X", você vai na Evolution API e cria uma instância chamada `Clinica_X` conectando o WhatsApp do cliente pelo QR Code.
- No Airtable, você cria uma linha com o nome `Clinica_X` e o Prompt da IA exato para ele ("Você é a secretária da Clínica X...").
- Quando um paciente manda mensagem no WhatsApp da Clínica, a Evolution manda pro n8n avisando que a mensagem veio da Instância `Clinica_X`. 
- O n8n vai no Airtable, busca o prompt daquela clínica exata, manda para o ChatGPT e responde pro paciente.

**Tudo isso usando 1 única máquina n8n e 1 único fluxo!** Isso significa lucro líquido em escala.
