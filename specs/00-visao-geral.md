# 00 — Visão Geral do Sistema

> Documento de referência. Atualizado conforme specs individuais forem criadas.

## Sobre o projeto

Este repositório concentra **specs de dois módulos distintos**, ambos integrados ao **Gestec existente** (`C:\Users\julia.souza\Gestec`).

Não são aplicações separadas: reutilizam login, layout, permissões (RBAC), componentes shadcn/ui e padrões de API do Gestec principal. Ver [referencia-gestec.md](../docs/referencia-gestec.md).

## Preset shadcn obrigatório para implementação

Toda implementação de interface dos módulos Gestec Help Desk e Gestec Desk deve utilizar obrigatoriamente o preset shadcn `b2D0vQOME`. Esta decisão é `CONFIRMED`, não está `VALIDAR` nem `TO_DEFINE` e não pode ser substituída por outro preset durante o coding.

No repositório executável, a inicialização obrigatória deve ser executada na raiz do projeto Next.js com o comando exato:

```bash
npx shadcn@latest init --preset b2D0vQOME --template next
```

O comando não deve ser executado neste repositório de Specs. Se o repositório executável já possuir configuração shadcn, a integração deve preservar o preset `b2D0vQOME` e reconciliar os arquivos existentes sem alterar a decisão visual.

## Decisões de produto confirmadas pelo solicitante

As decisões abaixo são `CONFIRMED` e obrigatórias na futura implementação. Elas complementam os documentos de origem sem substituir regras de segurança, RBAC ou pontos explicitamente marcados como `VALIDAR`:

- **Rastreador de tempo nativo:** o Gestec Help Desk deve possuir o **Meu Tempo**, com barra sem campo de ticket, timer persistente, lançamento manual, seletor único de projetos, centros de custo do Gestec disponibilizados automaticamente, projetos manuais autorizados, geração de apontamentos por ticket, histórico agrupado, totais, filtros, edição, exclusão lógica e exportação autorizada. Os anexos do Clockify são somente referência estrutural; não existe dependência, integração, cópia de identidade ou uso da marca Clockify.
- **Navegação de tempo:** **Apontamentos** não é página principal nem item separado da sidebar; todo o fluxo fica em **Meu Tempo** e em suas continuações. O recurso pertence ao Gestec Help Desk, nunca ao Gestec Desk.
- **Exportação obrigatória:** apontamentos devem ser exportáveis em arquivo Excel `.xlsx`; CSV não substitui esse requisito. O contrato completo está na [Spec 15](help-desk/15-meu-tempo-e-apontamentos.md).
- **Processamento assíncrono:** jobs usam obrigatoriamente **pg-boss sobre PostgreSQL**; Redis e BullMQ não fazem parte da stack aprovada.
- **Interface:** o preset shadcn obrigatório é `b2D0vQOME`, inicializado no repositório executável com `npx shadcn@latest init --preset b2D0vQOME --template next`.
- **Navegação contextual:** cada tela e continuação mantém o item correto selecionado na sidebar e apresenta breadcrumb/top bar coerente com o contexto atual.
- **Escopos de tela confirmados:** **Minha Caixa** (`02`), **Tickets — Ações em massa** (`01.7`) e **Conhecimento — Categorias e tags** (`09.3`) fazem parte do produto conforme suas histórias e contratos visuais.

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

**Status:** telas e fluxos principais em `01`–`04.1`; capacidades complementares em `05`–`07`; telas operacionais com classificação por história em `08`–`12`, `14`, `15` e `17`. Minha Caixa, ações em massa, categorias/tags e Meu Tempo estão confirmados nos respectivos documentos.

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
| 05 | Ciclo de vida do ticket | transversal | [help-desk/05-ciclo-de-vida-e-colaboracao.md](help-desk/05-ciclo-de-vida-e-colaboracao.md) | Rascunho |
| 06 | Operação, SLA e notificações | transversal/admin | [help-desk/06-operacao-sla-workflow-notificacoes.md](help-desk/06-operacao-sla-workflow-notificacoes.md) | Rascunho |
| 07 | Administração e insights | transversal/admin | [help-desk/07-administracao-projetos-e-insights.md](help-desk/07-administracao-projetos-e-insights.md) | Rascunho |
| 08 | Central de Notificações | `/gestec_help_desk/notificacoes` | [help-desk/08-central-de-notificacoes.md](help-desk/08-central-de-notificacoes.md) | Rascunho |
| 09 | Monitor de SLA | `/gestec_help_desk/sla/monitor` | [help-desk/09-monitor-de-sla.md](help-desk/09-monitor-de-sla.md) | Rascunho |
| 10 | Execuções de Integrações | `/gestec_help_desk/integracoes/execucoes` | [help-desk/10-execucoes-de-integracoes.md](help-desk/10-execucoes-de-integracoes.md) | Rascunho |
| 11 | Minha Caixa | `/gestec_help_desk/minha-caixa` | [help-desk/11-minha-caixa-e-visoes-salvas.md](help-desk/11-minha-caixa-e-visoes-salvas.md) | Rascunho |
| 12 | Portal de Conhecimento | `/gestec_help_desk/conhecimento` | [help-desk/12-portal-de-conhecimento.md](help-desk/12-portal-de-conhecimento.md) | Rascunho |
| 14 | Relatórios Agendados | `/gestec_help_desk/relatorios/agendamentos` | [help-desk/14-relatorios-agendados.md](help-desk/14-relatorios-agendados.md) | Rascunho |
| 15 | Meu Tempo — timer, projetos unificados e apontamentos | `/gestec_help_desk/meu-tempo` | [help-desk/15-meu-tempo-e-apontamentos.md](help-desk/15-meu-tempo-e-apontamentos.md) | Rascunho |
| 17 | Central de Relatórios | `/gestec_help_desk/relatorios`, `/gestec_help_desk/relatorios/[reportType]` | [help-desk/17-central-de-relatorios.md](help-desk/17-central-de-relatorios.md) | Rascunho |

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
