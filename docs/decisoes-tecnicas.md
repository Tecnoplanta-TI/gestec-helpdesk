# Decisões Técnicas

Registro de decisões de arquitetura e tecnologia do projeto Gestec Help Desk.

## Formato

Cada decisão segue o padrão:

| Campo | Descrição |
|-------|-----------|
| **ID** | DEC-001, DEC-002… |
| **Data** | Quando foi decidido |
| **Contexto** | Problema ou necessidade |
| **Decisão** | O que foi escolhido |
| **Alternativas** | O que foi descartado |
| **Consequências** | Impactos positivos e negativos |

---

## Decisões

### DEC-001 — Integração com Gestec existente

| Campo | Valor |
|-------|-------|
| **Status** | Definida |
| **Data** | 2026-07-03 |
| **Contexto** | Help Desk pode ser app separada ou módulo dentro do Gestec |
| **Decisão** | Desenvolver como **módulo dentro do Gestec** (`C:\Users\julia.souza\Gestec`) |
| **Alternativas** | App greenfield separada |
| **Consequências** | Reutiliza auth, layout, RBAC, UI e padrões de API; specs devem referenciar o codebase existente |

### DEC-002 — Stack

| Campo | Valor |
|-------|-------|
| **Status** | Definida (herdada) |
| **Contexto** | Stack do Help Desk |
| **Decisão** | Next.js 15 + React 19 + TypeScript + shadcn/ui + TanStack Query + Prisma/PostgreSQL |
| **Alternativas** | — |
| **Consequências** | Mesma stack do Gestec principal; ver [referencia-gestec.md](referencia-gestec.md) |

### DEC-003 — Autenticação

| Campo | Valor |
|-------|-------|
| **Status** | Definida (herdada) |
| **Contexto** | Login do Help Desk |
| **Decisão** | Reutilizar NextAuth existente (`/auth/signin`); sem login dedicado |
| **Alternativas** | SSO separado |
| **Consequências** | Specs de telas não precisam descrever fluxo de login do zero, salvo customizações |

### DEC-004 — Permissões

| Campo | Valor |
|-------|-------|
| **Status** | Definida (padrão existente) |
| **Contexto** | Controle de acesso do módulo |
| **Decisão** | RBAC via `module:action` (enum `Modules` / `Actions` em `permission.ts`) |
| **Alternativas** | — |
| **Consequências** | Novos módulos Help Desk precisam ser adicionados ao enum e ao sidebar |

### DEC-005 — API

| Campo | Valor |
|-------|-------|
| **Status** | Definida (padrão existente) |
| **Contexto** | Endpoints do Help Desk |
| **Decisão** | REST em `/api/v1/...`, controllers em `src/controllers/`, thin route handlers |
| **Alternativas** | GraphQL |
| **Consequências** | Specs devem seguir convenção plural + kebab-case |

---

### DEC-006 — Rota do módulo Gestec Desk

| Campo | Valor |
|-------|-------|
| **Status** | Definida (revisada) |
| **Data** | 2026-07-03 |
| **Contexto** | URL da landing do módulo Desk (inventário/auditoria) |
| **Decisão** | `/gestec-desk` |
| **Alternativas** | `/help-desk` (descartada — conflita com nome do outro módulo) |
| **Consequências** | Item **Gestec Desk** na sidebar; specs `01.x` usam este prefixo |

### DEC-008 — Rota do módulo Gestec Help Desk

| Campo | Valor |
|-------|-------|
| **Status** | Definida |
| **Data** | 2026-07-03 |
| **Contexto** | URL do módulo de help desk (chamados) |
| **Decisão** | `/gestec_help_desk` |
| **Alternativas** | `/help-desk`, `/suporte` |
| **Consequências** | Item **Gestec Help Desk** separado na sidebar; specs em `specs/help-desk/` |

### DEC-009 — Dois módulos na sidebar

| Campo | Valor |
|-------|-------|
| **Status** | Definida |
| **Data** | 2026-07-03 |
| **Contexto** | Desk vs Help Desk são funcionalidades distintas |
| **Decisão** | Dois itens independentes na sidebar, cada um com rota, permissões e specs próprias |
| **Alternativas** | Módulo único |
| **Consequências** | Numeração por pasta: `gestec.desk/01.x` e `help-desk/01.x` |

### DEC-007 — Feriados no calendário de cobertura

| Campo | Valor |
|-------|-------|
| **Status** | Proposta (aguardando confirmação) |
| **Data** | 2026-07-03 |
| **Contexto** | Dias em cinza escuro no calendário |
| **Decisão proposta** | **Fase 1:** lista fixa de feriados nacionais BR no código (`holidays.ts`). **Fase 2:** cadastro opcional em Sistema |
| **Alternativas descartadas por ora** | API externa (dependência desnecessária) |
| **Consequências** | MVP sem cadastro; evolução se precisarem feriados corporativos/municipais |

---

## Em aberto

- [ ] Confirmar rota `/gestec-desk` para Desk (DEC-006)
- [ ] Confirmar abordagem de feriados (DEC-007)
- [ ] Permissões completas do Gestec Help Desk (`gestec_help_desk:*`)
- [ ] Models Prisma para chamados/tickets (Help Desk)
- [ ] Integração Desk → Help Desk (contexto de máquina no ticket)
