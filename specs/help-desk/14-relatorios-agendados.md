# 14 — Relatórios Agendados

## Metadados

| Campo | Valor |
|-------|-------|
| **ID** | 14 |
| **Nome** | Relatórios Agendados |
| **Epic** | Relatórios e governança |
| **Status** | Rascunho para validação |
| **Prioridade** | P2/P3 |
| **Perfis envolvidos** | Gestor, Analista, Financeiro, Administrador |
| **Classificação** | `PROPOSED` |
| **Origem** | HD-US-0709–0712; exportação HD-US-0514; filas/notificações da stack |
| **Última atualização** | 2026-08-24 |
| **Referência Figma** | Não disponível |

## 1. Objetivo e limite de duplicidade

Agendar a geração e entrega segura dos relatórios já definidos. Esta spec não cria novos KPIs nem redefine faturamento/SLA/satisfação; cobre recorrência, parâmetros, destinatários, execuções e downloads.

## 2. Rota, acesso e layout

**Rota:** `/gestec_help_desk/relatorios/agendamentos`

**Permissões sugeridas:** `view_report_schedules`, `manage_own_report_schedules`, `manage_report_schedules`, `view_report_schedule_runs`.

- Header com CTA **Novo agendamento**.
- `DataTable`: nome, tipo de relatório, frequência, próximo envio, owner, status e última execução.
- `Dialog`/página de formulário com etapas: relatório e filtros; recorrência; formato; destinatários; revisão.
- `Sheet` com histórico de execuções, artefatos e falhas redigidas.
- Permissão e escopo são avaliados na criação e novamente em cada execução.

## 3. API sugerida

| Operação | Método | Endpoint |
|----------|--------|----------|
| CRUD de agenda | GET/POST/PATCH/DELETE | `/api/v1/gestec-help-desk/report-schedules` |
| Pausar/retomar | POST | `/api/v1/gestec-help-desk/report-schedules/[id]/pause` ou `/resume` |
| Executar agora | POST | `/api/v1/gestec-help-desk/report-schedules/[id]/run` |
| Histórico | GET | `/api/v1/gestec-help-desk/report-schedules/[id]/runs` |
| Baixar artefato | POST | `/api/v1/gestec-help-desk/report-runs/[id]/download` |

## 4. User Stories

### HD-US-1401 — Criar agendamento de relatório

| Classificação | Prioridade |
|---------------|------------|
| `PROPOSED` | P2 |

**User Story:** Como gestor, quero agendar um relatório existente para recebê-lo periodicamente com parâmetros consistentes.

**Fluxo:** escolher tipo permitido → definir filtros/período relativo → configurar frequência/timezone → formato/destinatários → revisar preview textual → ativar.

**Regras:** `BR-1401` somente relatórios autorizados podem ser agendados; `BR-1402` parâmetros usam schema versionado; `BR-1403` período relativo é resolvido no instante da execução.

**Aceite:** Given relatório permitido e agenda válida, When ativo, Then próximo disparo é calculado no fuso escolhido; Given parâmetro inválido, Then ativação é bloqueada.

### HD-US-1402 — Configurar recorrência e timezone

| Classificação | Prioridade |
|---------------|------------|
| `PROPOSED` | P2 |

**User Story:** Como gestor, quero configurar frequência e horário sem ambiguidades para receber o relatório na janela correta.

**Fluxo:** selecionar diária/semanal/mensal → escolher dia/horário/timezone → exibir próximas ocorrências → salvar.

**Regras:** `BR-1404` timezone IANA obrigatório; `BR-1405` horário inexistente/duplicado por DST segue política explícita; `BR-1406` frequência mínima protege recursos.

**Aceite:** Given agenda mensal, When reviso, Then vejo próximas datas concretas; Given mudança de horário de verão, Then execução segue política documentada sem duplicar.

### HD-US-1403 — Administrar destinatários com segurança

| Classificação | Prioridade |
|---------------|------------|
| `PROPOSED` | P2 |

**User Story:** Como owner, quero escolher destinatários autorizados para compartilhar dados sem ampliar acesso indevidamente.

**Fluxo:** buscar usuários/grupos internos → validar audiência e escopo do relatório → escolher canal → confirmar → revalidar a cada execução.

**Regras:** `BR-1407` e-mail arbitrário externo é bloqueado por padrão; `BR-1408` artefato contém interseção de acesso apropriada ou agenda é recusada; `BR-1409` destinatário removido/inativo deixa de receber.

**Aceite:** Given destinatário interno autorizado, When agendo, Then ele recebe acesso temporário; Given destinatário sem permissão, Then criação/execução recusa ou omite de forma explícita.

### HD-US-1404 — Pausar, retomar ou encerrar agendamento

| Classificação | Prioridade |
|---------------|------------|
| `PROPOSED` | P2 |

**User Story:** Como owner, quero controlar o ciclo do agendamento para interromper entregas sem apagar o histórico.

**Fluxo:** selecionar ação → confirmar quando necessário → atualizar status/próxima execução → preservar runs anteriores.

**Regras:** `BR-1410` pausa é idempotente; `BR-1411` encerrar é exclusão lógica; `BR-1412` execução já iniciada não é declarada cancelada sem protocolo; `BR-1413` saída do owner exige transferência ou pausa.

**Aceite:** Given agenda ativa, When pauso, Then não cria novos runs; Given runs anteriores, When encerro, Then histórico continua consultável.

### HD-US-1405 — Executar relatório sob demanda

| Classificação | Prioridade |
|---------------|------------|
| `PROPOSED` | P3 |

**User Story:** Como owner, quero executar agora para validar parâmetros antes do próximo disparo.

**Fluxo:** escolher “Executar agora” → confirmar snapshot de parâmetros → enfileirar com idempotency key → acompanhar no histórico.

**Regras:** `BR-1414` rate limit por usuário/relatório; `BR-1415` execução manual não altera próxima recorrência; `BR-1416` autorização é revalidada.

**Aceite:** Given agenda válida, When executo agora, Then surge run manual sem mudar próxima data; Given duplo clique, Then somente um run é criado.

### HD-US-1406 — Consultar histórico e repetir execução falha

| Classificação | Prioridade |
|---------------|------------|
| `PROPOSED` | P2 |

**User Story:** Como owner, quero consultar resultados e repetir falhas para recuperar uma entrega.

**Fluxo:** abrir histórico → ver status/duração/intervalo/erro seguro → selecionar falha → repetir com snapshot ou parâmetros atuais explicitamente → criar novo run relacionado.

**Regras:** `BR-1417` run original é imutável; `BR-1418` retry registra fonte e versão; `BR-1419` erro não expõe dados/credenciais; `BR-1420` falha de entrega distingue-se de falha de geração.

**Aceite:** Given run falho, When repito, Then novo run é ligado ao anterior; Given perda de permissão, Then retry é recusado mesmo se o histórico ainda for visível.

### HD-US-1407 — Baixar artefato temporário

| Classificação | Prioridade |
|---------------|------------|
| `PROPOSED` | P2 |

**User Story:** Como destinatário autorizado, quero baixar o arquivo gerado durante sua retenção para usar o relatório.

**Fluxo:** abrir run/notificação → revalidar permissão → gerar URL assinada curta → baixar → auditar acesso.

**Regras:** `BR-1421` link é pessoal e expira; `BR-1422` nome/MIME são seguros; `BR-1423` CSV neutraliza fórmulas; `BR-1424` artefato expirado pode ser regenerado apenas se dados/permissão permitirem.

**Aceite:** Given artefato vigente, When baixo, Then recebo arquivo autorizado; Given link reutilizado por terceiro/expirado, Then acesso é negado.

## 5. Estados, segurança e casos de borda

- Lista vazia orienta criar agenda sem assumir permissão.
- Worker indisponível mantém run `QUEUED` observável e gera alerta operacional.
- Mudança de schema do relatório marca agenda incompatível para revisão, sem executar parâmetros inválidos.
- Volume máximo, formato e retenção são configurados; geração grande é sempre assíncrona.
- Leitores de tela recebem descrição da recorrência em linguagem natural e do status além de cor.

## 6. Dependências e pendências

Depende dos relatórios HD-US-0709–0712, exportação HD-US-0514, filas, storage, e-mail e notificações 08. Frequências, formatos, destinatários externos, retenção e política de interseção de acesso estão em [lacunas-e-ambiguidades.md](../../docs/lacunas-e-ambiguidades.md).
