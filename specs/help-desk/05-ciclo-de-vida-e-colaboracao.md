# 05 — Ciclo de Vida do Ticket

## Metadados

| Campo | Valor |
|-------|-------|
| **ID** | 05 |
| **Epic** | Operação de tickets |
| **Status** | Rascunho para validação |
| **Prioridade** | P0/P1 conforme história |
| **Perfis** | Solicitante, Técnico, Gestor Help Desk, Administrador |
| **Última atualização** | 2026-08-14 |
| **Fontes** | Specs 01–03; protótipo legado (tickets, detalhes, participantes, arquivos, históricos); inferências e propostas marcadas |

## Objetivo e limite de duplicidade

Especificar comportamentos atômicos que estavam ausentes ou apenas implícitos. Esta spec **não redefine** abertura (01.1), triagem (01.2), primeiro contato (01.3), atendimento/apontamentos (01.4), aceite (01.5), avaliação (01.6), Kanban (02), despesa (02.1/02.1.1), acompanhamento (03) ou integrações (04/04.1).

## Contrato comum das histórias

- **Pré-condições:** sessão NextAuth válida; autorização `gestec_help_desk:<action>` verificada na página e novamente na API; ticket existente e visível ao ator.
- **Fluxo base:** carregar versão atual → validar ação e transição no servidor → persistir em transação → gravar histórico/auditoria → publicar notificação após commit → invalidar cache da consulta.
- **Exceções comuns:** `400` entrada inválida, `401` sessão inválida, `403` sem permissão, `404` inexistente/não visível, `409` concorrência/transição inválida, `413` arquivo excedido, `422` regra de negócio, `503` dependência indisponível.
- **UI:** skeleton, estado vazio, erro com retry, botão com loading/disabled, confirmação para ação destrutiva e toast Sonner sem detalhes sensíveis.
- **Segurança:** validação server-side, sanitização de conteúdo, URLs assinadas de curta duração, nenhuma confiança em nome/MIME do cliente, nenhum comentário interno ou arquivo protegido em resposta não autorizada.
- **Casos de borda:** duplo clique/retry idempotente, usuário desativado preservado no histórico, edição concorrente responde `409`, ticket terminal bloqueia mutações não permitidas.

## HD-US-0501 — Visualizar detalhe consolidado

| Campo | Valor |
|-------|-------|
| Classificação | `CONFIRMED` |
| Fonte | Specs 02.1 e 03; detalhe do ticket no legado |
| Prioridade | P0 |
| Perfil | Solicitante e equipe Help Desk |

**User Story:** Como participante autorizado, quero visualizar os dados, responsáveis, SLA, comentários públicos, anexos e histórico permitido de um ticket para entender seu estado atual.

**Fluxo principal:** abrir pelo número/linha → API aplica escopo de visibilidade → retorna resumo e coleções paginadas → UI organiza cabeçalho, histórico e contexto. Comentários internos e auditoria restrita só aparecem com permissões específicas.

**Alternativas:** ticket acessado pela lista, acompanhamento, Kanban ou link direto; coleções vazias exibem empty state.

**Regras:** `BR-0501` o solicitante vê ticket próprio ou do qual participa; `BR-0502` técnico com escopo global vê tickets autorizados; `BR-0503` dados financeiros, internos e secrets são filtrados campo a campo.

**Aceite:** Given um participante autenticado, When abre o ticket, Then vê somente as seções permitidas; Given usuário sem vínculo nem escopo, When usa URL direta, Then recebe `404` ou `403` conforme padrão Gestec sem vazamento de existência.

## HD-US-0502 — Corrigir ticket devolvido para ajuste

| Campo | Valor |
|-------|-------|
| Classificação | `CONFIRMED` (fluxo pendente em 01.2) |
| Fonte | Spec 01.2 |
| Prioridade | P0 |
| Perfil | Solicitante |

**User Story:** Como solicitante, quero corrigir os campos indicados pela triagem para que meu ticket possa ser reavaliado.

**Pré-condição específica:** status `WAITING_ADJUSTMENT` e solicitação de ajuste ativa.

**Fluxo:** exibir motivo e campos permitidos → validar alterações → salvar rascunho sem mudar status → registrar campos alterados. Campos de classificação interna, SLA e responsáveis são somente leitura.

**Alternativa:** sair sem salvar mantém versão anterior; anexos podem ser incluídos conforme HD-US-0505.

**Regras:** `BR-0504` apenas solicitante/representante autorizado edita; `BR-0505` motivo da triagem é imutável; `BR-0506` edição não reabre automaticamente a triagem.

**Aceite:** Given ticket aguardando ajuste, When o solicitante salva dados válidos, Then a versão é atualizada e o status permanece; Given outro status, When tenta editar, Then a API rejeita com `409`.

## HD-US-0503 — Reenviar ticket ajustado

| Campo | Valor |
|-------|-------|
| Classificação | `INFERRED` |
| Fonte | Continuidade necessária da Spec 01.2 |
| Prioridade | P0 |
| Perfil | Solicitante |

**User Story:** Como solicitante, quero reenviar o ticket corrigido para que a triagem prossiga.

**Fluxo:** validar pendências → confirmar reenvio → encerrar solicitação de ajuste → transicionar para triagem → registrar evento e notificar fila.

**Exceção:** campos obrigatórios ausentes mantêm o ticket em ajuste e destacam erros.

**Regras:** `BR-0507` reenvio é idempotente; `BR-0508` somente a solicitação de ajuste ativa pode ser encerrada.

**Aceite:** Given ajuste completo, When confirma reenvio, Then o ticket volta à triagem uma única vez; Given requisição repetida, Then não duplica evento/notificação.

## HD-US-0504 — Adicionar comentário público

| Campo | Valor |
|-------|-------|
| Classificação | `INFERRED` |
| Fonte | Chat em 01.4 e comentários no legado |
| Prioridade | P0 |
| Perfil | Participante autorizado |

**User Story:** Como participante, quero comentar no ticket para trocar informações dentro do contexto do atendimento.

**Fluxo:** escrever → validar/sanitizar → persistir como `PUBLIC` → registrar no histórico → notificar demais participantes.

**Regras:** `BR-0509` corpo não vazio e com limite configurado; `BR-0510` autor/data são imutáveis; `BR-0511` ticket encerrado aceita comentário apenas se política permitir.

**Aceite:** Given ticket ativo, When participante envia comentário válido, Then ele aparece uma vez na timeline; Given HTML perigoso, When enviado, Then é removido/rejeitado no servidor.

## HD-US-0505 — Adicionar anexo ao ticket ou comentário

| Campo | Valor |
|-------|-------|
| Classificação | `CONFIRMED` |
| Fonte | Specs 01.1, 01.4 e legado |
| Prioridade | P0 |
| Perfil | Participante autorizado |

**User Story:** Como participante, quero anexar evidências para apoiar o atendimento.

**Fluxo:** selecionar → validar tamanho/tipo → enviar com progresso → varredura de segurança quando disponível → vincular após confirmação do storage → registrar no histórico.

**Alternativas:** falha parcial permite tentar novamente; arquivo em quarentena não fica disponível.

**Regras:** `BR-0512` limites vêm de configuração; `BR-0513` nome físico é gerado, nunca o nome do cliente; `BR-0514` vínculo só é criado após upload íntegro/checksum.

**Aceite:** Given arquivo permitido, When upload conclui, Then o anexo fica disponível aos perfis autorizados; Given tipo/tamanho inválido, Then nenhum objeto utilizável ou vínculo órfão permanece.

## HD-US-0506 — Baixar ou remover anexo

| Campo | Valor |
|-------|-------|
| Classificação | `INFERRED` |
| Fonte | Continuidade dos anexos confirmados |
| Prioridade | P1 |
| Perfil | Participante para download; autor/gestor para remoção |

**User Story:** Como usuário autorizado, quero baixar ou remover um anexo para consultar evidências ou corrigir um envio indevido.

**Fluxo:** download revalida autorização e emite URL assinada; remoção exige confirmação, marca exclusão lógica e registra auditoria.

**Regras:** `BR-0515` URL não é pública nem permanente; `BR-0516` comprovante financeiro segue permissão mais restrita; `BR-0517` retenção pode impedir remoção física.

**Aceite:** Given usuário autorizado, When solicita download, Then recebe acesso temporário; Given usuário sem acesso, Then não recebe metadados nem URL; Given remoção permitida, Then o item some da visão comum e continua auditável.

## HD-US-0507 — Adicionar comentário interno

| Campo | Valor |
|-------|-------|
| Classificação | `PROPOSED` |
| Fonte | Prática profissional de Help Desk; não explícita nas fontes |
| Prioridade | P1 |
| Perfil | Técnico/Gestor |

**User Story:** Como técnico, quero registrar nota interna para colaborar sem expor conteúdo operacional ao solicitante.

**Fluxo:** selecionar visibilidade interna explicitamente → confirmar indicação visual → salvar e notificar apenas equipe autorizada.

**Regras:** `BR-0518` API nunca serializa nota interna para solicitante; `BR-0519` conversão posterior para pública exige nova publicação e auditoria, não alteração silenciosa.

**Aceite:** Given técnico autorizado, When publica nota interna, Then somente equipe autorizada a vê; Given solicitante consulta qualquer endpoint/exportação, Then a nota e seus anexos não aparecem.

## HD-US-0508 — Transferir responsabilidade principal

| Campo | Valor |
|-------|-------|
| Classificação | `CONFIRMED` |
| Fonte | Specs 01.2/01.4 e responsável no legado |
| Prioridade | P0 |
| Perfil | Gestor ou técnico com permissão de atribuição |

**User Story:** Como gestor, quero transferir o responsável principal para encaminhar o ticket ao técnico correto.

**Fluxo:** selecionar elegível → informar motivo → validar equipe/escopo/capacidade → trocar responsável em transação → preservar anterior no histórico → notificar envolvidos.

**Regras:** `BR-0520` motivo obrigatório; `BR-0521` novo responsável ativo e elegível; `BR-0522` transferência não zera SLA nem apontamentos.

**Aceite:** Given técnico elegível, When gestor transfere, Then há um único responsável principal e histórico completo; Given técnico inativo/fora do escopo, Then a operação é rejeitada.

## HD-US-0509 — Gerenciar responsáveis adicionais

| Campo | Valor |
|-------|-------|
| Classificação | `CONFIRMED` |
| Fonte | Múltiplos atendentes em 01.4 e participantes no legado |
| Prioridade | P1 |
| Perfil | Técnico responsável/Gestor |

**User Story:** Como responsável, quero adicionar ou remover colaboradores para dividir o atendimento sem perder ownership principal.

**Fluxo:** buscar usuário elegível → adicionar papel `ASSIGNEE` → notificar; remoção encerra participação e preserva histórico.

**Regras:** `BR-0523` não duplicar participante ativo; `BR-0524` principal não é removido por esta ação; `BR-0525` remoção não apaga contribuições.

**Aceite:** Given colaborador elegível, When adicionado duas vezes, Then há uma participação ativa; Given colaborador removido, Then comentários e horas permanecem atribuídos.

## HD-US-0510 — Visualizar timeline e histórico

| Campo | Valor |
|-------|-------|
| Classificação | `CONFIRMED` |
| Fonte | Specs 02.1/03 e histórico do legado |
| Prioridade | P0 |
| Perfil | Participante; auditor vê escopo ampliado |

**User Story:** Como participante, quero ver uma timeline cronológica para compreender decisões e mudanças do ticket.

**Fluxo:** carregar eventos paginados e ordenados → renderizar ator, instante, tipo e mudança legível → filtrar conteúdo conforme permissão.

**Regras:** `BR-0526` histórico é append-only; `BR-0527` empate temporal usa ID estável; `BR-0528` segredo e conteúdo interno são redigidos.

**Aceite:** Given alterações no ticket, When abre timeline, Then a sequência é determinística; Given solicitante, Then eventos internos ficam ausentes sem revelar sua existência.

## HD-US-0511 — Cancelar ticket próprio

| Campo | Valor |
|-------|-------|
| Classificação | `PROPOSED` |
| Fonte | Necessidade distinta do tipo “solicitação de cancelamento” em 01.1 |
| Prioridade | P1 |
| Perfil | Solicitante; gestor pode cancelar por administração |

**User Story:** Como solicitante, quero cancelar um ticket ainda elegível porque ele deixou de ser necessário.

**Fluxo:** ação disponível conforme estado → informar motivo → confirmar → transicionar para `CANCELLED` → parar clocks aplicáveis → notificar equipe.

**Regras:** `BR-0529` não confundir com `TicketType.CANCELLATION`; `BR-0530` estados elegíveis são decisão pendente; `BR-0531` horas/despesas existentes não são apagadas.

**Aceite:** Given estado elegível, When solicitante confirma com motivo, Then o ticket é cancelado e auditado; Given ticket encerrado, Then a ação não é oferecida nem aceita pela API.

## HD-US-0512 — Reabrir ticket concluído

| Campo | Valor |
|-------|-------|
| Classificação | `INFERRED` |
| Fonte | Devolução em 01.5 e workflow do legado |
| Prioridade | P1 |
| Perfil | Solicitante no prazo; Gestor |

**User Story:** Como solicitante, quero reabrir uma solução inadequada dentro do prazo para retomar o atendimento.

**Fluxo:** informar justificativa → validar janela e estado → criar novo ciclo de atendimento/SLA conforme política → transicionar → notificar responsável.

**Regras:** `BR-0532` prazo e política são TBD; `BR-0533` avaliação anterior permanece ligada ao ciclo; `BR-0534` reabertura nunca apaga resolução anterior.

**Aceite:** Given ticket elegível, When reabre com justificativa, Then novo ciclo é criado e histórico preservado; Given prazo expirado, Then a API orienta abrir novo ticket.

**Integração com Meu Tempo:** o apontamento consolidado do ciclo anterior permanece imutável; períodos registrados depois da reabertura pertencem ao novo ciclo e seguem `BR-1567`–`BR-1569` da [Spec 15](15-meu-tempo-e-apontamentos.md). A correspondência final entre status e identificador de ciclo é `VALIDAR`.

## HD-US-0513 — Pesquisar, filtrar, ordenar e paginar tickets

| Campo | Valor |
|-------|-------|
| Classificação | `CONFIRMED`/`INFERRED` |
| Fonte | Specs 01 e 03; lista do legado |
| Prioridade | P0 |
| Perfil | Todos conforme escopo |

**User Story:** Como usuário, quero localizar tickets por critérios combináveis para trabalhar com listas grandes.

**Fluxo:** informar termo/filtros → URL reflete consulta → API valida allowlist de campos → aplica escopo antes da busca → retorna página e total.

**Regras:** `BR-0535` busca por número/título e demais campos confirmados; `BR-0536` paginação e ordenação server-side estáveis; `BR-0537` filtros nunca ampliam escopo de acesso.

**Aceite:** Given mais de uma página, When ordena e navega, Then não há duplicação/omissão com snapshot consistente; Given parâmetro inválido, Then recebe `400` e nenhuma consulta insegura é executada.

## HD-US-0514 — Exportar tickets

| Campo | Valor |
|-------|-------|
| Classificação | `PROPOSED` |
| Fonte | Cobertura funcional solicitada; ausente nas fontes |
| Prioridade | P2 |
| Perfil | Gestor/Analista autorizado |

**User Story:** Como gestor, quero exportar o resultado filtrado para análise controlada.

**Fluxo:** confirmar colunas e filtros → gerar arquivo assíncrono para volume alto → disponibilizar link temporário → auditar download.

**Regras:** `BR-0538` exportação respeita exatamente o escopo atual; `BR-0539` comentários internos/PII são excluídos por padrão; `BR-0540` neutralizar fórmulas em CSV.

**Aceite:** Given filtro aplicado, When exporta, Then o arquivo contém somente linhas/colunas autorizadas; Given valor iniciado por fórmula, Then o CSV é escapado contra injection.

## HD-US-0515 — Executar ações em massa

| Campo | Valor |
|-------|-------|
| Classificação | `CONFIRMED` |
| Fonte | Decisão explícita do solicitante; tela `01.7 — Tickets — Ações em massa` |
| Prioridade | P2 |
| Perfil | Gestor |

**User Story:** Como gestor, quero aplicar atribuição, prioridade ou transição permitida a vários tickets para reduzir trabalho repetitivo.

**Fluxo:** selecionar itens → escolher ação → pré-validar individualmente → mostrar elegíveis/inelegíveis → confirmar → processar com resultado por item.

**Contrato visual da tela `01.7`:** manter **Tickets** ativo na sidebar e breadcrumb/top bar de Tickets; preservar pesquisa e filtros da lista; mostrar os tickets selecionados; permitir escolher atribuição, prioridade ou transição autorizada; solicitar novo valor e motivo quando aplicável; pré-validar cada item com estados `Elegível`, `Inelegível` ou `Requer motivo`; exibir tabela com seleção, estado atual, elegibilidade e motivo; oferecer **Cancelar**, **Pré-validar** e **Confirmar e aplicar** conforme a etapa; após o processamento, apresentar sucesso ou falha por ticket sem ocultar resultado parcial.

**Regras:** `BR-0541` sem atomicidade enganosa: sucesso parcial é explícito; `BR-0542` cada item mantém auditoria própria; `BR-0543` limite por lote e idempotência obrigatórios.

**Aceite:** Given lote misto, When confirma, Then itens elegíveis mudam e falhas são listadas sem mascarar resultados; Given retry com mesma chave, Then nenhum item é aplicado duas vezes.

## Permissões consolidadas

| Ação | Solicitante | Técnico | Gestor | Administrador |
|------|-------------|---------|--------|---------------|
| Ver detalhe próprio/participante | sim | conforme escopo | sim | sim |
| Ajustar/reenviar | próprio em ajuste | não | suporte excepcional auditado | sim |
| Comentário público/anexo | se participante e estado permite | sim | sim | sim |
| Comentário interno | não | proposta: sim | proposta: sim | proposta: sim |
| Transferir/participantes | não | com ação específica | sim | sim |
| Cancelar/reabrir | próprio conforme política | conforme workflow | sim | sim |
| Exportar | não | não por padrão | proposta: sim | proposta: sim |
| Ações em massa | não | não por padrão | sim | sim |

## Dependências e pendências

- Vocabulário e diagrama final de estados: [lacunas GAP-005 a GAP-008](../../docs/lacunas-e-ambiguidades.md).
- Limites/storage/antivírus de anexos: GAP-016.
- Comentário interno, cancelamento, reabertura e exportação permanecem `PROPOSED`/`INFERRED` até decisão. Ações em massa estão `CONFIRMED`; somente o limite quantitativo do lote permanece `VALIDAR` em `GAP-025`.
- Contratos de dados: [modelo-de-dominio.md](../../docs/modelo-de-dominio.md).
