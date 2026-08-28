# 06 — Operação, SLA e Notificações

## Metadados

| Campo | Valor |
|-------|-------|
| **ID** | 06 |
| **Epic** | Governança operacional |
| **Status** | Rascunho para validação |
| **Prioridade** | P0–P2 conforme história |
| **Perfis** | Técnico, Gestor Help Desk, Administrador |
| **Última atualização** | 2026-08-26 |
| **Fontes** | Specs 01–04.1; SLA, timer e notificações do legado; propostas marcadas |

## Objetivo e limite de duplicidade

Cobrir políticas, clocks e comunicações transversais da operação. Não redefine os botões e timers das Specs 01.3/01.4, as mudanças de status apresentadas no Kanban, nem o editor HTTP de 04.1.

## Contrato comum

- Configurações exigem permissão específica e validação server-side.
- Entidades em uso são versionadas ou desativadas sem reescrever histórico.
- Pausa, escalonamento e envio relevante registram ator ou sistema, instante, correlação e resultado.
- Processamento assíncrono usa outbox e idempotência; falha de notificação não desfaz a mutação do ticket.
- Secrets não aparecem em leitura, log, histórico, teste de integração ou auditoria.
- Erros: `400` schema, `403` permissão, `409` versão/conflito, `422` regra, `429` limite e `503` dependência.

## HD-US-0601 — Cadastrar e versionar política de SLA

**Classificação:** `CONFIRMED` no legado; `INFERRED` nas specs atuais. **Prioridade:** P0. **Perfil:** Administrador Help Desk.

**User Story:** Como administrador, quero configurar metas de primeira resposta e resolução para medir compromissos de atendimento.

**Regras:** `BR-0601` tempos são positivos; `BR-0602` política referenciada é imutável/versionada; `BR-0603` ticket registra a política efetiva.

**Aceite:** política válida e ativada se aplica aos novos tickets elegíveis; editar política em uso cria nova versão sem mudar prazos históricos.

## HD-US-0602 — Resolver precedência de SLA

**Classificação:** `INFERRED`. **Prioridade:** P0. **Perfil:** Sistema/Administrador.

**User Story:** Como administrador, quero precedência determinística entre políticas para evitar prazos ambíguos.

**Regras:** `BR-0604` nenhum empate silencioso; `BR-0605` ausência de política gera indicador explícito; `BR-0606` mudança de regra é auditada.

**Aceite:** a simulação retorna uma política vencedora ou um erro de configuração, e a decisão aplicada ao ticket permanece reproduzível.

## HD-US-0603 — Configurar calendário de negócio e exceções

**Classificação:** `PROPOSED`. **Prioridade:** P1. **Perfil:** Administrador.

**User Story:** Como administrador, quero definir expediente, fuso e feriados para calcular SLA em tempo útil.

**Regras:** `BR-0607` fuso IANA obrigatório; `BR-0608` intervalos não se sobrepõem; `BR-0609` cálculo é reproduzível com a versão aplicada.

**Aceite:** horas não úteis são excluídas e intervalos inválidos bloqueiam a ativação.

## HD-US-0604 — Registrar primeira resposta

**Classificação:** `CONFIRMED`. **Fonte:** Spec 01.3 e SLA legado. **Prioridade:** P0. **Perfil:** Técnico/Sistema.

**User Story:** Como gestor, quero registrar a primeira resposta válida para medir o SLA correspondente.

**Regras:** `BR-0610` nota interna não conta; `BR-0611` data não é sobrescrita; `BR-0612` backdate manual exige permissão e auditoria.

**Aceite:** o primeiro contato elegível cumpre o clock uma única vez e respostas posteriores preservam o instante original.

## HD-US-0605 — Pausar e retomar SLA

**Classificação:** `INFERRED`. **Prioridade:** P0. **Perfil:** Técnico autorizado/Sistema.

**User Story:** Como técnico, quero pausar o SLA somente em motivos autorizados para não contabilizar espera externa.

**Regras:** `BR-0613` uma pausa ativa por clock; `BR-0614` motivo livre não altera o cálculo; `BR-0615` toda pausa possui início, fim e ator.

**Aceite:** a pausa autorizada congela o countdown e o evento de retomada fecha a pausa uma única vez.

## HD-US-0606 — Detectar violação e escalonar SLA

**Classificação:** `PROPOSED`. **Prioridade:** P1. **Perfil:** Sistema/Gestor.

**User Story:** Como gestor, quero alertas antes e depois do vencimento para agir sobre tickets em risco.

**Regras:** `BR-0616` limiares ordenados e únicos; `BR-0617` um alerta por clock/limiar; `BR-0618` atraso do processador não altera o instante real da violação.

**Aceite:** cada limiar emite um alerta idempotente e a violação registra o instante real.

> Os IDs históricos `HD-US-0607` a `HD-US-0611` e `BR-0619` a `BR-0633` foram retirados do escopo. Eles não são reutilizados nem renumerados.

## HD-US-0612 — Receber notificação interna e por e-mail

**Classificação:** `INFERRED`. **Prioridade:** P1. **Perfil:** Participantes.

**User Story:** Como participante, quero ser notificado sobre eventos relevantes para agir sem monitorar continuamente a lista.

**Regras:** `BR-0634` deduplicar por evento/canal/destinatário; `BR-0635` e-mail não inclui conteúdo interno para solicitante; `BR-0636` link exige autenticação.

**Aceite:** eventos elegíveis produzem notificações, enquanto falhas de envio permanecem observáveis sem reverter o ticket.

## HD-US-0613 — Configurar eventos e templates do Discord

**Classificação:** `CONFIRMED`. **Fonte:** Spec 04 e legado. **Prioridade:** P1. **Perfil:** Administrador.

**User Story:** Como administrador, quero escolher eventos e templates enviados ao Discord para adequar alertas operacionais.

**Regras:** `BR-0637` webhook nunca retorna após gravação; `BR-0638` allowlist de domínios/URLs e rate limit; `BR-0639` template não acessa campos secretos ou internos indevidos.

**Aceite:** evento elegível envia uma mensagem e teste falho informa erro seguro sem expor o webhook.

## HD-US-0614 — Usar resposta rápida

**Classificação:** `PROPOSED`. **Prioridade:** P2. **Perfil:** Técnico; Gestor administra templates.

**User Story:** Como técnico, quero inserir uma resposta padronizada para responder com rapidez e consistência.

**Regras:** `BR-0640` selecionar não envia automaticamente; `BR-0641` variáveis ausentes são destacadas; `BR-0642` histórico identifica template e versão sem substituir autoria.

**Aceite:** o conteúdo entra como rascunho editável e variáveis não resolvidas bloqueiam ou exigem confirmação explícita conforme política.

## Permissões e estados

- Técnico consulta o SLA do ticket e usa respostas rápidas; pausas dependem de ação concedida.
- Gestor consulta indicadores, administra templates quando delegado e recebe alertas do seu escopo.
- Administrador mantém políticas, calendários, canais e secrets de integração.
- Loading, vazio, erro, sucesso, conflito e ausência de política possuem estados explícitos e acessíveis.

## Pendências

Calendário, precedência, motivos de pausa, limiares e canais obrigatórios estão em [lacunas-e-ambiguidades.md](../../docs/lacunas-e-ambiguidades.md). Entidades relacionadas estão em [modelo-de-dominio.md](../../docs/modelo-de-dominio.md).
