# 08 — Central de Notificações

## Metadados

| Campo | Valor |
|-------|-------|
| **ID** | 08 |
| **Nome** | Central de Notificações |
| **Epic** | Comunicação operacional |
| **Status** | Rascunho para validação |
| **Prioridade** | P1 |
| **Perfis envolvidos** | Solicitante, Técnico, Gestor, Administrador |
| **Classificação** | `INFERRED` e `PROPOSED`, conforme história |
| **Origem** | HD-US-0612; modelo `Notification`; necessidades operacionais derivadas |
| **Última atualização** | 2026-08-24 |
| **Referência Figma** | Não disponível |

## 1. Objetivo e limite de duplicidade

Oferecer uma tela própria para consultar e administrar notificações do usuário. Esta spec não redefine a geração e o envio multicanal de HD-US-0612; ela cobre exclusivamente leitura, organização, navegação e preferências do destinatário.

## 2. Acesso e permissões

**Rota:** `/gestec_help_desk/notificacoes`

| Ação | Permissão sugerida | Regra |
|------|--------------------|-------|
| Consultar próprias notificações | `gestec_help_desk:view` | sempre limitado ao usuário autenticado |
| Alterar estado de leitura | `gestec_help_desk:view` | somente notificações próprias |
| Configurar preferências | `gestec_help_desk:edit_preferences` — TBD | somente preferências próprias |

**Proteção:** `ProtectedRoute` + filtro obrigatório por `recipientId` na API. IDs de terceiros nunca podem ser usados para ampliar o escopo.

## 3. Layout e componentes

- Header com `Title`, `Description`, badge de não lidas e ação **Marcar todas como lidas**.
- Barra com `Input` de busca, `Tabs` (`Todas`, `Não lidas`, `Menções`, `SLA`, `Sistema`) e `Select` de período.
- Lista paginada agrupada por data; cada item contém ícone, título, resumo seguro, instante, estado e menu de ações.
- `Sheet` lateral de preferências por evento/canal.
- Mobile: lista em largura total; filtros em `Sheet`; ações em `DropdownMenu`.

## 4. Dados e API

| Operação | Método | Endpoint sugerido | Observação |
|----------|--------|-------------------|------------|
| Listar | GET | `/api/v1/gestec-help-desk/notifications` | cursor, filtros e escopo próprio |
| Contar não lidas | GET | `/api/v1/gestec-help-desk/notifications/unread-count` | resposta mínima/cache curto |
| Marcar item | PATCH | `/api/v1/gestec-help-desk/notifications/[id]` | `read: boolean`, optimistic update com rollback |
| Marcar todas | POST | `/api/v1/gestec-help-desk/notifications/mark-all-read` | idempotente; filtro opcional |
| Preferências | GET/PATCH | `/api/v1/gestec-help-desk/notification-preferences` | eventos obrigatórios são readonly |

## 5. User Stories

### HD-US-0801 — Consultar notificações próprias

| Campo | Valor |
|-------|-------|
| Classificação | `INFERRED` |
| Prioridade | P1 |

**User Story:** Como usuário, quero consultar minhas notificações em ordem cronológica para identificar ações pendentes.

**Pré-condições:** usuário autenticado; notificações podem existir ou a lista estar vazia.

**Fluxo principal:** abrir a central → carregar primeira página → agrupar por data → destacar não lidas → carregar mais por cursor.

**Alternativas/exceções:** lista vazia apresenta explicação; falha permite retry sem perder filtros.

**Regras:** `BR-0801` somente o destinatário acessa o item; `BR-0802` ordenação usa `createdAt` e ID estável; `BR-0803` conteúdo interno respeita a permissão atual do recurso.

**Aceite:** Given notificações próprias, When abro a central, Then vejo itens ordenados e estados corretos; Given ID de outro usuário, When consulto diretamente, Then a API não revela o item.

### HD-US-0802 — Filtrar e pesquisar notificações

| Campo | Valor |
|-------|-------|
| Classificação | `PROPOSED` |
| Prioridade | P1 |

**User Story:** Como usuário, quero filtrar notificações por leitura, evento e período para localizar rapidamente o que preciso.

**Fluxo:** aplicar filtros combináveis → refletir parâmetros na URL → buscar no servidor → limpar filtros preservando a rota.

**Regras:** `BR-0804` filtros usam allowlist; `BR-0805` busca não inspeciona conteúdo ao qual o usuário perdeu acesso; `BR-0806` paginação reinicia ao alterar filtro.

**Aceite:** Given filtros ativos, When recarrego a página, Then a consulta é restaurada; Given filtro inválido, Then a API responde `400` sem executar consulta insegura.

### HD-US-0803 — Marcar notificação como lida ou não lida

| Campo | Valor |
|-------|-------|
| Classificação | `INFERRED` |
| Prioridade | P1 |

**User Story:** Como usuário, quero controlar o estado de leitura para organizar meu acompanhamento.

**Fluxo:** acionar item/menu → atualizar visualmente → confirmar no servidor → reconciliar contador global.

**Alternativas/exceções:** falha desfaz optimistic update e mostra toast; retry usa a mesma intenção.

**Regras:** `BR-0807` operação é idempotente; `BR-0808` `readAt` é definido/removido pelo servidor; `BR-0809` mudança não altera entrega por outros canais.

**Aceite:** Given item não lido, When marco como lido, Then item e badge são atualizados uma vez; Given falha, Then o estado anterior é restaurado.

### HD-US-0804 — Marcar conjunto como lido

| Campo | Valor |
|-------|-------|
| Classificação | `PROPOSED` |
| Prioridade | P2 |

**User Story:** Como usuário, quero marcar todas as notificações visíveis como lidas para limpar pendências já revisadas.

**Fluxo:** selecionar ação → informar escopo (`todas` ou filtro atual) → confirmar quando volume alto → processar → atualizar contagem.

**Regras:** `BR-0810` escopo é explícito; `BR-0811` novos itens criados após o instante de corte não são marcados; `BR-0812` operação é auditável por correlação, sem logar conteúdo.

**Aceite:** Given filtro de SLA, When marco o filtro como lido, Then somente itens existentes nesse snapshot mudam; Given nova notificação concorrente, Then ela permanece não lida.

### HD-US-0805 — Abrir o recurso relacionado

| Campo | Valor |
|-------|-------|
| Classificação | `INFERRED` |
| Prioridade | P1 |

**User Story:** Como usuário, quero navegar da notificação para o ticket ou recurso relacionado para agir no contexto correto.

**Fluxo:** clicar → marcar como lida → validar rota e autorização atuais → navegar ao recurso.

**Alternativas:** recurso removido/inacessível exibe estado seguro e mantém a notificação consultável.

**Regras:** `BR-0813` destino usa identificador/rota internos allowlist, nunca URL arbitrária; `BR-0814` permissão é reavaliada; `BR-0815` falha de navegação não apaga o item.

**Aceite:** Given ticket acessível, When clico, Then navego ao detalhe; Given acesso revogado, Then recebo mensagem segura sem dados do ticket.

### HD-US-0806 — Configurar preferências de canal

| Campo | Valor |
|-------|-------|
| Classificação | `PROPOSED` |
| Prioridade | P2 |

**User Story:** Como usuário, quero escolher os canais opcionais por tipo de evento para reduzir ruído sem perder alertas obrigatórios.

**Fluxo:** abrir preferências → visualizar matriz evento × canal → alterar opções permitidas → salvar → mostrar resumo.

**Regras:** `BR-0816` eventos obrigatórios ficam bloqueados e explicados; `BR-0817` canais indisponíveis não podem ser selecionados; `BR-0818` alterações valem apenas para eventos futuros.

**Aceite:** Given canal opcional, When desativo, Then eventos futuros deixam de usá-lo; Given evento obrigatório, When tento desativar, Then UI e API recusam.

### HD-US-0807 — Manter badge sincronizado

| Campo | Valor |
|-------|-------|
| Classificação | `PROPOSED` |
| Prioridade | P2 |

**User Story:** Como usuário, quero ver o contador atualizado na navegação para perceber novas notificações sem abrir a central.

**Fluxo:** obter contagem inicial → atualizar por mecanismo definido (polling ou push) → reconciliar após leitura/marcação em massa.

**Regras:** `BR-0819` estratégia realtime é TO_DEFINE; `BR-0820` contador nunca fica negativo; `BR-0821` reconexão solicita snapshot atual.

**Aceite:** Given novo evento, When a sincronização ocorre, Then o badge aumenta; Given reconexão após período offline, Then o valor é reconciliado com o servidor.

## 6. Estados, segurança e acessibilidade

| Estado | Apresentação |
|--------|-------------|
| Loading | `Skeleton` de itens e contador |
| Vazio | `Empty` com mensagem diferente para “sem notificações” e “sem resultado” |
| Erro | `Alert` + retry; manter filtros |
| Offline | banner e última atualização; ações pendentes não fingem sucesso |

Itens são acionáveis por teclado, possuem texto acessível além de cor e não exibem dados sensíveis em push, título de página ou log.

## 7. Navegação e dependências

- Origem: sino no header/sidebar e links internos.
- Destino: ticket, integração, relatório ou configuração autorizada.
- Dependências: HD-US-0612, `Notification`, `NotificationPreference`, outbox e política de canais.
- Pendências: estratégia realtime, eventos obrigatórios e retenção em [lacunas-e-ambiguidades.md](../../docs/lacunas-e-ambiguidades.md).
