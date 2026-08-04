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

Status: **111 testes passando** (7 arquivos)

### rulesBot
- [x] `resolveChoiceIndex` expandido (números, texto, preço, parcial)
- [x] Dispatch dos 7 actionTypes (catalog, scheduling, human, collect_data, product, checkout, text/submenu)
- [x] Máquina de estados completa (18 steps)
- [x] Timeout 30min → main_menu
- [x] 3 erros consecutivos → handoff humano
- [x] Menu de boas-vindas (`---LIST---`/`---BUTTONS---`)
- [x] Variáveis `{var}` substituição
- [x] Finalização pedido: PIX/cartão/presencial/cobrança pendente/48h

### guardian
- [x] validator: campos obrigatórios, valores inválidos
- [x] sanitizeInput: anti-jailbreak, truncamento 350
- [x] validateOutput: redação de segredos, blacklist
- [x] Rate limit: 5 msgs/10s

### tools
- [x] 8 AI tools: validação params + efeitos DB
- [x] 6 admin tools: validação params + efeitos DB

### engine
- [x] Roteamento ia/regras/hibrido
- [x] Priorização providers (DeepSeek 1º)
- [x] Prompt: catálogo, debt, RAG, módulos
- [x] Demo modes #teste-ia / #teste-regras
- [x] Fallback erro → rulesBot

### validateFlow (novo)
- [x] actionType válido
- [x] keyword única entre irmãos
- [x] parentId existente (sem órfãos)
- [x] productId referenciando produto real
- [x] Sem ciclos
- [x] variableName único por collect_data

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

Status: coberto por `src/app/api/webhooks/evolution/route.test.ts` (23 testes).

- [x] Idempotência (msg duplicada) — receipt atômico + retry por `providerMessageId`
- [x] Echo suppression — eco persistente de mídia + eco de resposta do bot + eco rastreado (`outboundEchoCache`)
- [x] Debounce (`Mensagem agrupada` com token de claim)
- [x] Blacklist `ignored_numbers`
- [x] Grupos (whitelist)
- [x] Mídia sem legenda
- [x] Markers: `---IMAGE---`, `---PIX-COPY---`, `---BUTTONS---`, `---LIST---`
- [x] Cota mensal atendimentos
- [x] Autenticação (401 sem/errada token, instância inexistente)
- [x] Mensagem antiga (sync >24h)
- [x] Enquete/menu do bot ignorados
- [x] Resposta concorrente (`Resposta concorrente já enviada`)

## Etapa 6 — UI (Playwright)

Status: coberto por `e2e/` (5 testes, chromium, webServer `npm run dev`, sessão JWT gerada no globalSetup, APIs mockadas via `page.route`).

- [x] Login: renderiza formulário, erro de credenciais inválidas, redirect pós-login
- [x] Settings: carrega configurações existentes (GET) + round-trip de save (PUT com payload)
- [ ] Workflow builder: nós CRUD, keywords, JSON import validado
- [ ] WhatsApp: modal bot com opção híbrido
- [ ] Simulador vs rulesBot (consistência)

## Etapa 7 — Documentação

- [x] `TESTS_MATRIX.md`: matriz persona×cenário×modo
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
| 23 | **CORRIGIDO** — Saudação curta reseta estado no meio de fluxos (collect_data, endereço, nome/email, horário): mensagens ≤4 palavras sem keyword de ação eram tratadas como saudação, descartando o estado em andamento | rulesBot.ts:425 |
