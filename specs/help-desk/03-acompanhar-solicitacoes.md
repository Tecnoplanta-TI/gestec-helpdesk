# 03 — Acompanhar Solicitações

## Metadados

| Campo | Valor |
|-------|-------|
| **ID** | 03 |
| **Nome** | Acompanhar Solicitações |
| **Status** | Rascunho |
| **Última atualização** | 2026-07-20 |
| **Referência Figma** | Gestec Help Desk — Acompanhar solicitações |
| **Referência implementação** | `src/app/cadastros/permissoes/components/filter-drawer.tsx` (painel filtros), [01-help-desk.md](01-help-desk.md) (tabela) |
| **Spec pai** | [01-help-desk.md](01-help-desk.md) (módulo) |

---

## 1. Objetivo

**Subpágina** do módulo Help Desk — sidebar **Acompanhar solicitações** (`/gestec_help_desk/solicitacoes`).

Permite **acompanhar chamados em aberto ou finalizados**, filtrando conforme a **participação do usuário** no fluxo (referência operacional: **Zeev**).

Diferente da landing [Tickets (01)](01-help-desk.md) — foco operacional do help desk — esta tela prioriza **visão de acompanhamento** com painel de filtros lateral e escopo por participação.

**Ações principais:**

1. Filtrar chamados (participação, prioridade, status).
2. Listar tickets **abertos** e **encerrados** conforme filtros.
3. Clicar no **ID** para **visualizar** os dados do chamado.

---

## 2. Acesso e permissões

| Perfil | Acesso | Escopo default |
|--------|--------|----------------|
| **Solicitante** | Sim | **Minhas solicitações** (tickets que abriu) |
| **Profissional help desk** | Sim | **Minhas solicitações** ou escopos ampliados — **TBD** |
| Sem acesso ao módulo | Não | — |

**Rota:** `/gestec_help_desk/solicitacoes`

**Permissões:**

| Permissão | Uso |
|-----------|-----|
| `gestec_help_desk:new` | Acesso à página (solicitante) |
| `gestec_help_desk:view` | Escopos ampliados + cronômetro sidebar |

**Proteção:**
```tsx
<ProtectedRoute
  module={Modules.GestecHelpDesk}
  action={Actions.New} // ou View — quem cria OU opera
>
```

**Breadcrumb:** `Início / Gestec Help Desk / Acompanhar solicitações`

**Cronômetro** sidebar ([01](01-help-desk.md) §5): somente profissional help desk.

---

## 3. Layout e componentes

### 3.1 Estrutura visual

Layout padrão Gestec. Área principal em **duas colunas**:

```
┌──────────────────────────────────────────────────────────────────┐
│  [🌙] [⏱]                                    [ + Novo ticket ]   │
│  Acompanhar solicitações                                         │
│  Visualize e filtre os chamados conforme sua participação...    │
├──────────────┬───────────────────────────────────────────────────┤
│  FILTROS     │  Lista de tickets                                 │
│              │  {n} chamados em {escopo filtro}                  │
│  Acompanhar  │  ┌─────────────────────────────────────────────┐  │
│  solicitação │  │ ID │ Solicitante │ Descrição │ Prioridade │…│  │
│  Prioridade  │  └─────────────────────────────────────────────┘  │
│  Status      │                                                   │
│  Limpar      │                                                   │
└──────────────┴───────────────────────────────────────────────────┘
```

### 3.2 Header

| Elemento | Conteúdo |
|----------|----------|
| `Title` | **Acompanhar solicitações** |
| `Description` | Visualize e filtre os chamados conforme sua participação, como no Zeev. |
| **+ Novo ticket** | Botão verde — abre [01.1](01.1-help-desk.md) |

### 3.3 Painel FILTROS (coluna esquerda)

`Card` com título **FILTROS**:

| Campo | Componente | Default | Opções |
|-------|------------|---------|--------|
| **Acompanhar solicitação** | `Select` | Minhas solicitações | Ver §3.4 |
| **Prioridade** | `Select` | Todas prioridades | P1–P4 + todas |
| **Status** | `Select` | Todos os status | Abertos, finalizados e etapas — §3.5 |

| Ação | **Limpar filtros** — link/texto; restaura defaults |

Filtros aplicam **automaticamente** ao alterar (ou botão Aplicar — **TBD** UX).

**Referência:** `filter-drawer.tsx` (padrão de filtros Gestec), adaptado como coluna fixa.

### 3.4 Escopo — Acompanhar solicitação

| Valor | Label | Quem vê | Descrição |
|-------|-------|---------|-----------|
| `minhas` | **Minhas solicitações** | Todos | Tickets **abertos ou finalizados** em que o usuário é **solicitante** |
| `participacao` | Onde participo | **TBD** | Tickets em que o usuário atuou (aprovador, observador, etc.) |
| `equipe` | Minha equipe | Help desk **TBD** | Tickets da equipe/centro de custo |
| `todas` | Todas | Help desk **TBD** | Visão ampla (similar [01](01-help-desk.md)) |

Mockup Figma: default **Minhas solicitações**.

Contador da lista reflete o escopo: *"4 chamados em minhas solicitações"*.

### 3.5 Status — abertos e finalizados

Inclui tickets **em andamento** e **encerrados** (concluídos, recusados, cancelados — **TBD** lista).

Exemplos no mockup:

| Status |
|--------|
| Abertura de ticket manual |
| Triagem |
| Em atendimento |
| Aguardando avaliação |
| Concluído — **TBD** |
| Recusado — **TBD** |

Filtro **Todos os status** não exclui finalizados — usuário filtra explicitamente se quiser só abertos ou só encerrados — **TBD** agrupamento no select.

### 3.6 Card — Lista de tickets (coluna direita)

| Elemento | Conteúdo |
|----------|----------|
| Título | **Lista de tickets** |
| Contador | `{n} chamados em {label do escopo}` — ex.: *4 chamados em minhas solicitações* |
| Tabela | `DataTable` / `Table` paginada |

### 3.7 Colunas da tabela

| Coluna | Conteúdo | Formatação |
|--------|----------|------------|
| **ID** | Identificador | Link verde; **clicável** → visualização §4 |
| **Solicitante** | Nome de quem abriu | Texto |
| **Descrição** | Resumo do chamado | Truncar com ellipsis |
| **Prioridade** | P1–P4 | `Badge` — cores [01](01-help-desk.md) §4.5 |
| **Status** | Etapa atual ou final | Texto |
| **SLA** | Situação do prazo | `Badge` pill vermelho quando expirado — §3.8 |
| **Origem** | Como o ticket foi criado | ex.: **Manual**, Discord, E-mail — **TBD** |

> Coluna **Tipo de solicitação** da [01](01-help-desk.md) **não** aparece neste mockup; substituída por **Origem**.

### 3.8 SLA (mockup)

| Estado | Exibição |
|--------|----------|
| Fora do SLA | Badge vermelho: **Fora do SLA** + linha secundária *Expirado há {Xh Ymin}* |
| No prazo | **TBD** |
| Encerrado / N/A | **TBD** — ocultar ou "—" |

Mesma regra de cálculo backend que [01](01-help-desk.md) §4.6.

---

## 4. Visualização ao clicar no ID

| Situação | Destino |
|----------|---------|
| Ticket **em aberto** — solicitante | Modal conforme status: [01.5](01.5-help-desk.md), [01.6](01.6-help-desk.md), ou somente leitura — **TBD** |
| Ticket **em aberto** — help desk | Modal operacional [01.2](01.2-help-desk.md)–[01.4](01.4-help-desk.md) ou [02.1](02.1-detalhe-ticket-kanban.md) |
| Ticket **finalizado** | Visualização **somente leitura** dos dados — **TBD** rota `/gestec_help_desk/solicitacoes/[ticketId]` ou modal |

**Objetivo:** usuário consulta metadados, histórico e status sem necessariamente executar transição de workflow.

Spec dedicada de detalhe read-only — **03.1** — criar se escopo divergir de 02.1.

---

## 5. Dados e API

| Operação | Método | Endpoint |
|----------|--------|----------|
| Listar com filtros | GET | `/api/v1/gestec-help-desk/tickets/tracking` |

**Query params:**
```
?scope=minhas|participacao|equipe|todas
&priority=p1|p2|p3|p4|all
&status={statusId}|all
&page=1&pageSize=20
```

**Response (exemplo):**
```json
{
  "total": 4,
  "scopeLabel": "minhas solicitações",
  "items": [
    {
      "id": "01010101",
      "requesterName": "Nome teste",
      "description": "Descrição teste...",
      "priority": "p2",
      "status": "Aguardando avaliação",
      "sla": {
        "state": "expired",
        "label": "Fora do SLA",
        "detail": "Expirado há 42h 38min"
      },
      "origin": "manual",
      "isFinished": false
    }
  ]
}
```

Backend filtra por **participação** conforme `scope` e usuário autenticado.

---

## 6. Relação com Tickets (01)

| Aspecto | [01 — Tickets](01-help-desk.md) | **03 — Acompanhar** |
|---------|--------------------------------|---------------------|
| Público | Solicitante + help desk | Solicitante + help desk |
| Layout | Lista única + filtros inline | **Painel filtros** + lista |
| Escopo lista | Solicitante: próprios · HD: todos | Por **participação** (default: minhas) |
| Finalizados | Incluídos na lista | **Ênfase** em abertos **e** finalizados |
| Coluna extra | Tipo de solicitação | **Origem** |
| Operação HD | Visão operacional principal | Acompanhamento estilo Zeev |

Ambas compartilham **+ Novo ticket**, modais 01.x e regras de prioridade/SLA.

---

## 7. Navegação

| Origem | Destino |
|--------|---------|
| Sidebar — Acompanhar solicitações | `/gestec_help_desk/solicitacoes` |
| Clique ID | Visualização §4 |
| + Novo ticket | Modal [01.1](01.1-help-desk.md) |
| Cronômetro — Abrir ticket | Detalhe do ticket ativo |

---

## 8. Critérios de aceite

- [ ] Rota `/gestec_help_desk/solicitacoes` com layout Gestec
- [ ] Header, subtítulo e **+ Novo ticket**
- [ ] Painel **FILTROS** com 3 selects + Limpar filtros
- [ ] Default **Minhas solicitações**
- [ ] Lista com contador contextual ao escopo
- [ ] 7 colunas: ID, Solicitante, Descrição, Prioridade, Status, SLA, Origem
- [ ] Tickets abertos **e** finalizados listados conforme filtros
- [ ] Clique no ID abre visualização dos dados
- [ ] SLA expirado: Fora do SLA + tempo decorrido
- [ ] Item sidebar **Acompanhar solicitações** ativo
- [ ] Cronômetro sidebar só para help desk

---

## 9. Histórico de revisões

| Data | Autor | Alteração |
|------|-------|-----------|
| 2026-07-20 | Cursor | Criação inicial |
