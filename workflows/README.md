# Fluxos do n8n para a Máquina de Vendas

Nesta pasta, você guardará os backups dos seus fluxos do n8n.
Como você rodará o n8n localmente, você poderá criar os fluxos visualmente de forma muito mais fácil.

## O que você deve criar no n8n:

### 1. Fluxo de Prospecção (Inbound/Outbound)
**Nós (Nodes) sugeridos:**
1. **Webhook (Trigger):** Para receber os leads do seu site (se houver). Ou um nó de "Read/Write File" se for importar o CSV que o nosso Scraper gera.
2. **HTTP Request:** Para conectar com a API do WhatsApp (WATI ou Evolution API) e enviar a primeira mensagem fria ou de boas-vindas.
3. **HubSpot (Action):** Para criar o Contato e o Negócio (Deal) na fase de "Prospecção" do seu pipeline.
4. **OpenAI:** Para ler a resposta do cliente no WhatsApp e dizer se ele é um "Lead Quente" ou "Lead Frio".

### 2. Fluxo de Pós-Pagamento (Onboarding)
**Nós (Nodes) sugeridos:**
1. **Webhook (Trigger):** Configure o link deste webhook lá no Asaas. Quando o cliente pagar, o Asaas avisa o n8n.
2. **HubSpot:** Move o card do cliente para a coluna "Fechado / Ganhos".
3. **HTTP Request (WhatsApp):** Envia uma mensagem para o cliente: *"Pagamento recebido! Para começarmos, por favor preencha este formulário de briefing: [Link do Tally.so]"*

---

**Como rodar o n8n agora mesmo?**
Basta ir na pasta principal do projeto (`VendasSAAS`) e dar um duplo-clique no arquivo `iniciar-n8n.bat`. Ele fará o download e abrirá o orquestrador no seu navegador na porta 5678.
