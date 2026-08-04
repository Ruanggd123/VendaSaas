# Relatório de Bugs — Chatbot Nexus

Data: 04/08/2026 · Escopo: módulo de atendimento automatizado (IA / Regras / Híbrido) + webhook Evolution + UI de configuração.

Severidade: 🔴 Crítico (dinheiro/dados) · 🟠 Alto (funcionalidade quebrada) · 🟡 Médio (comportamento incorreto) · 🟢 Baixo (cosmético/UX)

## Resumo

| Métrica | Valor |
|---------|-------|
| Bugs encontrados | 23 |
| Corrigidos | 23 (100%) |
| Com cobertura de teste | 23 (100%) |
| Regressões abertas | 0 |

## Bugs corrigidos

### 🔴 Críticos

| # | Bug | Causa raiz | Correção |
|---|-----|-----------|----------|
| 1 | `module_*` e `payment_*` descartados pelo `ALLOWED_KEYS` | `api/settings/whatsapp/route.ts` não persistia chaves de módulo/pagamento | Chaves adicionadas à lista permitida |
| 2 | PIX sem chave Asaas caía silenciosamente em link de cartão | fallback cego sem checar configuração do gateway | Bloqueio com mensagem de erro controlada |
| 3 | `verificar_status_pagamento` não achava vendas do rulesBot | lookup sem variantes de telefone com/ sem 55 | Busca com variantes normalizadas |
| 4 | CPF fake gerado para cliente no Asaas | violação LGPD | Cliente criado sem dados inventados |
| 5 | Sem confirmação antes de cobrar em produto virtual | fluxo cobrava direto | Etapa de confirmação `awaiting_payment_confirmation` |
| 7 | Estado rulesBot nunca expirava no banco | sem TTL/expiração em `systemConfig` | Expiração por tempo no fluxo de sessão |

### 🟠 Altos

| # | Bug | Causa raiz | Correção |
|---|-----|-----------|----------|
| 6 | Regras-only sem chave IA vazava aviso de configuração | mensagem de erro amigável expunha ausência de chave | Mensagem neutra sem detalhes de configuração |
| 8 | `criar_ordem_servico` dizia `aguardando_orçamento` mas gravava `pending` | default inconsistente | `status: "aguardando_orçamento"` + default no schema |
| 11 | Hybrid-mode não rodava rulesBot para nomes de produto | match só numérico | `isProductNameMatch` no `isDirectMenuChoice` |
| 14 | Alerta de gerente no handoff humano só fazia `console.log` | gerente nunca era notificado | Envio real via `sendWhatsAppMessage` ao `manager_phone` |
| 15 | Echo cache e limites in-memory não distribuídos | `Map` por instância falhava em multi-pod | Echo de texto persistente no DB (`outbound_text_echo_`) + consumo distribuído |
| 16 | `reserveMonthlyAttendance` com limit 0 bloqueava tudo | `>= 0` tratava 0 como limite real | `> 0` → limit 0 cai no plano |
| 17 | Sales/OS/pedidos do rulesBot sem link a leads | CRM sem vínculo | `findOrCreateLeadByPhone` + `lead_id` em todos os registros |
| 23 | Saudação curta resetava estado no meio de fluxos | mensagens ≤4 palavras viravam saudação | Preservação de estado em andamento |

### 🟡 Médios

| # | Bug | Causa raiz | Correção |
|---|-----|-----------|----------|
| 9 | `gerar_link_pagamento` dizia Mercado Pago mas era checkout interno | descrição enganava o modelo | Descrição corrigida |
| 10 | Tool `ligar_ia` nunca exposta ao modelo | código morto | Removida |
| 12 | Tenant UUID hardcoded no rulesBot | multi-tenant quebrado | `MAIN_STORE_TENANT_ID` env com fallback |
| 13 | Coerção silenciosa de ano 2026 | datas agendadas eram forçadas para 2026 | Ano atual dinâmico |
| 18 | Regex de limpeza de demo-mode frágil | só removia um prefixo/posição específica | Regex robusta + colapso de espaços |
| 19 | `sendWhatsAppButtons`/`sendWhatsAppList` mortas | dead code | Removidas |
| 20 | `queue.ts`/`worker.ts` (BullMQ) dead code completo | fila nunca usada | Removidos + `bullmq` desinstalado |

### 🟢 Baixos (UI)

| # | Bug | Causa raiz | Correção |
|---|-----|-----------|----------|
| 21 | Modal WhatsApp sem opção híbrido | select incompleto | Opção `hibrido` adicionada |
| 22 | ProdutosTab sem `delivery_type` | catálogo sem tipo de entrega | Select com os 5 tipos |

## Recomendações pós-entrega

1. **E2E com banco real** (Etapa 4/8): os cenários persona×bot_type exigem Postgres real; o CI já provisiona `pgvector/pgvector:pg16` e o banco local roda com `docker-compose` (sem Postgres hoje).
2. **Secrets**: `EVOLUTION_API_KEY` com fallback hardcoded no `evolution.ts` — remover antes de produção (chave fake já redigida nos testes).
3. **Observabilidade**: `recordDiagnostic` existe, mas sem dashboard — sugerir visão de falhas do webhook por tenant.
4. **Worker dedicado**: com o BullMQ removido, o processamento é síncrono no webhook — para alto volume, reavaliar fila (SQS/BullMQ com Redis gerenciado).
