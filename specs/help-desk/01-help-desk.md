# 01 — Tickets (Lista de Chamados)

## Metadados

| Campo | Valor |
|-------|-------|
| **ID** | 01 |
| **Nome** | Tickets |
| **Status** | Rascunho |
| **Última atualização** | 2026-07-20 |
| **Referência Figma** | Gestec Help Desk — Tickets (landing do módulo) |
| **Referência implementação** | `src/app/pcp/cadastros/colaboradores/page.tsx` (listagem), `src/components/app-sidebar.tsx` (widget sidebar) |

---

## 1. Objetivo

Tela **inicial** do módulo **Gestec Help Desk** — abre ao clicar em **Gestec Help Desk** na sidebar.

Permite a **todos os usuários com acesso ao módulo**:

1. **Abrir um novo ticket** pelo botão **+ Novo ticket**.
2. **Acompanhar chamados** em tabela com ID, prioridade, status, SLA, tipo etc.

O escopo da listagem depende do perfil:

| Perfil | O que vê na lista |
|--------|-------------------|
| **Usuário final (solicitante)** | Apenas tickets **que ele solicitou** (pendentes e demais status) |
| **Profissional help desk** | **Todos** os tickets (visão operacional) + **cronômetro** na sidebar |

O **cronômetro de atendimento** é exclusivo do profissional help desk — o solicitante **não** visualiza esse widget.

---

## 2. Acesso e permissões

### 2.1 Perfis na mesma tela

| Perfil | Acessa a página? | + Novo ticket | Lista exibida | Cronômetro |
|--------|------------------|---------------|---------------|------------|
| **Usuário final (solicitante)** | Sim | Sim | Só tickets **próprios** | **Não** |
| **Profissional help desk** | Sim | Sim | **Todos** os tickets | Sim (se sessão ativa) |
| Sem acesso ao módulo | Não | — | — | — |

> Solicitante e profissional usam a **mesma rota e layout**; a diferença é o **escopo da listagem** (API) e a **visibilidade do cronômetro**.

### 2.2 Permissões sugeridas

| Permissão | Quem | Uso |
|-----------|------|-----|
| `gestec_help_desk:new` | Solicitante + profissional | Abrir ticket; acesso base à página |
| `gestec_help_desk:view` | Profissional help desk | Listar todos os tickets; ver cronômetro |
| `gestec_help_desk:edit` | Profissional help desk | Pausar/finalizar cronômetro — **TBD** |

**Rota:** `/gestec_help_desk`

**Pré-condições:** Usuário autenticado via NextAuth

**Proteção da página** (acesso solicitante ou profissional):
```tsx
<ProtectedRoute
  module={Modules.GestecHelpDesk}
  action={Actions.New} // ou View — permitir quem pode criar OU operar
>
```

**Breadcrumb:** `Início / Gestec Help Desk / Tickets`

**Referência enum (a adicionar no Gestec):**
```ts
Modules.GestecHelpDesk = "gestec_help_desk"
```

---

## 3. Sidebar — módulo Help Desk

Ao entrar no módulo, a sidebar exibe grupo **Gestec Help Desk** (expandido):

| Item | Rota | Spec |
|------|------|------|
| **Tickets** | `/gestec_help_desk` | Esta spec (ativo) |
| Kanban | `/gestec_help_desk/kanban` | [02-kanban.md](02-kanban.md) |
| Acompanhar solicitações | `/gestec_help_desk/solicitacoes` | [03-acompanhar-solicitacoes.md](03-acompanhar-solicitacoes.md) |
| Integrações | `/gestec_help_desk/integracoes` | [04-integracoes.md](04-integracoes.md) |

Registrar em `sidebar-navigation.ts` seguindo padrão do item PCP (pai + subitens).

> **Tickets** e **Acompanhar solicitações** visíveis para solicitante e profissional. **Kanban** e **Integrações** tendem a ser **somente profissional** — ver spec de cada tela.

---

## 4. Layout e componentes

### 4.1 Estrutura visual

Layout padrão Gestec (`DefaultLayout`). Área principal em coluna única:

```
┌─────────────────────────────────────────────────────────────┐
│  [🌙] [⏱]                              [ + Novo ticket ]    │
│  Tickets                                                    │
│  Abra chamados e acompanhe o andamento de cada solicitação. │
├─────────────────────────────────────────────────────────────┤
│  ┌─ Lista de tickets ─────────────────────────────────────┐ │
│  │ X chamados no total.    [Todas prioridades ▼] [Status ▼]│ │
│  │ ┌─────────────────────────────────────────────────────┐│ │
│  │ │ ID │ Solicitante │ Descrição │ Prioridade │ ...     ││ │
│  │ └─────────────────────────────────────────────────────┘│ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

Sidebar (rodapé, acima do usuário):
┌─ Cronômetro ─────────────────┐
│ Título teste                 │
│ [Ticket] [Rodando]           │
│        00:00:14              │
│    [⏸ Pausar]  [⏹ Parar]    │
│ Abrir ticket                 │
└──────────────────────────────┘
```

### 4.2 Header da página

| Elemento | Componente | Conteúdo / comportamento |
|----------|------------|--------------------------|
| Título | `Title` | **Tickets** |
| Subtítulo | `Description` | Abra chamados e acompanhe o andamento de cada solicitação. |
| Novo ticket | `Button` primary (verde Figma) | **+ Novo ticket** — `gestec_help_desk:new` (solicitante e profissional) |
| Modo escuro | Toggle existente | Ícone lua — padrão Gestec (`SiteHeader`) |
| Cronômetro (header) | `Button` icon | Ícone stopwatch — **somente profissional**; **TBD** |

### 4.3 Card — Lista de tickets

| Componente | Uso |
|------------|-----|
| `Card` | Container "Lista de tickets" |
| Texto contador | `{total} chamados no total.` |
| `Select` | Filtro prioridade — default **Todas prioridades** |
| `Select` | Filtro status — default **Todos os status** |
| `DataTable` / `Table` | Listagem paginada |

**Referência:** `src/app/pcp/cadastros/colaboradores/components/data-table.tsx`

### 4.4 Colunas da tabela

| Coluna | Conteúdo | Formatação |
|--------|----------|------------|
| **ID** | Identificador do ticket | Texto/link verde; clicável → detalhe (spec futura) |
| **Solicitante** | Nome de quem abriu | Texto; **ocultar coluna** na visão do solicitante (sempre ele mesmo) — **TBD** |
| **Descrição** | Resumo do chamado | Truncar com ellipsis se longo |
| **Prioridade** | P1–P4 | `Badge` circular/colorido |
| **Status** | Etapa do fluxo | Texto |
| **SLA** | Situação do prazo | `Badge` pill — ver §4.6 |
| **Tipo de solicitação** | Categoria do chamado | Texto |

**Clique na linha** (ou no ID): modal por **status** e **perfil** — 01.2–01.4 (help desk) · [01.5](01.5-help-desk.md) / [01.6](01.6-help-desk.md) (solicitante).

### 4.5 Prioridades

| Valor | Label UI | Cor (Figma) |
|-------|----------|-------------|
| `p1` | **P1** | Vermelho |
| `p2` | **P2** | Laranja |
| `p3` | **P3** | Amarelo |
| `p4` | **P4** | Verde |

Usar variantes de `Badge` ou classes Tailwind consistentes com design system.

### 4.6 SLA

Exemplos no Figma:

| Estado | Exibição |
|--------|----------|
| Fora do prazo | Badge vermelho: `Fora do prazo • (Tempo passado)` |
| No prazo | **TBD** — ex.: `No prazo • restante` |
| Pausado / N/A | **TBD** |

Cálculo de SLA: **TBD** (depende de regra por prioridade + data abertura).

### 4.7 Status (workflow)

Valores visíveis no mockup (lista não exaustiva — **TBD** cadastro completo):

| Status |
|--------|
| Triagem |
| Contato inicial |
| Aprovar apontamentos |
| … |

Filtro **Todos os status** lista todos os status ativos do sistema.

### 4.8 Tipos de solicitação

| Tipo |
|------|
| Solicitação |
| Melhoria |
| Cancelamento de solicitações |
| Interrupção de serviço |
| Incidente — **TBD** |

> **Grupo de serviço** "Aquisição / alocação" exige código do bem no modal [01.1](01.1-help-desk.md) — não é um Tipo.

---

## 5. Cronômetro de atendimento (sidebar)

Widget fixo no **rodapé da sidebar**, **acima** do bloco do usuário (`NavUser`).

Visível **somente** para **profissional help desk** (`gestec_help_desk:view`), **e** quando existe sessão de cronômetro **ativa ou pausada** vinculada a um ticket.

> **Usuário final (solicitante) nunca vê o cronômetro** — nem widget, nem ícone no header (se aplicável).

### 5.1 Layout do widget

| Elemento | Descrição |
|----------|-----------|
| Título | Título do ticket em atendimento (ex.: "Título teste") |
| Badge **Ticket** | Identifica contexto |
| Badge **Rodando** / **Pausado** | Estado do cronômetro (verde quando rodando) |
| Display | Tempo elapsed `HH:MM:SS` (ex.: `00:00:14`) — atualiza em tempo real |
| **Pausar** | Botão ícone ⏸ — pausa contagem |
| **Parar** | Botão ícone ⏹ vermelho — **finaliza** atendimento e registra tempo |
| **Abrir ticket** | Link — navega para detalhe do ticket vinculado |

### 5.2 Comportamento

| Ação | Resultado |
|------|-----------|
| Iniciar cronômetro | Ao **Iniciar contato inicial** ([01.3](01.3-help-desk.md)) |
| Pausar | Para contagem; badge → **Pausado**; tempo preservado |
| Retomar | **TBD** — mesmo botão alterna Pausar/Retomar |
| Parar (finalizar) | Encerra sessão; salva duração no ticket; oculta widget ou mostra empty |
| Abrir ticket | `router.push` → `/gestec_help_desk/tickets/:id` (rota TBD) |
| Persistência | Widget permanece visível ao navegar entre páginas do módulo Help Desk |

### 5.3 Implementação sugerida

| Item | Sugestão |
|------|----------|
| Componente | `HelpDeskTimerWidget.tsx` em `SidebarFooter`, antes de `NavUser` |
| Estado global | Context + TanStack Query ou Zustand (`useHelpDeskTimer`) |
| Sincronização | API persiste start/pause/stop — evitar perda ao refresh |
| Permissão | `useHasPermission(Modules.GestecHelpDesk, Actions.View)` — **não** renderizar para solicitante |

---

## 6. Ações do usuário

| Ação | Gatilho | Resultado | Spec filha |
|------|---------|-----------|------------|
| Novo ticket | **+ Novo ticket** | Abre modal criação | [01.1](01.1-help-desk.md) |
| Filtrar prioridade | Select | Recarrega lista filtrada | — |
| Filtrar status | Select | Recarrega lista filtrada | — |
| Ver modal | Clique ID/linha | Por status/perfil | 01.2–01.6 |
| Pausar timer | Botão sidebar | Pausa cronômetro | Somente profissional |
| Finalizar timer | Botão parar | Registra tempo e encerra | Somente profissional |
| Abrir ticket (timer) | Link sidebar | Detalhe do ticket ativo | Somente profissional |

---

## 7. Integrações / API

| Operação | Método | Endpoint | Quando |
|----------|--------|----------|--------|
| Listar tickets | GET | `/api/v1/gestec-help-desk/tickets` | Carregar página / filtros |
| Timer ativo | GET | `/api/v1/gestec-help-desk/timer/active` | Montar sidebar |
| Pausar timer | POST | `/api/v1/gestec-help-desk/timer/:id/pause` | Clique pausar |
| Retomar timer | POST | `/api/v1/gestec-help-desk/timer/:id/resume` | Clique retomar |
| Finalizar timer | POST | `/api/v1/gestec-help-desk/timer/:id/stop` | Clique parar |

**Query params (listagem):**

| Param | Descrição |
|-------|-----------|
| `priority` | `p1`…`p4` ou omitido = todas |
| `status` | slug do status ou omitido = todos |
| `page`, `pageSize` | Paginação server-side (> 50 itens) |

**Response listagem (exemplo):**
```json
{
  "total": 42,
  "page": 1,
  "pageSize": 20,
  "items": [
    {
      "id": "TK-000123",
      "requesterName": "Maria Silva",
      "description": "Resumo do chamado…",
      "priority": "p1",
      "status": "triagem",
      "statusLabel": "Triagem",
      "sla": { "state": "overdue", "label": "Fora do prazo • (Tempo passado)" },
      "requestType": "incidente"
    }
  ]
}
```

**Models Prisma:** **TBD** (`Ticket`, `TicketTimer`, `TicketStatus`, etc.)

**Escopo da listagem (backend — obrigatório):**

| Perfil | Regra |
|--------|-------|
| Solicitante | `WHERE requester_id = session.userId` |
| Profissional (`gestec_help_desk:view`) | Todos os tickets (filtros opcionais) |

**Permissão API listagem:** `gestec_help_desk:new` (próprios) ou `gestec_help_desk:view` (todos)

**Permissão API timer:** `gestec_help_desk:view` (ou `:edit`) — **nunca** expor ao solicitante

---

## 8. Regras de negócio

1. Landing do módulo Help Desk = esta página de tickets — **solicitante e profissional**.
2. Solicitante vê **apenas tickets que ele abriu**; profissional vê **todos**.
3. **+ Novo ticket** disponível para ambos os perfis (`gestec_help_desk:new`).
4. **Cronômetro** exclusivo do profissional help desk — solicitante não vê widget nem controles.
5. Filtros (prioridade + status) aplicam-se sobre o escopo já filtrado por perfil.
6. SLA calculado no **backend**; UI apenas exibe estado formatado.
7. Cronômetro: **um timer ativo por profissional** por vez — **TBD** confirmar.
8. Ao finalizar timer, tempo pode virar **apontamento** — ver [01.4](01.4-help-desk.md).

---

## 9. Estados da tela

| Estado | UI |
|--------|-----|
| Carregando | Skeleton na tabela |
| Sucesso | Lista + contador |
| Vazio (solicitante) | "Você ainda não abriu chamados." + CTA Novo ticket |
| Erro API | Toast (Sonner) + retry |
| Filtro sem resultado | Tabela vazia + mensagem |
| Timer inativo | Widget oculto na sidebar |
| Timer rodando | Widget visível + contagem ao vivo |

---

## 10. Navegação

| Origem | Destino |
|--------|---------|
| Sidebar — Gestec Help Desk | `/gestec_help_desk` |
| + Novo ticket | Modal [01.1](01.1-help-desk.md) |
| Clique ticket | Modal por status (01.2 → 01.3 → 01.4) |
| Timer — Abrir ticket | Modal conforme status (ex.: 01.4 em atendimento) |
| Sidebar — Kanban | [02-kanban.md](02-kanban.md) → detalhe [02.1](02.1-detalhe-ticket-kanban.md) |
| Sidebar — Acompanhar solicitações | [03-acompanhar-solicitacoes.md](03-acompanhar-solicitacoes.md) |

---

## 11. Implementação sugerida (arquivos)

| Item | Caminho sugerido no Gestec |
|------|----------------------------|
| Página | `src/app/gestec_help_desk/page.tsx` |
| Tabela | `src/app/gestec_help_desk/components/tickets-data-table.tsx` |
| Timer widget | `src/components/help-desk/help-desk-timer-widget.tsx` |
| Hook listagem | `src/hooks/actions/help-desk/use-tickets.ts` |
| Hook timer | `src/hooks/actions/help-desk/use-help-desk-timer.ts` |
| Sidebar config | `src/lib/sidebar-navigation.ts` |
| API | `src/app/api/v1/gestec-help-desk/tickets/route.ts` |

---

## 12. Critérios de aceite

- [ ] Rota `/gestec_help_desk` com layout Gestec e `ProtectedRoute`
- [ ] Item **Gestec Help Desk** na sidebar com subitens (Tickets ativo)
- [ ] Título, subtítulo e botão **+ Novo ticket** conforme Figma
- [ ] Card lista com contador e filtros prioridade/status
- [ ] Tabela com 7 colunas e badges de prioridade coloridos
- [ ] SLA exibido conforme estado (fora do prazo no mockup)
- [ ] **+ Novo ticket** abre modal [01.1](01.1-help-desk.md)
- [ ] Clique abre modal correto por status (01.2 / 01.3 / 01.4)
- [ ] Solicitante acessa página, cria ticket e vê **somente** seus chamados
- [ ] Profissional vê **todos** os tickets
- [ ] Cronômetro na sidebar: título, badges, tempo, pausar, parar, Abrir ticket — **só profissional**
- [ ] Solicitante **não** vê cronômetro (sidebar nem header)
- [ ] Permissões `gestec_help_desk:new` (ambos) e `:view` (profissional)

---

## 13. Observações e pendências

- **Spec [01.1](01.1-help-desk.md)** — Novo ticket (modal)
- **Spec [01.2](01.2-help-desk.md)** — Triagem (modal)
- **Spec [01.3](01.3-help-desk.md)** — Contato inicial (modal)
- **Spec [01.4](01.4-help-desk.md)** — Atender solicitação (modal)
- **Spec [01.5](01.5-help-desk.md)** — Aprovar conclusão (solicitante)
- **Spec [01.6](01.6-help-desk.md)** — Avaliação do serviço (NPS)
- **Spec [02-kanban.md](02-kanban.md)** — Kanban · **02.1** detalhe · **02.1.1** anexos despesa
- **Spec [03-acompanhar-solicitacoes.md](03-acompanhar-solicitacoes.md)** — Acompanhar solicitações
- **Spec [04-integracoes.md](04-integracoes.md)** — Integrações · **04.1** editor API
| Sidebar — Integrações | [04-integracoes.md](04-integracoes.md) → config [04.1](04.1-configuracao-integracao-api.md) |
- Lista completa de **status** do workflow — TBD
- Regra de cálculo **SLA** — TBD
- Ícone stopwatch no header — comportamento TBD
- Prefixo API final: `gestec-help-desk` vs `help-desk` — alinhar na 01.1

---

## 14. Histórico de revisões

| Data | Autor | Alteração |
|------|-------|-----------|
| 2026-07-20 | Cursor | Solicitante acessa página e vê próprios tickets; cronômetro só profissional |
| 2026-07-20 | Cursor | Criação inicial |
