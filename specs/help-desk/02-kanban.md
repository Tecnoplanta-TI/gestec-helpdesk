# 02 — Kanban

## Metadados

| Campo | Valor |
|-------|-------|
| **ID** | 02 |
| **Nome** | Kanban |
| **Status** | Rascunho |
| **Última atualização** | 2026-07-20 |
| **Referência Figma** | Gestec Help Desk — Kanban (colunas por tipo) |
| **Spec pai** | [01-help-desk.md](01-help-desk.md) (módulo) |

---

## 1. Objetivo

**Subpágina** do módulo Help Desk — acessível pela sidebar **Kanban** (`/gestec_help_desk/kanban`).

Visualiza chamados em **quadro Kanban**, organizados por **tipo de solicitação** (grupo/coluna). Destinada principalmente ao **profissional help desk** para visão operacional por categoria.

Clique no card abre [Detalhe do ticket (02.1)](02.1-detalhe-ticket-kanban.md).

---

## 2. Acesso e permissões

| Perfil | Acesso |
|--------|--------|
| **Profissional help desk** (`gestec_help_desk:view`) | Sim — visão completa |
| **Solicitante** | **TBD** — provavelmente sem acesso ao Kanban |
| Sem permissão | Acesso negado |

**Rota:** `/gestec_help_desk/kanban`

**Proteção:**
```tsx
<ProtectedRoute module={Modules.GestecHelpDesk} action={Actions.View}>
```

**Breadcrumb:** `Início / Gestec Help Desk / Kanban`

**Cronômetro** sidebar ([01](01-help-desk.md) §5): visível para help desk quando ativo.

---

## 3. Layout e componentes

### 3.1 Header

| Elemento | Conteúdo |
|----------|----------|
| `Title` | **Kanban** |
| `Description` | Visualize os chamados organizados por etapa do workflow. |

> Texto Figma menciona "etapa do workflow"; colunas do mockup são por **tipo** (Solicitação, Incidente, …). Implementar colunas conforme Figma; evolução por etapa workflow — **TBD**.

### 3.2 Quadro Kanban

Layout horizontal com **4 colunas** (scroll horizontal se necessário):

| Coluna | `type` API | Contador |
|--------|------------|----------|
| **Solicitação** | `solicitacao` | `{n}` no header |
| **Incidente** | `incidente` | idem |
| **Melhoria** | `melhoria` | idem |
| **Interrupção de serviços** | `interrupcao_servico` | idem |

Cada coluna: header (nome + badge contagem) + lista vertical de **cards**.

### 3.3 Card do ticket

| Elemento | Conteúdo |
|----------|----------|
| **Título** | Título do chamado — ex.: *Titulo Teste* |
| **Solicitante** | Nome do solicitante — ex.: *João Lopes* |
| **Prioridade** | Badge circular P1–P4 (cores iguais [01](01-help-desk.md)) |
| **SLA** | Pill vermelho: `Fora do prazo • (Tempo passado)` ou estado equivalente |

**Interação:** clique no card → navega para `/gestec_help_desk/kanban/[ticketId]` ([02.1](02.1-detalhe-ticket-kanban.md)).

**Drag-and-drop** entre colunas — **TBD** (não indicado no Figma).

### 3.4 Componentes (shadcn/ui)

| Componente | Uso |
|------------|-----|
| `Card` | Coluna e card de ticket |
| `Badge` | Prioridade, SLA, contador coluna |
| `ScrollArea` | Colunas com muitos cards |
| Layout flex/grid | Colunas lado a lado |

**Referência implementação:** biblioteca Kanban opcional (`@dnd-kit` ou colunas CSS) — manter padrão Gestec.

---

## 4. Dados e API

| Operação | Método | Endpoint |
|----------|--------|----------|
| Listar Kanban | GET | `/api/v1/gestec-help-desk/kanban?groupBy=type` |

**Response (exemplo):**
```json
{
  "columns": [
    {
      "type": "solicitacao",
      "label": "Solicitação",
      "count": 1,
      "items": [
        {
          "id": "TK-001",
          "title": "Titulo Teste",
          "requesterName": "João Lopes",
          "priority": "p3",
          "sla": { "state": "overdue", "label": "Fora do prazo • (Tempo passado)" }
        }
      ]
    }
  ]
}
```

**Permissão API:** `gestec_help_desk:view`

---

## 5. Regras de negócio

1. Apenas tickets **ativos** no quadro — concluídos/recusados fora — **TBD**.
2. Coluna = **tipo de solicitação** alinhado ao [01.1](01.1-help-desk.md).
3. SLA calculado no backend (mesma regra [01](01-help-desk.md)).
4. Atualização ao retornar do detalhe (02.1) via invalidação de query.

---

## 6. Navegação

| Origem | Destino |
|--------|---------|
| Sidebar — Kanban | `/gestec_help_desk/kanban` |
| Clique card | [02.1](02.1-detalhe-ticket-kanban.md) |
| Cronômetro — Abrir ticket | 02.1 se ticket ativo |

---

## 7. Critérios de aceite

- [ ] Rota `/gestec_help_desk/kanban` com layout Gestec
- [ ] 4 colunas por tipo com contador
- [ ] Cards: título, solicitante, prioridade, SLA
- [ ] Clique abre detalhe 02.1
- [ ] Permissão help desk
- [ ] Item **Kanban** ativo na sidebar

---

## 8. Histórico de revisões

| Data | Autor | Alteração |
|------|-------|-----------|
| 2026-07-20 | Cursor | Criação inicial |
