# Plano de Verificação & Validação — Chatbot Nexus (IA / Misto / Regras)

**Status**: Em andamento
**Data**: 04/08/2026

---

## Etapa 1 — Correção dos 7 bugs críticos (bloqueia testes válidos)

| # | Bug | Arquivo | Severidade |
|---|-----|---------|------------|
| 1 | `module_*` e `payment_*` descartados pelo `ALLOWED_KEYS` | `api/settings/whatsapp/route.ts` | Crítico |
| 2 | PIX sem chave Asaas cai silenciosamente em link de cartão | `rulesBot.ts:2597` | Crítico |
| 3 | `verificar_status_pagamento` não acha vendas do rulesBot (lookup sem variantes 55) | `tools.ts:676` | Crítico |
| 4 | Fake CPF gerado para Asaas (LGPD) | `rulesBot.ts:2671` | Crítico |
| 5 | Sem confirmação antes de cobrar em produto virtual | `rulesBot.ts:2527+` | Crítico |
| 6 | Regras-only sem chave IA vaza aviso de configuração | `engine.ts:158-162` | Crítico |
| 7 | Estado rulesBot nunca expira no banco | `rulesBot.ts:307` | Crítico |

## Etapa 2 — Infraestrutura de testes

- [ ] Instalar vitest + @playwright/test
- [ ] Scripts: `test`, `test:watch`, `test:coverage`, `test:e2e`
- [ ] Guarda `NODE_ENV=test` + tenant sandbox `[TESTE-SANDBOX]`
- [ ] Mocks Evolution API + Asaas
- [ ] Fixtures: settings, catálogos, flows JSON, scripts de conversa
- [ ] CI GitHub Actions: Postgres+pgvector

## Etapa 3 — Suíte unitária (Vitest)

### rulesBot
- [ ] `resolveChoiceIndex` expandido (números, texto, preço, parcial)
- [ ] Dispatch dos 7 actionTypes (catalog, scheduling, human, collect_data, product, checkout, text/submenu)
- [ ] Máquina de estados completa (18 steps)
- [ ] Timeout 30min → main_menu
- [ ] 3 erros consecutivos → handoff humano
- [ ] Menu de boas-vindas (`---LIST---`/`---BUTTONS---`)
- [ ] Variáveis `{var}` substituição
- [ ] Finalização pedido: PIX/cartão/presencial/cobrança pendente/48h

### guardian
- [ ] validator: campos obrigatórios, valores inválidos
- [ ] sanitizeInput: anti-jailbreak, truncamento 350
- [ ] validateOutput: redação de segredos, blacklist
- [ ] Rate limit: 5 msgs/10s

### tools
- [ ] 8 AI tools: validação params + efeitos DB
- [ ] 6 admin tools: validação params + efeitos DB

### engine
- [ ] Roteamento ia/regras/hibrido
- [ ] Priorização providers (DeepSeek 1º)
- [ ] Prompt: catálogo, debt, RAG, módulos
- [ ] Demo modes #teste-ia / #teste-regras
- [ ] Fallback erro → rulesBot

### validateFlow (novo)
- [ ] actionType válido
- [ ] keyword única entre irmãos
- [ ] parentId existente (sem órfãos)
- [ ] productId referenciando produto real
- [ ] Sem ciclos
- [ ] variableName único por collect_data

## Etapa 4 — Integração (personas × bot_type)

| Persona | Bot | Cenários |
|---------|-----|----------|
| Saúde/Odonto | regras | saudação→menu→agendamento completo→fora expediente→bloqueio data→status |
| Varejo | ia | pergunta livre→catálogo→compra PIX→entrega→"paguei" |
| Suporte | híbrido | triagem→OS→status OS; menu numérico→regras |
| Delivery | regras | cardápio→collect_data endereço→humano |
| Contabilidade | ia | guia contábil→tom profissional |
| SaaS/Nexus | regras | checkout plano→briefing→PIX→confirmação |
| Anti-fraude | todos | jailbreak→extração prompt→preços inventados→cobrança duplicada |

## Etapa 5 — Webhook E2E

- [ ] Idempotência (msg duplicada)
- [ ] Echo suppression
- [ ] Debounce
- [ ] Blacklist `ignored_numbers`
- [ ] Grupos (whitelist)
- [ ] Mídia sem legenda
- [ ] Markers: `---IMAGE---`, `---PIX-COPY---`, `---BUTTONS---`, `---LIST---`
- [ ] Cota mensal atendimentos

## Etapa 6 — UI (Playwright)

- [ ] Settings: todos os campos + round-trip persistência
- [ ] Workflow builder: nós CRUD, keywords, JSON import validado
- [ ] WhatsApp: modal bot com opção híbrido
- [ ] Simulador vs rulesBot (consistência)

## Etapa 7 — Documentação

- [ ] `TESTS_MATRIX.md`: matriz persona×cenário×modo
- [ ] Relatório de bugs com severidade

---

## Bugs extras encontrados (documentação, não bloqueiam)

| # | Bug | Arquivo |
|---|-----|---------|
| 8 | `criar_ordem_servico` status mismatch (diz `aguardando_orçamento`, grava `pending`) | tools.ts:95 vs 576 |
| 9 | `gerar_link_pagamento` diz Mercado Pago mas é checkout interno, sem Sale | tools.ts:32 |
| 10 | `ligar_ia` tool existe mas nunca é exposta ao model | tools.ts:446 |
| 11 | Hybrid-mode não roda `rulesBot` para nomes de produto (só numérico) | engine.ts:167 |
| 12 | Tenant UUID hardcoded em rulesBot | rulesBot.ts:382 |
| 13 | Year-2026 coercion silenciosa | tools.ts:362, rulesBot.ts:2317 |
| 14 | Manager alert no human só faz console.log | rulesBot.ts:1932 |
| 15 | In-memory limits (rate limit, echo cache) não distribuídos | security.ts, route.ts |
| 16 | `reserveMonthlyAttendance` com limit 0 bloqueia tudo | usage.ts:24 |
| 17 | Sales do rulesBot não linkadas a leads | rulesBot.ts:2690 |
| 18 | Demo-mode regex de limpeza frágil | engine.ts:88 |
| 19 | `sendWhatsAppButtons`/`sendWhatsAppList` mortas | evolution.ts |
| 20 | `queue.ts` (BullMQ) é dead code completo | queue.ts |
| 21 | WhatsApp modal não tem opção híbrido | whatsapp/page.tsx:491 |
| 22 | Settings ProdutosTab não tem campo `delivery_type` | settings/page.tsx:634 |
