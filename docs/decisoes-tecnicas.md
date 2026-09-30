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

### DEC-010 — Preset visual do Gestec Help Desk

| Campo | Valor |
|-------|-------|
| **Status** | Definida e obrigatória na implementação |
| **Data** | 2026-08-14 |
| **Contexto** | Foi solicitado o preset shadcn `b2D0vQOME` como referência oficial, enquanto a documentação atual registra `new-york` + Lucide |
| **Decisão** | Adotar o preset `b2D0vQOME` em todas as telas do `.pen` e obrigatoriamente no código. Na raiz do repositório executável Next.js, executar `npx shadcn@latest init --preset b2D0vQOME --template next`; a escolha do preset não está aberta a nova validação |
| **Alternativas** | Manter integralmente `new-york`/Lucide; adotar apenas tokens compatíveis do preset |
| **Consequências** | O `.pen` e o código usam a mesma referência Luma/neutral; a implementação deve reconciliar componentes existentes sem substituir o preset e sem criar configuração shadcn neste repositório documental |

### DEC-011 — Processamento assíncrono com pg-boss e PostgreSQL

| Campo | Valor |
|-------|-------|
| **Status** | Definida e obrigatória na implementação |
| **Data** | 2026-08-27 |
| **Contexto** | Notificações, relatórios e integrações assíncronas precisam de processamento persistente sem adicionar Redis à infraestrutura do Gestec Help Desk |
| **Decisão** | Implementar **pg-boss sobre o PostgreSQL existente** para todos os jobs do Gestec Help Desk durante a fase de coding; esta escolha não está `TO_DEFINE` |
| **Alternativas** | BullMQ + Redis; processamento somente em memória; serviço externo de filas |
| **Consequências** | Elimina Redis e BullMQ do escopo do módulo; exige handlers idempotentes, observabilidade, controle de concorrência, política de retenção e migrations/configuração validadas no repositório executável |

### DEC-012 — Acesso Supabase somente com cadastro prévio

| Campo | Valor |
|-------|-------|
| **Status** | Aprovada para implementação em 2026-09-30 |
| **Data** | 2026-09-30 |
| **Contexto** | Uma conta autenticada no Supabase sem `UserRef` recebia `TECHNICIAN` e era criada no primeiro login |
| **Decisão** | Negar o acesso com 403 e não criar `UserRef`. O papel gravado no cadastro local é a autoridade. A allowlist `SUPABASE_ADMIN_EMAILS` não cria usuário nem troca o papel já salvo. No projeto Supabase: cadastro público desligado, e-mail como único provedor, Site URL `https://desk.gestec.io`, redirect somente nesse domínio, confirmação de e-mail ligada e MFA não obrigatório nesta fase |
| **Alternativas** | Continuar criando técnico automaticamente; promover admin pela allowlist a cada login |
| **Consequências** | Cada pessoa precisa existir em Admin → Usuários antes de entrar. A conferência ao vivo do painel Supabase continua manual |

### DEC-013 — Matriz de papéis do Help Desk

| Campo | Valor |
|-------|-------|
| **Status** | Aprovada para implementação em 2026-09-30, igual ao código em `lib/auth/permissions.ts` |
| **Data** | 2026-09-30 |
| **Contexto** | Era preciso registrar quem vê tickets, tempo, ativos, relatórios e cadastros, sem alargar o acesso |
| **Decisão** | Quatro papéis. `ADMIN`: todas as permissões, inclusive `admin:manage`. `MANAGER`: tickets, tempo, ativos, relatórios, metas e notificações, sem cadastro administrativo. `TECHNICIAN`: ver e trabalhar tickets, ver e lançar o próprio tempo, ver ativos, relatórios, notificações e metas. `AUDITOR`: somente leitura de tickets, tempo, ativos, relatórios, notificações e metas. Relatórios e exportação `.xlsx` permanecem para todo usuário autenticado. Usuário sem cadastro local não entra. Payload de integração, erro interno de sincronização e comentário interno ficam restritos a `ADMIN` e `MANAGER`. E-mail e papel aparecem no cadastro de usuários, restrito a `ADMIN` |
| **Alternativas** | Relatórios só para administrador; criar papéis novos de solicitante e financeiro nesta etapa |
| **Consequências** | A T05 usa esta regra. Escopo por empresa ou equipe ainda não existe no código e não foi inventado |

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

- [ ] Confirmar abordagem de feriados (DEC-007)
- [ ] Permissões completas do Gestec Help Desk (`gestec_help_desk:*`)
- [ ] Models Prisma para chamados/tickets (Help Desk)
- [ ] Integração Desk → Help Desk (contexto de máquina no ticket)
