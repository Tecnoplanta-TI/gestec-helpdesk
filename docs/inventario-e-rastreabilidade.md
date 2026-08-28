# Inventário e Rastreabilidade de Requisitos

## 1. Escopo e hierarquia das fontes

1. Specs atuais deste repositório definem o produto planejado.
2. Decisões técnicas confirmadas restringem a futura implementação.
3. O protótipo legado é evidência de descoberta, não arquitetura a copiar.
4. O Pencil materializa a experiência; divergência funcional deve ser resolvida em favor da Spec e marcada `VALIDAR` quando faltar decisão.

Classificações: `CONFIRMED`, `INFERRED` e `PROPOSED`. IDs retirados do escopo permanecem indisponíveis e não são renumerados.

## 2. Inventário das Specs

### 2.1 Gestec Help Desk

| ID | Área | Cobertura | Estado |
|----|------|-----------|--------|
| 01–01.6 | Tickets | Lista, criação, triagem, contato, atendimento, aprovação e avaliação | PARTIAL — decisões abertas registradas em gaps |
| 02–02.1.1 | Kanban | Quadro, detalhe e anexos de despesa | PARTIAL — drag-and-drop e colunas ainda `VALIDAR` |
| 03 | Solicitações | Consulta e acompanhamento do solicitante | PARTIAL |
| 04–04.1 | Integrações | Lista e configuração HTTP | PARTIAL |
| 05 | Ciclo de Vida do Ticket | Detalhe, ajuste, comentários, anexos, responsáveis, histórico e operações de lista | COMPLEMENTARY |
| 06 | Operação, SLA e Notificações | Políticas, clocks, calendário, alertas, canais e respostas rápidas | COMPLEMENTARY |
| 07 | Administração e Insights | Catálogos, ativos, valores, faturamento de tickets, métricas, auditoria, conhecimento e RBAC | COMPLEMENTARY |
| 08 | Central de Notificações | Inbox, leitura, preferências e canais | NEW/INFERRED/PROPOSED |
| 09 | Monitor de SLA | Contadores, recortes e escalonamento manual | NEW/INFERRED/PROPOSED |
| 10 | Execuções de Integrações | Histórico, detalhe redigido, cancelamento, diagnóstico e saúde | NEW/INFERRED/PROPOSED |
| 11 | Minha Caixa | Recortes pessoais de sistema para trabalho do técnico | NEW/CONFIRMED |
| 12 | Portal de Conhecimento | Pesquisa, artigos, categorias, tags e publicação | NEW/PROPOSED/CONFIRMED — HD-US-1205 confirmado |
| 14 | Relatórios Agendados | Agendamento, execuções e entregas | NEW/PROPOSED |
| 15 | Meu Tempo | Barra sem ticket, timer parado/ativo, lançamento manual, seletor único, projetos manuais, geração por ticket, histórico semanal/diário, filtros, totais, edição e exportação Excel `.xlsx` | NEW/CONFIRMED — consolida apontamentos em um destino |
| 17 | Central de Relatórios | Catálogo, geração, drill-down e exportação | NEW/PROPOSED — materializa HD-US-0709–0712 sem substituir 14 |

### 2.2 Gestec Desk

O Gestec Desk permanece limitado às Specs `gestec.desk/01`, `01.1`, `01.1.1`, `01.1.2`, `01.1.3` e `01.2`. Timer e gestão de apontamentos pertencem exclusivamente ao Gestec Help Desk.

### 2.3 Matriz de cobertura por domínio

| Domínio | Fonte principal |
|---------|-----------------|
| Lista, criação e ciclo do ticket | Specs 01–01.6 e 05 |
| Quadro e detalhe Kanban | Specs 02–02.1.1 |
| Portal do solicitante | Spec 03 |
| Configuração de integrações | Specs 04/04.1 |
| SLA e alertas | Spec 06 e Spec 09 |
| Notificações, e-mail, Discord e respostas rápidas | HD-US-0612–0614 e Spec 08 |
| Catálogos, ativos e valores por hora | HD-US-0701–0704; disponibilidade do centro de custo em Meu Tempo em HD-US-0717 |
| Faturamento de tickets e indicadores | HD-US-0709–0712; Specs 14 e 17 |
| Auditoria e RBAC | HD-US-0713/0716 |
| Conhecimento | HD-US-0714/0715 e Spec 12 |
| Execuções de integrações | Spec 10; complementa 04/04.1 |
| Caixa pessoal | Spec 11 |
| Meu Tempo, projetos de horas, timer e apontamentos | Specs 07 e 15; materializa períodos de 01.3/01.4, disponibiliza centros de custo e projetos manuais numa lista única, gera registros por ticket e exige exportação Excel `.xlsx` |

## 3. Regras de reconciliação

- A arquitetura do legado não deve ser copiada; a arquitetura real do repositório executável prevalecerá na implementação.
- Conceitos genéricos do atendimento, como retorno à lista, responsáveis, comentários, histórico e status, não constituem por si só módulos independentes.
- O Kanban permanece organizado por tipo conforme o mockup até decisão explícita em `GAP-010`.
- “Meu Tempo” é o único item de navegação para timer e apontamentos; criação, edição e estados são continuações do mesmo fluxo.
- Projetos de horas não recriam o módulo genérico “Projetos e tarefas”: centros de custo administrados no Gestec e projetos manuais existem apenas para classificar, medir, faturar e relatar apontamentos.
- A interface de Meu Tempo não expõe a natureza interna do projeto, não usa badges Zeev/SemeAR e não agrupa por origem.
- Clockify é referência estrutural dos anexos, não fonte de identidade visual, branding, nomenclatura ou navegação do Gestec.
- Uma tela de continuação mantém selecionado o item pai da sidebar e usa breadcrumb/top bar contextual.
- As telas `02 — Minha Caixa`, `01.7 — Tickets — Ações em massa` e `09.3 — Conhecimento — Categorias e tags` materializam requisitos `CONFIRMED`, mesmo quando o documento pai também contém outras histórias ainda `PROPOSED`.
- `09.2 — Conhecimento — Editar artigo` segue o contrato semântico confirmado da Spec 12: título da página fixo, labels separados dos valores, editor multilinha e ações condicionadas por permissão e estado.

## 4. IDs históricos retirados do escopo

Os seguintes intervalos não podem ser reutilizados nem renumerados:

- `HD-US-0607`–`HD-US-0611` e `BR-0619`–`BR-0633`;
- `HD-US-0705`–`HD-US-0708` e `BR-0713`–`BR-0724`;
- `HD-US-1003`, `HD-US-1005`, `BR-1007`–`BR-1009` e `BR-1013`–`BR-1015`;
- `HD-US-1102`–`HD-US-1107` e `BR-1104`–`BR-1123`;
- `HD-US-1301`–`HD-US-1307` e `BR-1301`–`BR-1322`;
- `HD-US-1601`–`HD-US-1603` e `BR-1601`–`BR-1612`.

## 5. Rastreabilidade de telas no Pencil

| Grupo da sidebar | Requisito principal | Frames planejados |
|-------------------|---------------------|-------------------|
| Tickets | 01–01.6, 05 | `01 — Tickets` e continuações de criação, triagem, contato, atendimento, aprovação, avaliação e `01.7 — Tickets — Ações em massa` |
| Minha Caixa | 11 | `02 — Minha Caixa` |
| Kanban | 02–02.1.1 | `03 — Kanban`, detalhe e anexos de despesa |
| Solicitações | 03 | `04 — Solicitações` e detalhe |
| Meu Tempo | 07 e 15 | `Meu Tempo — Timer parado`, `Meu Tempo — Timer ativo`, `Meu Tempo — Lançamento manual`, `Meu Tempo — Selecionar projeto`, `Meu Tempo — Criar projeto`, `Meu Tempo — Projeto criado`, `Meu Tempo — Apontamento gerado por ticket`, `Meu Tempo — Ticket sem centro de custo` e `Meu Tempo — Editar apontamento` |
| SLA | 06, 09 | `06 — SLA`, monitor e escalonamento |
| Integrações | 04, 04.1, 10 | `07 — Integrações`, editor e execuções |
| Notificações | 06, 08 | `08 — Notificações`, preferências e templates |
| Conhecimento | 07, 12 | `09 — Conhecimento`, artigo, editor e `09.3 — Conhecimento — Categorias e tags` |
| Relatórios | 07, 14, 17 | `10 — Relatórios`, detalhe, estados, agendamentos, nova agenda, execução, faturamento e insights/auditoria |

Além desses grupos, as seis telas do Gestec Desk permanecem em grupo próprio, sem timer ou apontamentos.

## 6. Critérios de validação do design

- Todas as páginas possuem sidebar e top bar contextuais.
- Sidebar aberta e recolhida exibem os mesmos dez destinos do Help Desk, na mesma ordem.
- O item ativo corresponde ao grupo; continuações mantêm o item pai selecionado.
- Estados loading, vazio, erro e sucesso podem ser reunidos em pranchas desde que vinculados ao fluxo.
- Formulários separam label, valor, placeholder, ajuda e erro.
- O editor de artigo contém título da página, campos reais e conteúdo preenchido dentro dos controles.
- Frames raiz possuem nomes, clipping e coordenadas sem sobreposição; grupos seguem a ordem da sidebar de cima para baixo.
