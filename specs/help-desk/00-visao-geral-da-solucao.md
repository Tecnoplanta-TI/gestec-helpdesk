# 00 — Visão Geral da Solução Gestec Help Desk

## Metadados

| Campo | Valor |
|-------|-------|
| **ID documental** | HD-OVERVIEW |
| **Nome** | Visão Geral da Solução Gestec Help Desk |
| **Status** | Rascunho para validação |
| **Última atualização** | 2026-08-31 |
| **Classificação** | Três pilares `CONFIRMED`; detalhamento conforme as Specs relacionadas |
| **Fontes** | Solicitação do produto; Specs Help Desk 01–17; Specs Gestec Desk 01–01.2; modelo de domínio e decisões existentes |
| **Entrada Spec Kit** | Atualizar a visão geral da solução sem duplicar as Specs funcionais existentes |
| **Short name** | `solution-overview` |

## 1. Objetivo

Apresentar a visão integrada do **Gestec Help Desk** como solução corporativa para operação de TI. O produto reúne três pilares:

1. **Registro de horas**, com experiência funcional equivalente ao núcleo do Clockify;
2. **Gestão de tickets de suporte de TI**;
3. **Gestão de ativos de TI**.

Este documento não substitui as Specs funcionais existentes nem cria User Stories concorrentes. Ele organiza o escopo do produto, mostra como os pilares se relacionam e aponta para os contratos detalhados que devem orientar a implementação.

## User Scenarios & Testing

### User Story 1 — Atender uma solicitação com contexto completo (Prioridade: P1)

Como técnico de TI, quero receber e tratar um ticket com seus dados, SLA, solicitante,
centro de custo e ativos relacionados, registrando o tempo trabalhado, para solucionar a demanda
com rastreabilidade e sem alternar entre controles desconectados.

**Por que esta prioridade:** este é o fluxo operacional central que conecta os três pilares da
solução e entrega valor mesmo antes dos recursos analíticos avançados.

**Teste independente:** pode ser validado criando um ticket, atribuindo-o a um técnico,
vinculando um ativo, registrando um período de trabalho e concluindo o ciclo sem utilizar
relatórios ou configurações avançadas.

**Cenários de aceite:**

1. **Dado** um ticket atribuído com centro de custo e ativo acessíveis, **quando** o técnico
   inicia e conclui o atendimento, **então** o ticket preserva histórico, responsável, ativo,
   SLA e períodos válidos de trabalho.
2. **Dado** que a conclusão é processada novamente, **quando** a mesma operação é repetida,
   **então** não são duplicados o apontamento, o evento terminal nem a notificação equivalente.
3. **Dado** um ativo fora do escopo do técnico, **quando** ele tenta vinculá-lo ou consultá-lo,
   **então** a operação é recusada sem revelar dados protegidos.

---

### User Story 2 — Solicitar e acompanhar suporte (Prioridade: P1)

Como solicitante, quero abrir um ticket, acompanhar seu andamento, responder pedidos de ajuste e
validar a solução, para receber suporte sem depender de contatos informais com a equipe de TI.

**Por que esta prioridade:** a solução precisa atender quem solicita o serviço e quem o executa;
sem acompanhamento pelo solicitante, o ciclo do ticket fica incompleto.

**Teste independente:** pode ser validado por um solicitante que abre um ticket, consulta apenas
seus dados permitidos, responde uma solicitação de ajuste e registra a validação final.

**Cenários de aceite:**

1. **Dado** um solicitante autenticado, **quando** abre um ticket válido, **então** recebe uma
   referência rastreável e consegue acompanhar as mudanças que pode visualizar.
2. **Dado** um ticket pertencente a outro solicitante sem vínculo autorizado, **quando** tenta
   acessá-lo diretamente, **então** não recebe conteúdo nem metadados protegidos.

---

### User Story 3 — Registrar e consultar horas de trabalho (Prioridade: P1)

Como profissional de TI, quero registrar horas por timer ou lançamento manual e classificá-las
por projeto, para manter um histórico confiável do trabalho realizado.

**Por que esta prioridade:** mensuração de esforço, capacidade e cobrança é um dos três pilares
confirmados da solução.

**Teste independente:** pode ser validado iniciando e parando um timer, criando um lançamento
manual e consultando os registros agrupados por dia e semana.

**Cenários de aceite:**

1. **Dado** descrição e projeto válidos, **quando** o usuário inicia e para o timer, **então** um
   único apontamento é registrado com duração calculada a partir do período válido.
2. **Dado** que o usuário já possui timer ativo, **quando** tenta iniciar outro, **então** o
   segundo início é impedido e o estado atual permanece consistente.
3. **Dado** um lançamento manual com hora final anterior à inicial, **quando** tenta salvá-lo,
   **então** o registro é rejeitado e nenhuma duração fictícia é criada.

---

### User Story 4 — Consultar ativos e relacioná-los ao suporte (Prioridade: P2)

Como profissional autorizado de TI, quero localizar ativos, consultar seu inventário e histórico
e relacioná-los aos tickets, para tomar decisões de atendimento com contexto técnico confiável.

**Por que esta prioridade:** o contexto patrimonial melhora o diagnóstico, mas a operação básica
de tickets e horas ainda entrega valor quando o ciclo patrimonial detalhado não está concluído.

**Teste independente:** pode ser validado pesquisando uma estação inventariada, consultando seus
detalhes e vinculando-a a um ticket sem duplicar seu cadastro.

**Cenários de aceite:**

1. **Dado** um ativo inventariado e acessível, **quando** o usuário o vincula a um ticket,
   **então** o vínculo passa a compor o contexto e o histórico do atendimento.
2. **Dado** que o vínculo é removido por usuário autorizado, **quando** o ticket é consultado
   posteriormente, **então** o ativo deixa de aparecer como vínculo atual e a alteração permanece
   auditável.

---

### User Story 5 — Acompanhar operação e resultados (Prioridade: P2)

Como gestor de TI, quero acompanhar filas, SLA, horas, tickets, projetos, centros de custo e
ativos, para distribuir trabalho, identificar riscos e gerar informações confiáveis de gestão.

**Por que esta prioridade:** consolida o valor gerencial dos fluxos operacionais, mas depende de
dados produzidos pelas jornadas P1.

**Teste independente:** pode ser validado aplicando filtros a um conjunto conhecido de tickets e
apontamentos e comparando os totais apresentados com os registros autorizados que os originaram.

**Cenários de aceite:**

1. **Dado** um gestor com escopo definido, **quando** aplica filtros de período, projeto, status
   ou responsável, **então** listas, totais e exportações representam o mesmo conjunto autorizado.
2. **Dado** um usuário sem permissão financeira ou de auditoria, **quando** consulta indicadores,
   **então** valores e eventos restritos não são apresentados.

### Edge Cases

- Ticket sem centro de custo não recebe projeto arbitrário nem entra como hora faturável até a
  classificação válida definida pela Spec 15.
- Ticket sem período válido não produz duração fictícia ao concluir o ciclo.
- Reabertura preserva o ciclo anterior e separa o trabalho novo conforme a regra aplicável.
- Centro de custo, projeto ou ativo inativado deixa de ser elegível para novos vínculos, mas
  permanece identificável no histórico autorizado.
- Falha parcial de integração ou notificação não desfaz silenciosamente uma alteração de negócio
  já confirmada; o estado precisa ser reconciliável e auditável.
- Consultas sem resultados exibem o contexto dos filtros e uma forma segura de limpar ou ajustar
  a busca.
- Operações concorrentes sobre timer, ticket ou vínculo de ativo não podem produzir dois estados
  ativos incompatíveis.

## Requirements

### Functional Requirements

- **FR-001:** A solução DEVE reunir registro de horas, tickets de suporte e ativos de TI sob a
  mesma visão de produto e identidade de usuário.
- **FR-002:** Usuários DEVEM acessar somente tickets, horas, ativos, relatórios e ações permitidos
  pelo seu perfil e escopo atual.
- **FR-003:** O ciclo de ticket DEVE cobrir abertura, classificação, triagem, ajuste, contato,
  atribuição, atendimento, aprovação, validação, avaliação e conclusão conforme as Specs
  funcionais relacionadas.
- **FR-004:** O ticket DEVE preservar responsáveis, participantes, comentários, anexos, SLA,
  transições e histórico permitido.
- **FR-005:** Um ativo existente DEVE poder ser relacionado ao ticket por identidade estável sem
  criar um cadastro patrimonial duplicado.
- **FR-006:** Meu Tempo DEVE permitir timer e lançamento manual, com descrição, projeto,
  faturabilidade, períodos válidos, histórico e totais.
- **FR-007:** Cada novo apontamento manual DEVE possuir exatamente um projeto elegível; centros de
  custo ativos e projetos manuais ativos DEVEM aparecer no seletor unificado conforme a Spec 15.
- **FR-008:** Apontamentos gerados por ticket DEVEM consolidar somente períodos válidos por usuário
  e ciclo, sem duplicidade em reprocessamentos.
- **FR-009:** Histórico, filtros, totais, relatórios e exportações DEVEM aplicar o mesmo período,
  escopo de autorização e critérios de seleção.
- **FR-010:** Usuários autorizados DEVEM poder pesquisar ativos, consultar inventário e histórico,
  executar auditorias previstas e relacionar o resultado ao atendimento.
- **FR-011:** Inativação, arquivamento ou remoção lógica NÃO DEVE apagar vínculos, apontamentos ou
  eventos necessários para histórico e auditoria.
- **FR-012:** Ações mutáveis DEVEM indicar sucesso, falha, conflito ou estado incerto e impedir
  repetição cega que possa duplicar efeitos.
- **FR-013:** Toda tela aplicável DEVE representar carregamento, vazio, erro recuperável, sucesso,
  confirmação, ação desabilitada e ausência de permissão.
- **FR-014:** A solução DEVE oferecer pesquisa, filtros, ordenação e paginação nas coleções cujo
  volume não permita exibição integral segura e compreensível.
- **FR-015:** Requisitos e decisões DEVEM manter classificação `CONFIRMED`, `INFERRED`, `PROPOSED`
  ou `VALIDAR`, com rastreabilidade para a Spec detalhada correspondente.
- **FR-016:** O produto NÃO DEVE criar destinos principais separados para Apontamentos ou projetos
  de horas, nem depender da identidade ou do serviço Clockify.
- **FR-017:** Fórmulas monetárias, ciclo patrimonial completo e decisões ainda classificadas como
  `VALIDAR` NÃO DEVEM ser tratadas como comportamento confirmado.

### Requirement Coverage

| Requisitos | Evidência de aceite |
|------------|---------------------|
| FR-001, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008 e FR-010 | User Stories 1–4 e seus cenários de aceite |
| FR-002 | Cenários de acesso das User Stories 1, 2 e 5; SC-003 |
| FR-009 e FR-014 | User Story 5; SC-004 |
| FR-011 e FR-012 | Edge Cases de inativação, falha parcial e concorrência; SC-002 |
| FR-013 | Requisitos transversais; SC-007 |
| FR-015 e FR-017 | SC-006; Assumptions; seção de rastreabilidade |
| FR-016 | Limites funcionais de Meu Tempo; critérios de aceite desta visão |

### Key Entities

As entidades conceituais centrais são `User`, `Ticket`, `TicketParticipant`, `Asset`,
`TicketAsset`, `TimeEntry`, `TimeSegment`, `Project`, `CostCenter`, `SlaClock` e `AuditEvent`.
Seus significados e relações estão resumidos na seção **Entidades conceituais centrais** e
detalhados no modelo de domínio referenciado por este documento.

## Success Criteria

### Measurable Outcomes

- **SC-001:** Em validação de usabilidade, pelo menos 90% dos técnicos conseguem localizar um
  ticket atribuído, consultar seu contexto e iniciar o registro de trabalho em até 3 minutos,
  sem assistência externa.
- **SC-002:** Em cenários de aceite com repetição de comando, 100% das finalizações de ticket,
  paradas de timer e consolidações testadas produzem no máximo um efeito lógico equivalente.
- **SC-003:** Em testes de autorização por perfil, 100% das tentativas fora do escopo são
  bloqueadas sem exposição de conteúdo ou metadados protegidos.
- **SC-004:** Para um conjunto de dados controlado, totais de horas, resultados filtrados e
  exportações apresentam 100% de concordância sobre o mesmo período e escopo.
- **SC-005:** Pelo menos 90% dos solicitantes participantes de uma validação conseguem abrir e
  acompanhar um ticket até a etapa disponível seguinte sem orientação da equipe de TI.
- **SC-006:** Toda capacidade `CONFIRMED` da visão geral possui referência para uma Spec detalhada,
  um cenário de aceite ou uma lacuna explicitamente registrada antes do planejamento.
- **SC-007:** Nenhum fluxo crítico depende exclusivamente de cor, de controle sem nome acessível
  ou de ação essencial indisponível por teclado nas validações de interface.

## Assumptions

- A identidade, sessão e matriz corporativa de acesso existentes no Gestec serão reutilizadas.
- A Spec 00 organiza o produto; contratos pormenorizados permanecem nas Specs relacionadas e não
  são repetidos integralmente aqui.
- Meu Tempo é um recurso nativo inspirado funcionalmente no Clockify, sem integração obrigatória
  com esse serviço.
- Inventário técnico e auditoria permanecem no Gestec Desk, enquanto vínculo de ativo e contexto
  do atendimento permanecem no Gestec Help Desk até decisão arquitetural diferente.
- Gestão patrimonial completa, regras monetárias e integrações externas seguem os itens
  `VALIDAR`/`TO_DEFINE` existentes e não bloqueiam a definição do escopo confirmado.
- Metas de usabilidade e consistência desta visão serão verificadas com cenários representativos
  antes de considerar a implementação pronta para adoção.

## 2. Visão do produto

O Gestec Help Desk deve centralizar a rotina da equipe de TI desde a entrada da demanda até sua conclusão e mensuração:

```text
Ativo ou serviço afetado
        ↓
Ticket de suporte
        ↓
Triagem, atendimento e solução
        ↓
Horas registradas e classificadas
        ↓
Histórico, SLA, custos, relatórios e auditoria
```

A solução faz parte do Gestec existente e deve reutilizar identidade, permissões, navegação,
padrão visual, contratos corporativos e trilha de auditoria já adotados. Não é uma aplicação
isolada.

## 3. Pilares funcionais

| Pilar | Finalidade | Situação documental | Principais referências |
|-------|------------|----------------------|------------------------|
| Registro de horas | Medir o trabalho executado, classificá-lo por projeto/centro de custo e apoiar gestão, relatório e cobrança | Cobertura detalhada existente | [Spec 15 — Meu Tempo](15-meu-tempo-e-apontamentos.md) |
| Tickets de suporte | Registrar, priorizar, atender, acompanhar e concluir solicitações de TI com SLA, colaboração e histórico | Cobertura detalhada existente | [Specs 01–06](../README.md), [Kanban](02-kanban.md) e [Minha Caixa](11-minha-caixa-e-visoes-salvas.md) |
| Ativos de TI | Inventariar, consultar e auditar ativos, além de vinculá-los ao atendimento | Cobertura parcial distribuída entre Help Desk e Gestec Desk | [HD-US-0703](07-administracao-projetos-e-insights.md#hd-us-0703--vincular-ativo-ou-equipamento-ao-ticket) e [Specs Gestec Desk](../gestec.desk/README.md) |

## 4. Registro de horas

### 4.1 Visão funcional (`CONFIRMED`)

O Gestec Help Desk possuirá um rastreador de tempo nativo com experiência inspirada no Clockify, sem depender do Clockify, copiar sua identidade visual ou utilizar sua marca.

O recurso fica concentrado em **Meu Tempo** e contempla:

- timer persistente com estados parado e ativo;
- no máximo um timer ativo por usuário;
- lançamento manual por data, hora inicial e hora final;
- descrição da atividade e projeto obrigatório;
- seletor único de projetos, reunindo centros de custo ativos e projetos manuais ativos;
- indicação acessível de hora faturável ou não faturável;
- histórico agrupado por dia e semana;
- totais diários, semanais, por projeto e por centro de custo;
- pesquisa, filtros, edição, invalidação/exclusão lógica e auditoria;
- geração de apontamentos a partir do trabalho realizado em tickets;
- exportação autorizada em Excel `.xlsx`;
- relatórios de horas e base quantitativa para cobrança.

**Limite de navegação:** Apontamentos permanece dentro de Meu Tempo. Não existe página principal nem item separado de Apontamentos na sidebar.

**Limite de produto:** os projetos servem para classificar, medir, relatar e apoiar a cobrança das horas. Não constituem um módulo genérico de gestão de projetos e tarefas.

## 5. Gestão de tickets de suporte de TI

### 5.1 Visão funcional (`CONFIRMED`)

O módulo de tickets cobre o ciclo operacional das solicitações de TI:

- abertura do ticket pelo solicitante ou por integração autorizada;
- classificação por tipo, serviço, categoria, prioridade e centro de custo;
- triagem, solicitação de ajuste e reenvio;
- contato inicial e controle de SLA;
- atribuição, transferência e participação de múltiplos técnicos;
- atendimento, comentários, anexos e comunicação com o solicitante;
- associação de materiais, despesas e equipamentos;
- aprovação, validação do solicitante, avaliação e conclusão;
- cancelamento e reabertura conforme regras aprovadas;
- lista, Kanban, Minha Caixa, pesquisa, filtros, paginação e ações em massa;
- notificações, monitor de SLA, relatórios, exportações e auditoria;
- integrações externas configuráveis e rastreáveis.

As ações e dados disponíveis dependem do perfil: solicitante, técnico, gestor, administrador,
auditor ou outro papel definido no controle de acesso corporativo. As regras de autorização
devem ser reaplicadas no acesso aos dados; a interface não é a única barreira de segurança.

### 5.2 Relação com o registro de horas

- Períodos trabalhados no atendimento podem originar apontamentos em Meu Tempo.
- O número do ticket aparece no histórico do apontamento gerado, não na barra de registro manual.
- O centro de custo do ticket fornece o projeto do apontamento automático.
- Finalizações repetidas não podem duplicar horas.
- Reabertura preserva o ciclo anterior e separa o trabalho novo.
- Ticket sem centro de custo nunca recebe projeto arbitrário e segue o tratamento documentado na Spec 15.

## 6. Gestão de ativos de TI

### 6.1 Visão funcional (`CONFIRMED` no pilar; cobertura detalhada `PARTIAL`)

A solução deve permitir que a equipe de TI conheça os ativos sob sua responsabilidade e utilize esse contexto durante o suporte. O escopo já sustentado pelas Specs inclui:

- listar e pesquisar estações e ativos inventariados;
- consultar detalhes técnicos e snapshots de inventário;
- visualizar aplicativos instalados e alterações históricas;
- acompanhar cobertura de inventário;
- executar auditoria individual ou em massa;
- vincular um ativo ou equipamento existente a um ticket;
- informar código patrimonial quando exigido pela solicitação;
- registrar equipamentos entregues durante o atendimento;
- preservar o histórico do vínculo mesmo após sua remoção lógica;
- restringir a busca e visualização conforme o escopo de acesso do usuário.

### 6.2 Organização atual

As responsabilidades estão distribuídas sem duplicação:

- **Gestec Desk:** inventário técnico de estações, snapshots, aplicativos e auditoria;
- **Gestec Help Desk:** vínculo do ativo com ticket, contexto do atendimento e registro de equipamento entregue.

Esta separação deve ser preservada até existir decisão arquitetural explícita para consolidar os módulos. A visão geral considera ambos como partes da solução de gestão de TI, mas não move silenciosamente telas ou regras entre eles.

### 6.3 Escopo ainda a detalhar (`VALIDAR`)

A gestão completa do ciclo patrimonial ainda não possui cobertura suficiente para implementação sem decisões adicionais. Devem ser validados antes de criar novas Specs:

- fonte oficial e identificador estável do ativo;
- cadastro manual versus importação/sincronização;
- responsável, usuário atual, localização e centro de custo;
- estoque, reserva, entrega, devolução e transferência de custódia;
- manutenção, garantia, contrato e fornecedor;
- perda, descarte, baixa e retenção histórica;
- relação entre estação inventariada, patrimônio corporativo e equipamento informado no ticket;
- permissões específicas para consultar e administrar ativos.

Depreciação contábil, compra e gestão financeira patrimonial não são consideradas confirmadas por este documento.

## 7. Integração entre os pilares

| Evento | Efeito esperado |
|--------|-----------------|
| Ticket referencia ativo | O técnico consulta contexto, inventário e histórico permitidos sem duplicar o ativo |
| Técnico trabalha no ticket | Períodos válidos ficam associados ao usuário e ao ciclo de resolução |
| Ticket conclui ciclo elegível | O sistema cria ou atualiza apontamentos idempotentes em Meu Tempo |
| Centro de custo é definido | Torna-se o projeto do apontamento automático e base para totalização |
| Ativo é entregue ou substituído | O atendimento registra o equipamento e preserva a trilha histórica |
| Horas e tickets são consolidados | Dashboards, relatórios e exportações respeitam filtros, escopo e autorização |

## 8. Atores principais

| Ator | Responsabilidades principais |
|------|-------------------------------|
| Solicitante | Abrir e acompanhar tickets, complementar informações, validar solução e avaliar atendimento |
| Técnico de TI | Atender tickets, registrar trabalho, consultar ativos relacionados e comunicar a solução |
| Gestor Help Desk | Distribuir demandas, acompanhar SLA, aprovar ações, analisar capacidade e resultados |
| Administrador | Manter catálogos, centros de custo, projetos manuais, integrações e permissões delegadas |
| Gestor de ativos | Administrar o ciclo patrimonial quando o escopo detalhado for aprovado |
| Auditor/Analista | Consultar histórico, indicadores, relatórios e trilhas autorizadas |
| Sistema | Aplicar regras, integrar dados, evitar duplicidade, registrar auditoria e emitir notificações |

## 9. Entidades conceituais centrais

- `User`: identidade do Gestec e ator das operações.
- `Ticket`: solicitação de suporte e seu ciclo de vida.
- `TicketParticipant`: solicitante, responsável e participantes do atendimento.
- `Asset`: ativo ou equipamento gerenciado/inventariado.
- `TicketAsset`: vínculo histórico entre ticket e ativo.
- `TimeEntry`: apontamento manual ou gerado por ticket.
- `TimeSegment`: intervalo válido de trabalho de um usuário.
- `Project`: classificação apresentada em Meu Tempo.
- `CostCenter`: centro de custo que também é disponibilizado como projeto.
- `SlaClock`: controle dos prazos aplicáveis ao ticket.
- `AuditEvent`: registro imutável de ações relevantes.

Campos, relacionamentos, ownership e restrições devem seguir o [modelo de domínio](../../docs/modelo-de-dominio.md), complementado pelas Specs funcionais.

## 10. Requisitos transversais

- Autenticação e RBAC do Gestec, com autorização também no servidor.
- Interface consistente com o padrão visual e os componentes corporativos aprovados para o
  Gestec.
- Estados de carregamento, vazio, erro, sucesso, confirmação e ausência de permissão.
- Responsividade, navegação por teclado, labels corretos e ícones com nome acessível.
- Validação server-side, idempotência, controle de concorrência e auditoria.
- Exclusão lógica ou arquivamento quando houver histórico relacionado.
- Busca, filtros, ordenação e paginação consistentes nas listagens.
- Relatórios e exportações devem respeitar os mesmos filtros e permissões da consulta.
- Dados sensíveis, segredos de integração e conteúdo interno não podem ser expostos a perfis não autorizados.

## 11. Rastreabilidade

| Capacidade | Documento de referência |
|------------|-------------------------|
| Lista, abertura e etapas principais de tickets | [Specs 01–01.6](../README.md) |
| Kanban e detalhe operacional | [Spec 02](02-kanban.md) e [02.1](02.1-detalhe-ticket-kanban.md) |
| Colaboração, histórico e operações do ticket | [Spec 05](05-ciclo-de-vida-e-colaboracao.md) |
| SLA, workflow e notificações | [Spec 06](06-operacao-sla-workflow-notificacoes.md) |
| Catálogos, centros de custo, vínculo de ativo e auditoria | [Spec 07](07-administracao-projetos-e-insights.md) |
| Minha Caixa | [Spec 11](11-minha-caixa-e-visoes-salvas.md) |
| Meu Tempo e apontamentos | [Spec 15](15-meu-tempo-e-apontamentos.md) |
| Relatórios | [Spec 17](17-central-de-relatorios.md) |
| Inventário e auditoria técnica de ativos | [Specs Gestec Desk](../gestec.desk/README.md) |
| Entidades e relacionamentos | [Modelo de domínio](../../docs/modelo-de-dominio.md) |

## 12. Critérios de aceite desta visão

- Os três pilares estão representados como partes da mesma solução de gestão de TI.
- O documento referencia as Specs existentes em vez de reproduzir suas User Stories.
- Meu Tempo é descrito como recurso nativo inspirado funcionalmente no Clockify, sem dependência ou cópia de identidade.
- Tickets conectam atendimento, horas, centro de custo e ativos.
- Gestec Desk e Gestec Help Desk permanecem distintos nas responsabilidades atuais.
- Lacunas da gestão patrimonial estão identificadas como `VALIDAR` e não são apresentadas como regras confirmadas.
- Nenhum novo ID de User Story ou regra de negócio é criado por esta visão geral.
