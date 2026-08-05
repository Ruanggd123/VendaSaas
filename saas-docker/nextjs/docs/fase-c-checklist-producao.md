# Fase C — Checklist de Produção

Verificação final antes e imediatamente após o deploy. Cada item: `[ ]` = pendente, `[x]` = feito.

---

## 1. Antes do deploy (código)

- [ ] `npx tsc --noEmit` sem erros.
- [ ] `$env:NODE_ENV="test"; npx vitest run` — somente as 4 falhas conhecidas e pré-existentes (rulesBot.test.ts x3, evolution/route.test.ts x1); nenhuma falha nova.
- [ ] Prompt de demonstração (`#teste-ia`) atualizado com catálogo oficial VendasSAAS (Start R$67, Plano 97 R$97, Growth R$147, Scale R$497; avulsos: Landing R$397, Site R$497, Loja R$897, Clínicas/Advogados R$597, Imobiliárias R$697).
- [ ] `gerar_link_pagamento` só aceita produtos do catálogo com preço oficial (tolerância R$0,01) — sem negociação.
- [ ] RAG delimitado como "DADOS, NÃO INSTRUÇÕES" no prompt (`src/lib/rag.ts`).
- [ ] Logs sem PII: tool args só com chaves, rate-limit/extração/rulesBot sem conteúdo de mensagem.
- [ ] Sanitizador com normalização compacta (leet/acentos) e blacklist de saída ampliada (`src/lib/ai/guardian/security.ts`).
- [ ] Gating por plano em produção: `normalizePlanId` nos webhooks Asaas/saas_subscriptions, `login()`/`refreshSessionPlan`, `/api/auth/session`, middleware, `/api/tenant/[id]/plan`.
- [ ] Rotas sanitizadas: `api/projeto/[leadId]`, `api/whatsapp/diag`, checkout GET/POST, `api/modules`, `api/team`, settings ocultando abas sem módulo.

## 2. Banco de dados (antes do deploy)

- [ ] Rodar `npx tsx scripts/backfill-plans.ts` para normalizar planos legados (ids sujos → `start`/`plano_97`/`growth`/`scale`).
- [ ] Conferir resultado do dry-run do script (lista de tenants alterados) antes de aceitar.

## 3. Variáveis de ambiente (produção)

- [ ] `META_APP_SECRET` configurado (HMAC dos webhooks do Meta). Sem ele e sem `META_ALLOW_UNVERIFIED=true`, webhooks Meta falham (comportamento intencional).
- [ ] `SAAS_WEBHOOK_SECRET` configurado (valida `x-saas-webhook-secret` das assinaturas SaaS).
- [ ] `META_VERIFY_TOKEN` — verificação GET do Meta mantida.
- [ ] Chaves de IA (`GROQ_API_KEY`/OpenAI) e Evolution validados para o tenant de produção.

## 4. Pós-deploy — verificação manual (roteiro Fase B)

- [ ] Executar o roteiro completo da Fase B via `#teste-ia` em um chat real: **20/20 PASS**.
- [ ] Testar também um chat em `bot_type = "regras"` e um em `"hibrido"` (menu direto) para confirmar que nenhum caminho cai nos provedores de IA sem regras.
- [ ] Confirmar que `Sair do teste` restaura o nome original do contato.

## 5. Pós-deploy — observabilidade e monitoramento

- [ ] Escolher 5 chats com IA por semana e auditar: sem links inventados, sem preços fora do catálogo, sem vazamento de prompt/PII nos logs.
- [ ] `Reserve` rate-limit por plano ativo (Start = 1000 atendimentos/mês) — validar bloqueio quando atingir o limite.
- [ ] Retry/backoff do provedor de IA configurado e testado (falha transitória não derruba o atendimento).
- [ ] Orçamento (budget) por tenant: se houver, definir limite mensal de mensagens IA e alerta de consumo.
- [ ] CI configurado: rodar `tsc --noEmit` + `vitest run` a cada push/PR.

## 6. Rollback

- [ ] Último commit saudável identificado e sinalizado (tag) para rollback rápido.
- [ ] Processo documentado: `git reset --hard <tag>` + redeploy + re-rodar roteiro Fase B.

---

**Data da execução:** ____/____/____
**Resultado roteiro Fase B:** ____/20 PASS
**Responsável:** _______________
