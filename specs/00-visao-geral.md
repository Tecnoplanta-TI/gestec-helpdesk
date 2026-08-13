# 00 — Visão Geral do Sistema

> Documento de referência. Atualizado conforme specs individuais forem criadas.

## Sobre o projeto

Este repositório concentra **specs de dois módulos distintos**, ambos integrados ao **Gestec existente** (`C:\Users\julia.souza\Gestec`).

Não são aplicações separadas: reutilizam login, layout, permissões (RBAC), componentes shadcn/ui e padrões de API do Gestec principal. Ver [referencia-gestec.md](../docs/referencia-gestec.md).

## Estrutura de pastas

```
specs/
├─ 00-visao-geral.md          ← este arquivo
├─ _template-spec.md          ← template geral
├─ gestec.desk/               ← specs do módulo Gestec Desk
└─ help-desk/                 ← specs do módulo Gestec Help Desk
```

| Módulo | Pasta | Sidebar | Rota base |
|--------|-------|---------|-----------|
| **Gestec Desk** | [gestec.desk/](gestec.desk/) | Gestec Desk | `/gestec-desk` |
| **Gestec Help Desk** | [help-desk/](help-desk/) | Gestec Help Desk | `/gestec_help_desk` |

---

## Gestec Desk

Inventário de estações de trabalho, cobertura por calendário e auditoria em massa.

**Status:** specs de telas **completas** — todas em Rascunho, aguardando revisão.

### Mapa de telas

| # | Tela | Rota | Arquivo | Status |
|---|------|------|---------|--------|
| 01 | Inventário e Auditoria | `/gestec-desk` | [gestec.desk/01-gestec-desk.md](gestec.desk/01-gestec-desk.md) | Rascunho |
| 01.1 | Detalhe da Estação (modal) | — | [gestec.desk/01.1-gestec-desk.md](gestec.desk/01.1-gestec-desk.md) | Rascunho |
| 01.1.1 | Aplicativos Instalados | — (modal sobre `/gestec-desk`) | [gestec.desk/01.1.1-gestec-desk.md](gestec.desk/01.1.1-gestec-desk.md) | Rascunho |
| 01.1.2 | Histórico (modal) | — | [gestec.desk/01.1.2-gestec-desk.md](gestec.desk/01.1.2-gestec-desk.md) | Rascunho |
| 01.1.3 | Inventário da Estação | `/gestec-desk/inventario/:hostname/:inventoryId` | [gestec.desk/01.1.3-gestec-desk.md](gestec.desk/01.1.3-gestec-desk.md) | Rascunho |
| 01.2 | Resultado da Auditoria em Massa | `/gestec-desk/auditoria/resultado` | [gestec.desk/01.2-gestec-desk.md](gestec.desk/01.2-gestec-desk.md) | Rascunho |

---

## Gestec Help Desk

Módulo de help desk / chamados.

**Status:** specs em andamento — primeira tela: Tickets (01).

### Mapa de telas

| # | Tela | Rota | Arquivo | Status |
|---|------|------|---------|--------|
| 01 | Tickets (lista) | `/gestec_help_desk` | [help-desk/01-help-desk.md](help-desk/01-help-desk.md) | Rascunho |
| 01.1 | Novo Ticket (modal) | — (modal sobre `/gestec_help_desk`) | [help-desk/01.1-help-desk.md](help-desk/01.1-help-desk.md) | Rascunho |
| 01.2 | Triagem do Ticket (modal) | — (modal sobre `/gestec_help_desk`) | [help-desk/01.2-help-desk.md](help-desk/01.2-help-desk.md) | Rascunho |
| 01.3 | Contato Inicial (modal) | — | [help-desk/01.3-help-desk.md](help-desk/01.3-help-desk.md) | Rascunho |
| 01.4 | Atender Solicitação (modal) | — | [help-desk/01.4-help-desk.md](help-desk/01.4-help-desk.md) | Rascunho |
| 01.5 | Aprovar Conclusão (modal) | — | [help-desk/01.5-help-desk.md](help-desk/01.5-help-desk.md) | Rascunho |
| 01.6 | Avaliação do Serviço (modal) | — | [help-desk/01.6-help-desk.md](help-desk/01.6-help-desk.md) | Rascunho |
| 02 | Kanban | `/gestec_help_desk/kanban` | [help-desk/02-kanban.md](help-desk/02-kanban.md) | Rascunho |
| 02.1 | Detalhe do ticket (Kanban) | `/gestec_help_desk/kanban/[ticketId]` | [help-desk/02.1-detalhe-ticket-kanban.md](help-desk/02.1-detalhe-ticket-kanban.md) | Rascunho |
| 02.1.1 | Anexos da despesa (modal) | — (modal sobre 02.1) | [help-desk/02.1.1-anexos-despesa.md](help-desk/02.1.1-anexos-despesa.md) | Rascunho |
| 03 | Acompanhar solicitações | `/gestec_help_desk/solicitacoes` | [help-desk/03-acompanhar-solicitacoes.md](help-desk/03-acompanhar-solicitacoes.md) | Rascunho |
| 04 | Integrações | `/gestec_help_desk/integracoes` | [help-desk/04-integracoes.md](help-desk/04-integracoes.md) | Rascunho |
| 04.1 | Configuração API | `/gestec_help_desk/integracoes/[id]` | [help-desk/04.1-configuracao-integracao-api.md](help-desk/04.1-configuracao-integracao-api.md) | Rascunho |

---

## Convenção de numeração

Cada módulo tem **numeração própria** dentro da sua pasta, começando em `01`:

| Pasta | Exemplo |
|-------|---------|
| `gestec.desk/` | `01`, `01.1`, `01.2` … |
| `help-desk/` | `01`, `01.1`, `01.2` … |

## Glossário

| Termo | Definição |
|-------|-----------|
| **Gestec Desk** | Módulo de inventário e auditoria de estações (agente desktop) |
| **Gestec Help Desk** | Módulo de help desk / chamados |

## Permissões globais

| Módulo | Permissão (sugerida) | Ações |
|--------|----------------------|-------|
| Gestec Desk | `gestec_desk` | `view`, `edit` |
| Gestec Help Desk | `gestec_help_desk` | `view`, `new`, `edit`, … — **TBD** |

## Integrações conhecidas

| Módulo | Integração |
|--------|------------|
| Gestec Desk | Azure Cosmos DB (`desk.inventories`), agente `gestec.desk` |
| Gestec Help Desk | Discord (webhook P1), APIs REST configuráveis — [04-integracoes.md](help-desk/04-integracoes.md) |
