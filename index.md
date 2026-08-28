# Gestec Help Desk — Índice da Documentação

Este é o mapa principal do repositório de especificações dos módulos **Gestec Desk** e **Gestec Help Desk**. A implementação deverá ocorrer dentro do Gestec existente, preservando autenticação, RBAC, layout, componentes e convenções de API já adotados.

## Comece por aqui

| Documento | Finalidade |
|-----------|------------|
| [Visão geral](specs/00-visao-geral.md) | Escopo dos módulos, rotas e mapa de telas |
| [Inventário e rastreabilidade](docs/inventario-e-rastreabilidade.md) | Fontes analisadas, cobertura existente, legado e conflitos |
| [Modelo de domínio](docs/modelo-de-dominio.md) | Entidades, campos, relacionamentos, enums e ownership |
| [Stack tecnológica](docs/stack-tecnologica.md) | Tecnologias existentes, recomendadas e ainda por definir |
| [Decisões técnicas](docs/decisoes-tecnicas.md) | Decisões arquiteturais vigentes e propostas |
| [Padrões de UI](docs/padroes-ui.md) | Design system, componentes, acessibilidade e preset shadcn |
| [Lacunas e ambiguidades](docs/lacunas-e-ambiguidades.md) | Decisões de produto e arquitetura ainda pendentes |

## Specs — Gestec Help Desk

### Telas e fluxos já documentados

| Faixa | Cobertura | Índice |
|-------|-----------|--------|
| `01`–`01.6` | Lista, abertura, triagem, contato inicial, atendimento, aprovação e avaliação | [Specs Help Desk](specs/README.md) |
| `02`–`02.1.1` | Kanban, detalhe operacional, despesas e comprovantes | [Specs Help Desk](specs/README.md) |
| `03` | Acompanhamento por participação | [03 — Acompanhar solicitações](specs/help-desk/03-acompanhar-solicitacoes.md) |
| `04`–`04.1` | Integrações e editor HTTP/API | [04 — Integrações](specs/help-desk/04-integracoes.md) |

### Specs complementares sem duplicar as telas existentes

| ID | Documento | Cobertura |
|----|-----------|-----------|
| `05` | [Ciclo de vida do ticket](specs/help-desk/05-ciclo-de-vida-e-colaboracao.md) | Detalhe consolidado, ajuste do solicitante, comentários, anexos, atribuição, histórico e operações de lista |
| `06` | [Operação, SLA e notificações](specs/help-desk/06-operacao-sla-workflow-notificacoes.md) | Políticas SLA, calendário, escalonamento, canais e respostas rápidas |
| `07` | [Administração e insights](specs/help-desk/07-administracao-projetos-e-insights.md) | Catálogos, ativos, valores, faturamento de tickets, métricas, auditoria e conhecimento |

### Novas telas operacionais propostas

| ID | Tela | Rota |
|----|------|------|
| `08` | [Central de Notificações](specs/help-desk/08-central-de-notificacoes.md) | `/gestec_help_desk/notificacoes` |
| `09` | [Monitor de SLA](specs/help-desk/09-monitor-de-sla.md) | `/gestec_help_desk/sla/monitor` |
| `10` | [Execuções de Integrações](specs/help-desk/10-execucoes-de-integracoes.md) | `/gestec_help_desk/integracoes/execucoes` |
| `11` | [Minha Caixa](specs/help-desk/11-minha-caixa-e-visoes-salvas.md) | `/gestec_help_desk/minha-caixa` |
| `12` | [Portal de Conhecimento](specs/help-desk/12-portal-de-conhecimento.md) | `/gestec_help_desk/conhecimento` |
| `14` | [Relatórios Agendados](specs/help-desk/14-relatorios-agendados.md) | `/gestec_help_desk/relatorios/agendamentos` |
| `15` | [Meu Tempo — timer, projetos unificados e apontamentos](specs/help-desk/15-meu-tempo-e-apontamentos.md) | `/gestec_help_desk/meu-tempo` |
| `17` | [Central de Relatórios](specs/help-desk/17-central-de-relatorios.md) | `/gestec_help_desk/relatorios` |

> Os documentos `05`–`07` contêm capacidades complementares; `08`–`12`, `14`, `15` e `17` descrevem telas operacionais. Estão explicitamente confirmados: **Minha Caixa** (Spec 11), **ações em massa** (HD-US-0515), **categorias e tags** (HD-US-1205) e **Meu Tempo** (Spec 15), que consolida timer, lançamento manual, centros de custo e projetos manuais numa lista única, geração por ticket e apontamentos sem destino paralelo na sidebar e exige exportação Excel `.xlsx`.

## Specs — Gestec Desk

O módulo de inventário e auditoria possui índice próprio em [specs/gestec.desk/README.md](specs/gestec.desk/README.md).

## Convenções

- Template de spec: [specs/_template-spec.md](specs/_template-spec.md)
- Classificação de descoberta: `CONFIRMED`, `INFERRED` ou `PROPOSED`
- Stack: `EXISTING`, `DECIDED`, `RECOMMENDED` ou `TO_DEFINE`
- Permissões: `module:action`, conforme o Gestec
- API: `/api/v1/...`, recursos plurais e segmentos em kebab-case
- Requisitos novos devem citar a fonte e uma spec relacionada sempre que existir.

## Estado desta análise

- Repositório atual e pasta `docs/`: analisados.
- Specs existentes: inventariadas e preservadas.
- Protótipo legado: analisado apenas como fonte secundária de descoberta.
- Pencil oficial: inventário pré-edição registrado com 58 telas e 4 componentes. Após a retirada do escopo descontinuado e a atualização de Meu Tempo, `pencil-new.pen` contém 50 telas e 4 componentes reutilizáveis; as nove continuações de Meu Tempo estão organizadas lado a lado e validadas visual e estruturalmente em 2026-08-27.
- Repositório executável: não acessível em 2026-08-26; cópias standalone legadas foram identificadas e deliberadamente não alteradas (GAP-003).
- Preset shadcn `b2D0vQOME`: obrigatório no `.pen` e no coding. No repositório executável Next.js, inicializar com `npx shadcn@latest init --preset b2D0vQOME --template next`; não executar nesta pasta documental.
- Figma: acesso estrutural pendente por ausência de URL/file key e sessão autenticada; ver [lacunas e ambiguidades](docs/lacunas-e-ambiguidades.md).
