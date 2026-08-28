# 17 — Central de Relatórios

## Metadados

| Campo | Valor |
|-------|-------|
| **ID** | 17 |
| **Nome** | Central de Relatórios |
| **Epic** | Relatórios e governança |
| **Status** | Rascunho para validação |
| **Prioridade** | P2 |
| **Perfis envolvidos** | Gestor, Analista, Financeiro, Administrador/Auditor autorizado |
| **Classificação** | `PROPOSED` |
| **Origem** | HD-US-0709–0712 e Spec 14 |
| **Última atualização** | 2026-08-26 |
| **Referência Pencil** | `HD 17.0 — Central de Relatórios`, `HD 17.1 — Relatório`, `HD 17.2 — Relatório Estados` |

## 1. Objetivo e limite de duplicidade

Criar a entrada central para consultar e gerar relatórios já definidos. Não cria novos KPIs, não redefine suas fórmulas e não substitui os agendamentos da Spec 14.

## 2. Rotas, navegação e acesso

| Tela | Rota | Sidebar | Breadcrumb/top bar |
|------|------|---------|--------------------|
| Central | `/gestec_help_desk/relatorios` | Relatórios | Gestec Help Desk / Relatórios |
| Resultado | `/gestec_help_desk/relatorios/[reportType]` | Relatórios | Gestec Help Desk / Relatórios / `[relatório]` |
| Agendamentos | `/gestec_help_desk/relatorios/agendamentos` | Relatórios | Gestec Help Desk / Relatórios / Agendamentos |

Permissões sugeridas: `view_reports`, permissões por tipo/escopo, `export_reports`, `manage_report_schedules` — nomes finais em GAP-007.

## 3. Estrutura visual

- **Central:** cards de Faturamento, Operação, SLA e Satisfação com descrição, audiência, última geração e ação; atalhos para agendamentos e execuções recentes.
- **Resultado:** filtros persistentes visíveis, timestamp/timezone, KPIs com definição, visualização tabular/gráfica acessível, drill-down autorizado e exportação.
- Faturamento expõe memória de cálculo e pendências de taxa; SLA expõe denominador e sem-política; satisfação expõe taxa de resposta e privacidade de amostras pequenas.
- O relatório nunca apresenta erro ou ausência de dados como valor zero.

## 4. User Stories de tela

### HD-US-1701 — Acessar catálogo de relatórios

| Classificação | Prioridade |
|---------------|------------|
| `PROPOSED` | P2 |

**User Story:** Como usuário autorizado, quero encontrar os relatórios disponíveis para meu papel e escopo.

**Regras:** `BR-1701` catálogo é filtrado no servidor por permissão; `BR-1702` cada item informa finalidade e dados usados; `BR-1703` acesso direto a tipo não autorizado retorna negação sem metadados sensíveis; `BR-1704` agendamento só aparece para tipos agendáveis.

**Aceite:** Given papéis distintos, When abrem a central, Then cada um vê apenas tipos permitidos; Given URL de relatório não autorizado, Then o acesso é negado.

### HD-US-1702 — Gerar e analisar relatório

| Classificação | Prioridade |
|---------------|------------|
| `PROPOSED` | P2 |

**User Story:** Como gestor, quero aplicar filtros e analisar um relatório com resultados reproduzíveis.

**Regras:** `BR-1705` parâmetros usam schema versionado; `BR-1706` filtros/timezone e atualização são visíveis; `BR-1707` KPI e drill-down reconciliam; `BR-1708` consulta cara possui limite, timeout e execução assíncrona quando necessário.

**Aceite:** Given filtros válidos, When gero, Then resultado identifica universo e instante; Given timeout, Then a tela oferece execução assíncrona sem inventar resultado.

### HD-US-1703 — Exportar resultado

| Classificação | Prioridade |
|---------------|------------|
| `PROPOSED` | P2 |

**User Story:** Como usuário autorizado, quero exportar exatamente o resultado permitido para uso externo controlado.

**Regras:** `BR-1709` exportação reexecuta autorização e parâmetros; `BR-1710` CSV neutraliza fórmulas e XLSX usa tipos seguros; `BR-1711` artefato grande é temporário/auditado; `BR-1712` filtros, timezone e data de geração acompanham o arquivo.

**Aceite:** Given resultado permitido, When exporto, Then arquivo corresponde aos mesmos critérios; Given permissão revogada antes do download, Then acesso é negado.

## 5. Estados e responsividade

- Loading usa skeleton e mantém filtros visíveis; vazio explica o universo consultado; erro diferencia validação, indisponibilidade e timeout; sucesso apresenta timestamp.
- Desktop usa sidebar aberta/recolhida com **Relatórios** ativo e visualizações completas.
- Tablet empilha filtros/indicadores e recolhe sidebar; mobile usa cards, gráficos com alternativa tabular e filtros em sheet.
- Gráficos possuem legenda, valores em texto e navegação por teclado; exportação informa progresso e conclusão.

## 6. Dependências e decisões `VALIDAR`

Depende de HD-US-0709–0712, Spec 14, RBAC, filas e storage apenas quando a execução for assíncrona. Validar catálogo inicial, fórmulas, limites, formatos, retenção e política de amostras pequenas (`GAP-043`).
