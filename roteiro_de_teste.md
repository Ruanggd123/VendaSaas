# Roteiro de Teste: Vendedor IA no n8n

Você tem o motor do **Vendedor IA** pronto. Aqui está como subir e testar tudo em menos de 2 horas.

## Passo 1: Importar o Fluxo
1. Dê um duplo-clique no seu arquivo `iniciar-n8n.bat` para abrir o n8n.
2. Na tela inicial do n8n, vá em **Workflows** -> **Add Workflow**.
3. No canto superior direito, clique em **...** -> **Import from File**.
4. Selecione o arquivo que acabei de criar: `workflows/04_vendedor_ia_completo.json`.

## Passo 2: Configurar Credenciais
Você verá vários "Nós" (Nodes) na tela. 
1. **Airtable**: Dê um duplo-clique nos nós do Airtable e insira seu Personal Access Token (gratuito no Airtable). Crie uma base chamada "Leads" com as colunas: Telefone, Status.
2. **OpenAI**: Dê um duplo-clique nos nós da OpenAI e coloque sua chave de API (a mesma que geramos do Google Gemini ou OpenAI que você colocou no `.env`).
3. **Asaas**: No nó de HTTP Request do Asaas, coloque sua chave API (Access Token) gerada na sua conta Asaas.

## Passo 3: O Teste Final (Postman ou Webhook Test)
Não precisa plugar o WhatsApp ainda! Vamos testar a inteligência primeiro:
1. Copie o URL de Teste (Test URL) do primeiro nó (Webhook).
2. Use uma ferramenta como Postman ou o próprio navegador para mandar um POST com este formato JSON:
```json
{
  "data": {
    "from": "5511999999999",
    "text": {
      "message": "Oi, quero saber sobre o site para minha clínica."
    }
  }
}
```
3. Clique em "Execute Workflow" no n8n.
4. Veja a mágica: O n8n vai criar o cliente no Airtable, a IA vai pensar na resposta usando SPIN Selling, a IA Extratora vai perceber que não é hora do pagamento ainda (pronto_para_pagamento: false) e a mensagem final sairá perfeitamente estruturada!

Quando o cliente finalmente disser "Pode mandar o link de pagamento", a IA Extratora vai gerar `pronto_para_pagamento: true`, o Switch do n8n desviará a rota, o Asaas vai criar um link real de cobrança de R$ 2.900,00 e devolver pro cliente!
