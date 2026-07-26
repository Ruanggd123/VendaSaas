# Fluxos e automações do WhatsApp

> Para padrão de entrega, validações e commits, consulte `WORKFLOW_OPERACIONAL.md`.

Esta pasta guarda os backups dos fluxos do n8n e o guia de operação da automação de WhatsApp.

## Estrutura recomendada

- `workflows/00_template_fluxo_bot.json` (esqueleto de estrutura)
- `workflows/01_fluxo_prospeccao.json` (novo)
- `workflows/02_pos_venda.json` (novo)
- `workflows/05_roteamento_multi_cliente.json` (já usado no deploy)
- `workflows/prompt_vendedor_ollama.txt` (prompt da IA)

## Template de JSON do fluxo

Use `workflows/00_template_fluxo_bot.json` como ponto de partida para documentar e versionar o fluxo.
Ele organiza os blocos solicitados (`Fluxo Visual`, `Simulador`, `Regras`, `IA`, `Templates`, `Catálogo`, `Grupos`, `Limpar`, `JSON`, `Salvar`) com placeholders de rotas.

Dica: ao importar no n8n, substitua a parte de rota por nós nativos de `Switch`/`IF` e conecte credenciais reais no envio do WhatsApp.

## Fluxo do Bot (organizado)

Use essa ordem para manter o menu do bot limpo e previsível:

### 1) Núcleo do Bot
1. **Fluxo Visual**
   - Painel principal do funil de conversa.
   - Mapeie os caminhos `entrada -> decisão -> resposta` antes de programar qualquer mensagem.
2. **Simulador**
   - Ambiente de testes do fluxo sem impacto no cliente.
   - Útil para validar saídas de IA e regras.

### 2) Bloco de Inteligência
1. **Regras**
   - Condições e exceções (ex.: faixa de preço, horário comercial, lead fora do escopo).
2. **🤖 IA**
   - Motor de resposta e classificação de intenção.
   - Sempre versionar o prompt e registrar mudança de comportamento.

### 3) Bloco de Conteúdo
1. **Templates**
   - Mensagens padrão: boas-vindas, ausência, resposta de erro, follow-up.
2. **Catálogo**
   - Produtos, preços e benefícios consultivos.
3. **👥 Grupos**
   - Segmentação por cliente, nicho e campanha ativa.

### 4) Operação do Fluxo
1. **Limpar**
   - Use para resetar contexto quando iniciar uma nova conversa.
2. **+ Opção**
   - Botão para adicionar uma nova variação de menu sem quebrar o fluxo atual.
3. **JSON**
   - Exportação/importação manual do estado do fluxo.
4. **Salvar**
   - Persistir alterações e publicar versão atual.

## Menus recomendados para produção

- **Menus principais (mobile/desktop):**
  - Fluxo do Bot
  - Menus e automações do WhatsApp
  - Fluxo Visual
  - Simulador
  - Regras
  - IA
- **Sub-menus de operação:**
  - Templates
  - Catálogo
  - Grupos
  - Limpar

## Como implementar um fluxo novo no n8n

1. **Prospecção (Inbound/Outbound):**
   1. Webhook trigger do lead.
   2. HTTP Request para WhatsApp (via Evolution API).
   3. Registro no CRM (HubSpot, Airtable ou similar).
   4. Classificação com IA e marcação de prioridade.

2. **Pós-pagamento (Onboarding):**
   1. Webhook de confirmação (Asaas/Pix).
   2. Atualização do funil de lead para fechado/atendimento.
   3. Disparo da mensagem de boas-vindas e coleta de briefing.

## Como rodar o n8n

Na raiz do projeto, execute:

```bash
duplo-clique: iniciar-n8n.bat
```

Depois acesse `http://localhost:5678`, importe o fluxo e valide com uma mensagem de teste no WhatsApp.

## Dica de organização contínua

- Mantenha nomenclatura com padrão numérico (`01_...`, `02_...`) para facilitar ordem de leitura.
- Registre cada alteração de IA e regra em comentário do fluxo ou changelog.
- Sempre rode simulação em **Simulador** antes de clicar em **Salvar**.
