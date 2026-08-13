# Referência — Projeto Gestec existente

O ecossistema será desenvolvido **dentro do Gestec principal**, não como aplicação separada.

**Repositório base:** `C:\Users\julia.souza\Gestec`

## Módulos neste repositório de specs

| Módulo | Sidebar | Rota | Permissão (sugerida) | Specs |
|--------|---------|------|----------------------|-------|
| **Gestec Desk** | Gestec Desk | `/gestec-desk` | `gestec_desk:view`, `gestec_desk:edit` | `specs/gestec.desk/` |
| **Gestec Help Desk** | Gestec Help Desk | `/gestec_help_desk` | `gestec_help_desk:*` — TBD | `specs/help-desk/` |

Cada módulo = item próprio em `sidebar-navigation.ts` + entradas no enum `Modules`.

---

## Stack (herdada do Gestec)

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui (Radix, estilo "new-york"), Lucide icons |
| Formulários | React Hook Form + Zod |
| Dados | TanStack Query 5 |
| Backend | Next.js API Routes + Server Actions + Controllers |
| Banco | PostgreSQL via Prisma 6 |
| Auth | NextAuth.js 4 (Credentials + JWT) |
| Jobs | BullMQ + Redis |

---

## Autenticação e permissões

- Login existente: `/auth/signin` — **não criar login separado**
- Sessão inclui `userId`, `branchId`, etc. (`useUserSession`)
- Permissões no formato **`module:action`**

**Módulos** (`src/lib/permission.ts` — enum `Modules`):
`registry_*`, `work_log*`, `forms*`, `users`, `roles`, `permissions`, `users_group`, `pcp`, `dashboards`, `system`, etc.

**Ações** (`Actions`): `view`, `new`, `edit`, `delete`, `permission`

**Proteção de páginas:**
```tsx
<ProtectedRoute module={Modules.X} action={Actions.View}>
```

**Proteção de API:**
```ts
requireApiPermission(request, "module", "action")
```

> Adicionar `gestec_desk` e `gestec_help_desk` ao enum `Modules` em `permission.ts`.

---

## Padrão de rotas e API

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Página | `/modulo/submodulo` | `/cadastros/usuarios` |
| API | `/api/v1/recurso` | `/api/v1/employees` |
| Segmentos | kebab-case, plural | `/work-log/records` |

---

## Padrão de página (referência)

Arquivos de referência no Gestec:

| Padrão | Arquivo de exemplo |
|--------|-------------------|
| Listagem com tabela | `src/app/pcp/cadastros/colaboradores/page.tsx` |
| CRUD com dialog | `src/app/cadastros/permissoes/page.tsx` |
| Gestão de permissões | `src/app/dashboards/permissoes/page.tsx` |
| Sidebar / navegação | `src/lib/sidebar-navigation.ts` |
| Layout padrão | `src/components/layout/default-layout-all.tsx` |

**Estrutura típica de página:**
1. `"use client"`
2. `<ProtectedRoute module action>`
3. `<Title>` + `<Description>`
4. Tabela (`data-table.tsx`) ou formulário
5. Toasts (Sonner) para feedback

---

## O que já existe vs. o que será novo

| Item | Status |
|------|--------|
| Login / sessão | ✅ Existente |
| Layout (sidebar, header) | ✅ Existente |
| RBAC (roles, permissions) | ✅ Existente |
| Módulo Gestec Desk | ❌ Não existe ainda (specs `01.x` prontas) |
| Módulo Gestec Help Desk | ❌ Não existe ainda (specs `02.x` em andamento) |
| Models de chamados/tickets | ❌ Não existe ainda |
| Item "Suporte" no menu | ⚠️ Comentado em `nav-user.tsx` (placeholder) |

---

## Projetos relacionados (não são o Help Desk)

| Projeto | Função |
|---------|--------|
| `gestec.desk` | Agente Windows — inventário de máquinas |
| `gestecDesk_panel` | Painel admin do desk (Cosmos DB) |

Podem fornecer **contexto de máquina/usuário** em tickets futuros, mas hoje não há integração.

---

## Ao escrever specs

1. Assumir **mesmo layout, auth e padrões de UI** do Gestec
2. Usar formato `module:action` nas permissões
3. Rotas: Desk → `/gestec-desk/...` · Help Desk → `/gestec_help_desk/...`
4. Referenciar endpoints como `/api/v1/...` quando definidos
5. Marcar como **TBD** o que precisar de decisão (nome do módulo, models Prisma, etc.)
6. **Consultar o código Gestec** e citar arquivos de referência na spec (ex.: listagem → `colaboradores/page.tsx`)

### Gestec Help Desk — checklist por spec

| Item | Padrão Gestec |
|------|---------------|
| Página | `"use client"` + `ProtectedRoute` + `Title`/`Description` |
| Modal / formulário | `Dialog` + React Hook Form + Zod + `FormField` |
| Listagem | `DataTable` ou `Table` + TanStack Query |
| Feedback | `toast` (Sonner) |
| API | Route handler fino → controller → Prisma |
| Menu | Entrada em `sidebar-navigation.ts` + `Modules` em `permission.ts` |
