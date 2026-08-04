# TESTS_MATRIX.md

Matriz persona × cenário × modo de teste. Modos: **U** = unitário, **W** = webhook (mock Prisma), **E** = E2E com banco real.

Legenda: ✅ coberto | 🕐 pendente | 🔴 bloqueado (depende de infra)

## Validação de Fluxo (validateFlow)

| # | Cenário | U | W | E |
|---|---------|---|---|---|
| 1 | ID único e obrigatório | ✅ | — | — |
| 2 | `actionType` válido | ✅ | — | — |
| 3 | `parentId` aponta para pai existente | ✅ | — | — |
| 4 | `collect_data` presente quando `collectData=true` | ✅ | — | — |
| 5 | Ciclo de `parentId` (encadeado) | ✅ | — | — |
| 6 | Auto-referência de `parentId` | ✅ | — | — |
| 7 | Duplicidade de keyword entre irmãos | ✅ | — | — |
| 8 | Keyword repetida entre níveis (permitido) | ✅ | — | — |
| 9 | `productId` existe no catálogo | ✅ | — | — |
| 10 | `productId` inexistente no catálogo | ✅ | — | — |
| 11 | `productId` sem catálogo (permitido) | ✅ | — | — |
| 12 | Cadeia longa sem ciclo (permitida) | ✅ | — | — |

## Guardian / Segurança (security)

| # | Cenário | U | W | E |
|---|---------|---|---|---|
| 1 | Jailbreak "ignore instruções" bloqueado | ✅ | — | — |
| 2 | Extração de prompt/sistema bloqueada | ✅ | — | — |
| 3 | Preço inventado bloqueado | ✅ | — | — |
| 4 | Cobrança duplicada bloqueada | ✅ | — | — |
| 5 | Redação de chaves (DeepSeek, ba1add) | ✅ | — | — |
| 6 | Saída fora da persona bloqueada | ✅ | — | — |

## RulesBot (modo regras)

| # | Cenário | U | W | E |
|---|---------|---|---|---|
| 1 | Reset pelo comando "inicio" | ✅ | — | — |
| 2 | Saudações curtas (≤4 palavras) na home | ✅ | — | — |
| 3 | Saudações curtas NO MEIO do fluxo NÃO resetam (Bug #23) | ✅ | — | — |
| 4 | Timeout de sessão >30min reseta | ✅ | — | — |
| 5 | Sessão ativa <30min preserva estado | ✅ | — | — |
| 6 | 3 erros consecutivos → atendimento humano + `ai_paused=true` | ✅ | — | — |
| 7 | Substituição de `{var}` em collect_data | ✅ | — | — |
| 8 | Pedido exige confirmação antes de cobrar | ✅ | — | — |
| 9 | Cancelar pedido na confirmação → menu | ✅ | — | — |
| 10 | PIX copy-paste após confirmação | ✅ | — | — |
| 11 | Pedido presencial sem pagamento | ✅ | — | — |
| 12 | Venda pendente >48h respondida com "paguei" | ✅ | — | — |
| 13 | PIX sem gateway configurado → erro controlado | ✅ | — | — |

## Engine (orquestrador de IA)

| # | Cenário | U | W | E |
|---|---------|---|---|---|
| 1 | Provedor principal responde | ✅ | — | — |
| 2 | Fallback para próximo provedor | ✅ | — | — |
| 3 | Todos os provedores falham → rulesBot (Fallback Seguro) | ✅ | — | — |
| 4 | Erro do rulesBot → mensagem de erro amigável | ✅ | — | — |

## Webhook Evolution (route.ts)

| # | Cenário | U | W | E |
|---|---------|---|---|---|
| 1 | 401 sem apikey | — | ✅ | — |
| 2 | 401 com token inválido | — | ✅ | — |
| 3 | 401 instância inexistente | — | ✅ | — |
| 4 | `status@broadcast` ignorado | — | ✅ | — |
| 5 | Grupo com `enable_groups=false` ignorado | — | ✅ | — |
| 6 | Grupo fora da whitelist ignorado | — | ✅ | — |
| 7 | Whitelist vazia ignora grupo | — | ✅ | — |
| 8 | Contato na blacklist ignorado | — | ✅ | — |
| 9 | Mensagem antiga (>24h sync) ignorada | — | ✅ | — |
| 10 | Criação de enquete do bot ignorada | — | ✅ | — |
| 11 | Menu interativo do bot ignorado | — | ✅ | — |
| 12 | Evento duplicado (receipt atômico) | — | ✅ | — |
| 13 | Retry duplicado por `providerMessageId` | — | ✅ | — |
| 14 | Eco persistente de mídia do bot | — | ✅ | — |
| 15 | Echo de resposta do bot (conteúdo igual) | — | ✅ | — |
| 16 | Mídia sem legenda → sistema/status | — | ✅ | — |
| 17 | Outbound do operador (fromMe) ignorado | — | ✅ | — |
| 18 | Cota mensal atingida → bloqueio | — | ✅ | — |
| 19 | Mensagem de cliente processada (não ignorada) | — | ✅ | — |
| 20 | Debounce agrupa mensagens (`Mensagem agrupada`) | — | ✅ | — |
| 21 | Markers `---IMAGE---`/`---PIX-COPY---`/`---BUTTONS---`/`---LIST---` | — | ✅ | — |
| 22 | Resposta concorrente em andamento → ignorada | — | ✅ | — |
| 23 | Eco rastreado (`outboundEchoCache`) | — | ✅ | — |

## Personas (E2E com banco real)

| # | Persona | Cenário | U | W | E |
|---|---------|---------|---|---|---|
| 1 | Cliente novo | Saudação → menu → catálogo | — | — | 🔴 |
| 2 | Cliente novo | Escolhe produto → checkout PIX | — | — | 🔴 |
| 3 | Cliente recorrente | Volta e compra novamente | — | — | 🔴 |
| 4 | Cliente com pedido pendente | Paga depois de 48h | — | — | 🔴 |
| 5 | Operador | Pausa/retoma IA manualmente | — | — | 🔴 |
| 6 | Operador | Venda presencial sem pagamento | — | — | 🔴 |
| 7 | Atacante | Jailbreak → extração → preço inventado | — | — | 🔴 |

## Contadores (16/04)

| Modo | Total |
|------|-------|
| Unitários (U) | 111 |
| Webhook (W) | 23 |
| UI Playwright (P) | 5 |
| **Total** | **139 testes** |
