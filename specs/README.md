# Specs — Gestec Help Desk

Módulo de help desk / chamados — **novo módulo dentro do Gestec existente** (`C:\Users\julia.souza\Gestec`).

**Rota:** `/gestec_help_desk`  
**Sidebar:** Gestec Help Desk  
**Permissão (sugerida):** `gestec_help_desk:view`, `gestec_help_desk:new`, `gestec_help_desk:edit`, … — **TBD**

> Specs alinhadas ao código Gestec existente (layout, shadcn, RBAC, TanStack Query).

> **Obrigatório no coding:** todas as telas devem utilizar o preset shadcn `b2D0vQOME`. Na raiz do repositório executável Next.js, inicializar com `npx shadcn@latest init --preset b2D0vQOME --template next`. Esta escolha é `CONFIRMED` e não está `TBD`, `VALIDAR` ou `TO_DEFINE`. Não executar o comando neste repositório documental.

---

## Princípio

Não é app separado. Cada spec descreve o que implementar **dentro do monorepo Gestec**, reutilizando:

- Layout (`DefaultLayout`, sidebar, header, breadcrumb)
- Auth (NextAuth — sem login novo)
- RBAC (`Modules` / `Actions`, `ProtectedRoute`, `requireApiPermission`)
- UI (shadcn/ui inicializado obrigatoriamente com o preset `b2D0vQOME`, Tailwind, biblioteca de ícones definida pelo preset e Sonner toasts)
- Dados (TanStack Query, React Hook Form + Zod, Prisma)

Ver [referencia-gestec.md](../docs/referencia-gestec.md) e [padroes-ui.md](../docs/padroes-ui.md).

## Visão do produto

| Documento | Cobertura |
|-----------|-----------|
| [00 — Visão Geral da Solução Gestec Help Desk](help-desk/00-visao-geral-da-solucao.md) | Integra os três pilares do produto: registro de horas, gestão de tickets de suporte de TI e gestão de ativos de TI; referencia as Specs detalhadas e explicita as lacunas ainda pendentes |

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
| Componentes UI | Sempre mapear para shadcn (`Dialog`, `Table`, `Select`, `Button`, etc.) usando obrigatoriamente o preset `b2D0vQOME` |

---

## O que cada spec deve incluir

Seguir [_template-spec.md](_template-spec.md), com atenção a:

1. **`ProtectedRoute`** com módulo/ação corretos
2. **Componentes shadcn** nomeados, usando o preset obrigatório `b2D0vQOME` (não inventar UI nova)
3. **Estados** padrão: skeleton, empty, erro (toast Sonner), sucesso
4. **Mobile:** mencionar se usa `useIsMobile` / cards (padrão Gestec)
5. **API** no formato `/api/v1/...` + permissão no controller
6. **Referência de implementação** — arquivo Gestec similar como guia

---

## Telas

| # | Arquivo | Tela | Status |
|---|---------|------|--------|
| 01 | [01-help-desk.md](help-desk/01-help-desk.md) | Tickets (lista) | Rascunho |
| 01.1 | [01.1-help-desk.md](help-desk/01.1-help-desk.md) | Novo Ticket (modal) | Rascunho |
| 01.2 | [01.2-help-desk.md](help-desk/01.2-help-desk.md) | Triagem do Ticket (modal) | Rascunho |
| 01.3 | [01.3-help-desk.md](help-desk/01.3-help-desk.md) | Contato Inicial (modal) | Rascunho |
| 01.4 | [01.4-help-desk.md](help-desk/01.4-help-desk.md) | Atender Solicitação (modal) | Rascunho |
| 01.5 | [01.5-help-desk.md](help-desk/01.5-help-desk.md) | Aprovar Conclusão (modal) | Rascunho |
| 01.6 | [01.6-help-desk.md](help-desk/01.6-help-desk.md) | Avaliação do Serviço (modal) | Rascunho |
| 02 | [02-kanban.md](help-desk/02-kanban.md) | Kanban (quadro por tipo) | Rascunho |
| 02.1 | [02.1-detalhe-ticket-kanban.md](help-desk/02.1-detalhe-ticket-kanban.md) | Detalhe do ticket (Kanban) | Rascunho |
| 02.1.1 | [02.1.1-anexos-despesa.md](help-desk/02.1.1-anexos-despesa.md) | Anexos da despesa (modal) | Rascunho |
| 03 | [03-acompanhar-solicitacoes.md](help-desk/03-acompanhar-solicitacoes.md) | Acompanhar solicitações | Rascunho |
| 04 | [04-integracoes.md](help-desk/04-integracoes.md) | Integrações (lista) | Rascunho |
| 04.1 | [04.1-configuracao-integracao-api.md](help-desk/04.1-configuracao-integracao-api.md) | Configuração API (editor) | Rascunho |
| 05 | [05-ciclo-de-vida-e-colaboracao.md](help-desk/05-ciclo-de-vida-e-colaboracao.md) | Histórias complementares do ciclo de vida do ticket | Rascunho |
| 06 | [06-operacao-sla-workflow-notificacoes.md](help-desk/06-operacao-sla-workflow-notificacoes.md) | SLA, calendário e notificações | Rascunho |
| 07 | [07-administracao-projetos-e-insights.md](help-desk/07-administracao-projetos-e-insights.md) | Catálogos, faturamento de tickets, relatórios, auditoria e conhecimento | Rascunho |
| 08 | [08-central-de-notificacoes.md](help-desk/08-central-de-notificacoes.md) | Central de Notificações | Rascunho |
| 09 | [09-monitor-de-sla.md](help-desk/09-monitor-de-sla.md) | Monitor de SLA e escalonamentos | Rascunho |
| 10 | [10-execucoes-de-integracoes.md](help-desk/10-execucoes-de-integracoes.md) | Histórico, detalhe redigido, cancelamento e diagnóstico de execuções | Rascunho |
| 11 | [11-minha-caixa-e-visoes-salvas.md](help-desk/11-minha-caixa-e-visoes-salvas.md) | Caixa pessoal de trabalho | Rascunho |
| 12 | [12-portal-de-conhecimento.md](help-desk/12-portal-de-conhecimento.md) | Portal e governança do conhecimento | Rascunho |
| 14 | [14-relatorios-agendados.md](help-desk/14-relatorios-agendados.md) | Agendamento e entrega de relatórios | Rascunho |
| 15 | [15-meu-tempo-e-apontamentos.md](help-desk/15-meu-tempo-e-apontamentos.md) | Meu Tempo com projetos unificados, timer, lançamento manual, geração por ticket, histórico, totais e exportação | Rascunho |
| 17 | [17-central-de-relatorios.md](help-desk/17-central-de-relatorios.md) | Catálogo, geração e exportação de relatórios | Rascunho |

Ver mapa geral: [00-visao-geral.md](00-visao-geral.md)
