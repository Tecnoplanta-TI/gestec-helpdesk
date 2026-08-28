# 09 — Monitor de SLA e Escalonamentos

## Metadados

| Campo | Valor |
|-------|-------|
| **ID** | 09 |
| **Nome** | Monitor de SLA e Escalonamentos |
| **Epic** | Governança operacional |
| **Status** | Rascunho para validação |
| **Prioridade** | P1 |
| **Perfis envolvidos** | Técnico, Gestor, Administrador |
| **Classificação** | `INFERRED` e `PROPOSED` |
| **Origem** | HD-US-0601–0606; HD-US-0711; clocks e políticas do modelo de domínio |
| **Última atualização** | 2026-08-24 |
| **Referência Figma** | Não disponível |

## 1. Objetivo e limite de duplicidade

Criar uma tela de operação em tempo quase real para tickets em risco ou com SLA violado. A configuração das políticas permanece na Spec 06 e o relatório histórico permanece em HD-US-0711; esta tela trata ação imediata sobre clocks ativos.

## 2. Acesso, rota e layout

**Rota:** `/gestec_help_desk/sla/monitor`

| Perfil | Escopo |
|--------|--------|
| Técnico | tickets próprios/da equipe permitida |
| Gestor | filas e equipes sob gestão |
| Administrador | escopo global autorizado |

**Permissões sugeridas:** `view_sla_monitor`, `acknowledge_escalation`, `escalate_ticket`, `view_sla_calculation` — mapear às `Actions` existentes antes de criar enums.

Layout desktop:

1. Header com instante de atualização e controles de auto-refresh.
2. Cards: em risco de primeira resposta, em risco de resolução, violados e pausados.
3. Filtros por equipe, fila, serviço, prioridade, métrica, estado e vencimento.
4. `DataTable` server-side com ticket, responsável, política, métrica, tempo restante/atraso e escalonamento.
5. `Sheet` de cálculo e histórico do clock.

Mobile: cards resumidos, filtros em `Sheet` e tickets em cards ordenados por criticidade.

## 3. Dados e API

| Operação | Método | Endpoint sugerido |
|----------|--------|-------------------|
| Snapshot do monitor | GET | `/api/v1/gestec-help-desk/sla-monitor` |
| Detalhe do clock | GET | `/api/v1/gestec-help-desk/sla-clocks/[id]` |
| Reconhecer alerta | POST | `/api/v1/gestec-help-desk/sla-escalations/[id]/acknowledge` |
| Escalonar manualmente | POST | `/api/v1/gestec-help-desk/tickets/[id]/escalations` |

Todos os endpoints aplicam escopo antes da agregação. O servidor é a fonte de `now`, tempo útil e estado do clock.

## 4. User Stories

### HD-US-0901 — Visualizar tickets em risco e violados

| Classificação | Prioridade |
|---------------|------------|
| `INFERRED` | P1 |

**User Story:** Como gestor, quero ver tickets ordenados pelo risco de SLA para priorizar intervenção.

**Fluxo:** abrir monitor → carregar snapshot → agrupar contagens → ordenar lista por violação, tempo restante, prioridade e ID.

**Regras:** `BR-0901` servidor calcula o tempo; `BR-0902` “em risco” usa limiar versionado; `BR-0903` ticket sem política aparece em categoria separada, nunca como cumprido.

**Aceite:** Given clocks ativos, When abro o monitor, Then contagens reconciliam com a tabela; Given ticket violado, Then ele aparece antes dos apenas em risco.

### HD-US-0902 — Filtrar e compartilhar recorte operacional

| Classificação | Prioridade |
|---------------|------------|
| `PROPOSED` | P1 |

**User Story:** Como gestor, quero aplicar filtros persistentes na URL para compartilhar o mesmo recorte com a equipe.

**Fluxo:** combinar filtros → atualizar URL → recalcular cards/tabela → copiar link.

**Regras:** `BR-0904` URL não contém PII ou secrets; `BR-0905` destinatário vê somente seu escopo; `BR-0906` filtro inválido é rejeitado e explicado.

**Aceite:** Given filtro por fila, When compartilho a URL, Then outro gestor autorizado obtém o mesmo recorte dentro de seu escopo; Given usuário restrito, Then totais não vazam dados globais.

### HD-US-0903 — Inspecionar memória de cálculo do SLA

| Classificação | Prioridade |
|---------------|------------|
| `INFERRED` | P1 |

**User Story:** Como gestor, quero entender como o prazo foi calculado para explicar divergências e corrigir configuração.

**Fluxo:** abrir clock → exibir política/versão, início, calendário/fuso, pausas, exceções, vencimento e cumprimento/violação → navegar às fontes autorizadas.

**Regras:** `BR-0907` cálculo é reproduzível; `BR-0908` nenhuma edição ocorre no painel; `BR-0909` alterações posteriores de política não mudam a memória histórica.

**Aceite:** Given clock pausado, When abro detalhes, Then vejo intervalos e impacto no vencimento; Given política antiga, Then sua versão continua identificada.

### HD-US-0904 — Reconhecer escalonamento

| Classificação | Prioridade |
|---------------|------------|
| `PROPOSED` | P1 |

**User Story:** Como responsável, quero reconhecer um alerta para indicar que a ocorrência está sendo tratada sem encerrar o SLA.

**Fluxo:** acionar reconhecimento → informar nota opcional/obrigatória conforme regra → salvar ator/instante → atualizar linha.

**Regras:** `BR-0910` reconhecimento não pausa nem cumpre clock; `BR-0911` é idempotente por usuário/alerta; `BR-0912` novo limiar pode gerar novo alerta mesmo após reconhecimento anterior.

**Aceite:** Given alerta aberto, When reconheço, Then o monitor registra ator e instante; Given retry, Then não duplica reconhecimento.

### HD-US-0905 — Escalonar ticket manualmente

| Classificação | Prioridade |
|---------------|------------|
| `PROPOSED` | P2 |

**User Story:** Como gestor, quero escalar manualmente um ticket crítico para envolver o nível adequado antes da violação.

**Fluxo:** escolher nível/destinatário → informar motivo → validar elegibilidade → criar evento/notificações → preservar responsável atual salvo regra explícita.

**Regras:** `BR-0913` motivo obrigatório; `BR-0914` escalonamento não transfere silenciosamente; `BR-0915` destinatários são resolvidos no servidor e deduplicados.

**Aceite:** Given ticket elegível, When escalo, Then evento e notificações são gerados uma vez; Given destinatário sem escopo, Then operação é recusada.

### HD-US-0906 — Atualizar monitor sem perder contexto

| Classificação | Prioridade |
|---------------|------------|
| `PROPOSED` | P2 |

**User Story:** Como operador, quero atualização periódica controlada para acompanhar mudanças sem perder filtros ou seleção.

**Fluxo:** ativar auto-refresh → receber novo snapshot → preservar filtros/scroll → sinalizar linhas alteradas → pausar enquanto `Sheet` possui edição/seleção sensível.

**Regras:** `BR-0916` intervalo mínimo é configurado; `BR-0917` respostas antigas não substituem snapshots novos; `BR-0918` aba oculta reduz polling.

**Aceite:** Given filtros ativos, When atualiza, Then filtros permanecem; Given respostas fora de ordem, Then somente a versão mais recente é aplicada.

## 5. Estados e casos de borda

- Loading: skeleton de cards/tabela; atualização subsequente mantém snapshot anterior com indicador.
- Vazio: diferenciar “nenhum ticket em risco” de “nenhum resultado para filtros”.
- Clock inconsistente: linha com alerta de dados e correlação; nunca inventar prazo.
- Mudança de estado concorrente: ação recebe `409`, recarrega o ticket e explica o motivo.
- Horário de verão, exceções retroativas e worker atrasado usam instante/versão do servidor.
- Contraste e texto acompanham cores verde/amarelo/vermelho; countdown possui label acessível.

## 6. Dependências e pendências

Depende das políticas/clocks da Spec 06, do detalhe da Spec 02.1 e das notificações da Spec 08. Limiar de risco, escopo gerencial e semântica de reconhecimento/escalonamento permanecem em [lacunas-e-ambiguidades.md](../../docs/lacunas-e-ambiguidades.md).
