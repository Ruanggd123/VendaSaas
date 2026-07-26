# Workflow operacional de desenvolvimento

## Objetivo
- Padronizar o fluxo de trabalho para evitar regressões e facilitar entrega.
- Separar claramente mudanças do produto principal (`saas-docker/nextjs`) de alterações em submódulos (`evolution-api`, `saas-docker/evolution-manager`).
- Reduzir tempo de revisão com validações repetíveis antes de `commit` e `push`.

## Estrutura de código do projeto
- **`saas-docker/nextjs`**: aplicação principal em produção.
- **`saas-docker/evolution-manager`**: painel de administração do WhatsApp.
- **`evolution-api`**: API do WhatsApp (integração).

> Observação: os diretórios com `.git` próprio devem ser tratados como repositórios separados, com histórico e validações independentes.

## 1) Ciclo padrão por mudança

### 1.1 Planejar
- Definir escopo da mudança com checklist de sucesso.
- Confirmar arquivo(s) afetados.
- Verificar se a alteração bate com a regra de negócio (ex.: conversas, status, SLA, automações).

### 1.2 Implementar no módulo correto
- Mudança de UI/fluxo de conversa: **`saas-docker/nextjs`**.
- Ajuste de branding/infra de manager: **`saas-docker/evolution-manager`**.
- Ajuste de API core do WhatsApp: **`evolution-api`**.

### 1.3 Validar antes de commit

#### Validar no `nextjs` (obrigatório)
```bash
cd saas-docker/nextjs
npm run lint
npm run build
```

#### Validar `evolution-manager` (quando alterado)
```bash
cd saas-docker/evolution-manager
npm install
npm run lint
npm run build
```

#### Validar `evolution-api` (quando alterado)
```bash
cd evolution-api
npm install
npm run lint:check
npm run build
```

### 1.4 Revisar antes de commit
- Conferir `git diff --stat` para validar escopo.
- Conferir `git status --short` e confirmar arquivos esperados.
- Rodar checklist manual da funcionalidade:
  - Página de conversas: ações rápidas, busca no histórico, SLA, fluxo de status.

### 1.5 Commit por contexto
- Commits curtos e específicos (ex.: `feat`, `fix`, `chore`).
- Não misturar commit de `nextjs` com mudanças de submódulos.

## 2) Regras para submódulos (`evolution-api` e `evolution-manager`)

### 2.1 Fluxo recomendado
1. Entrar no submódulo e concluir validação local.
2. Fazer `git add` + `git commit` no próprio submódulo.
3. Voltar para raiz e atualizar o ponteiro do submódulo com o novo commit.
4. Commit do ponteiro na raiz.

### 2.2 Segurança importante (aplicado em produção)
- Só atualizar ponteiro para commit que exista no remoto configurado (evita ponteiro “órfão”).
- Verificar com:
  ```bash
  git -C saas-docker/evolution-manager rev-parse --short HEAD
  git -C saas-docker/evolution-manager status
  git -C saas-docker/evolution-manager remote -v
  ```
- Se o remote de upstream não permitir `push`, manter mudanças em branch local e registrar para merge posterior em fork/remote autorizado.

### 2.3 Evitar erro clássico
- Não criar `submodule` no root se ele não estiver explicitamente listado em `.gitmodules`.
- Se o projeto mostrar modo de submódulo estranho, conferir a raiz da árvore com:
  ```bash
  git ls-tree --name-only HEAD
  git ls-tree HEAD saas-docker/evolution-manager
  ```

## 3) Processo de pull request/entrega
- Incluir no PR:
  - resumo da mudança
  - comandos executados
  - evidência de build/lint
  - impacto funcional
- Sempre descrever se houve mudança em submódulo e se há commit separado dele.

## 4) Checklist final antes de `push`
- [ ] Código novo + comportamento conferido no ambiente de teste
- [ ] `git status --short` limpo (ou stashes controlados)
- [ ] `nextjs`: `npm run lint` e `npm run build` OK
- [ ] `evolution-manager` e/ou `evolution-api` validados quando alterados
- [ ] Mensagem de commit clara
- [ ] Dependências e ponteiros de submódulo consistentes

## 5) Comandos rápidos de referência

```bash
# status global
git status --short
git diff --stat

# raiz principal
git log --oneline --decorate -n 8

# avançar submódulos
git -C evolution-api status --short
git -C saas-docker/evolution-manager status --short

# submeter
git push origin main
git -C saas-docker/evolution-manager push origin main   # se tiver permissão
```

## 6) Registro de decisões
- Se surgir dúvida operacional (ex.: mensagem de erro do lint/build, mudança de política, permissão de push), registrar no bloco do PR para facilitar rastreabilidade.
