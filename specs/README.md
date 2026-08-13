# Specs — Gestec Help Desk

Módulo de help desk / chamados — **novo módulo dentro do Gestec existente** (`C:\Users\julia.souza\Gestec`).

**Rota:** `/gestec_help_desk`  
**Sidebar:** Gestec Help Desk  
**Permissão (sugerida):** `gestec_help_desk:view`, `gestec_help_desk:new`, `gestec_help_desk:edit`, … — **TBD**

> Specs alinhadas ao código Gestec existente (layout, shadcn, RBAC, TanStack Query).

---

## Princípio

Não é app separado. Cada spec descreve o que implementar **dentro do monorepo Gestec**, reutilizando:

- Layout (`DefaultLayout`, sidebar, header, breadcrumb)
- Auth (NextAuth — sem login novo)
- RBAC (`Modules` / `Actions`, `ProtectedRoute`, `requireApiPermission`)
- UI (shadcn/ui, Tailwind, Lucide, Sonner toasts)
- Dados (TanStack Query, React Hook Form + Zod, Prisma)

Ver [referencia-gestec.md](../../docs/referencia-gestec.md) e [padroes-ui.md](../../docs/padroes-ui.md).

---

## Referências no código Gestec

Ao escrever specs, indicar **páginas/componentes análogos** como modelo:

| Padrão da tela | Onde consultar no Gestec |
|----------------|--------------------------|
| Listagem + tabela + busca | `src/app/pcp/cadastros/colaboradores/page.tsx` + `data-table.tsx` |
| CRUD com Dialog | `src/app/cadastros/permissoes/page.tsx` |
| Formulário com validação Zod | Mesmo arquivo de permissões (`useForm` + `FormField`) |
| Filtros laterais | `src/app/cadastros/permissoes/components/filter-drawer.tsx` |
| Proteção de rota | `src/components/auth/protected-route.tsx` |
| Permissões granulares | `src/lib/permission.ts` (`Modules`, `Actions`) |
| Item de menu | `src/lib/sidebar-navigation.ts` |
| Layout global | `src/components/layout/default-layout-all.tsx` |
| Título de página | `src/components/ui/title-custom.tsx` (`Title`, `Description`) |
| API REST | `src/app/api/v1/...` + controllers em `src/controllers/` |
| Mutations / queries | `src/hooks/mutations/`, `src/hooks/actions/` |

---

## Convenções do módulo (specs)

| Item | Valor |
|------|-------|
| Pasta de specs | `specs/help-desk/` |
| Numeração | `01`, `01.1` … (fluxo Tickets); `02`, `02.1` … (subtelas Kanban, etc.) |
| Rotas de página | `/gestec_help_desk/...` (DEC-008) |
| Rotas de API | `/api/v1/gestec-help-desk/...` |
| Enum permissão | `Modules.GestecHelpDesk` → `gestec_help_desk` — **TBD** |
| Componentes UI | Sempre mapear para shadcn (`Dialog`, `Table`, `Select`, `Button`, etc.) |

---

## O que cada spec deve incluir

Seguir [_template-spec.md](../_template-spec.md), com atenção a:

1. **`ProtectedRoute`** com módulo/ação corretos
2. **Componentes shadcn** nomeados (não inventar UI nova)
3. **Estados** padrão: skeleton, empty, erro (toast Sonner), sucesso
4. **Mobile:** mencionar se usa `useIsMobile` / cards (padrão Gestec)
5. **API** no formato `/api/v1/...` + permissão no controller
6. **Referência de implementação** — arquivo Gestec similar como guia

---

## Telas

| # | Arquivo | Tela | Status |
|---|---------|------|--------|
| 01 | [01-help-desk.md](01-help-desk.md) | Tickets (lista) | Rascunho |
| 01.1 | [01.1-help-desk.md](01.1-help-desk.md) | Novo Ticket (modal) | Rascunho |
| 01.2 | [01.2-help-desk.md](01.2-help-desk.md) | Triagem do Ticket (modal) | Rascunho |
| 01.3 | [01.3-help-desk.md](01.3-help-desk.md) | Contato Inicial (modal) | Rascunho |
| 01.4 | [01.4-help-desk.md](01.4-help-desk.md) | Atender Solicitação (modal) | Rascunho |
| 01.5 | [01.5-help-desk.md](01.5-help-desk.md) | Aprovar Conclusão (modal) | Rascunho |
| 01.6 | [01.6-help-desk.md](01.6-help-desk.md) | Avaliação do Serviço (modal) | Rascunho |
| 02 | [02-kanban.md](02-kanban.md) | Kanban (quadro por tipo) | Rascunho |
| 02.1 | [02.1-detalhe-ticket-kanban.md](02.1-detalhe-ticket-kanban.md) | Detalhe do ticket (Kanban) | Rascunho |
| 02.1.1 | [02.1.1-anexos-despesa.md](02.1.1-anexos-despesa.md) | Anexos da despesa (modal) | Rascunho |
| 03 | [03-acompanhar-solicitacoes.md](03-acompanhar-solicitacoes.md) | Acompanhar solicitações | Rascunho |
| 04 | [04-integracoes.md](04-integracoes.md) | Integrações (lista) | Rascunho |
| 04.1 | [04.1-configuracao-integracao-api.md](04.1-configuracao-integracao-api.md) | Configuração API (editor) | Rascunho |

Ver mapa geral: [00-visao-geral.md](../00-visao-geral.md)
