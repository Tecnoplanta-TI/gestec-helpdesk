# 10 — Execuções de Integrações

## Metadados

| Campo | Valor |
|-------|-------|
| **ID** | 10 |
| **Status** | Rascunho para validação |
| **Prioridade** | P1–P2 |
| **Perfis** | Administrador, Gestor autorizado, Auditor |
| **Última atualização** | 2026-08-26 |
| **Referência Pencil** | `07 — Integrações — Execuções` |

## 1. Objetivo e limite de duplicidade

Permitir consulta operacional segura do histórico de integrações, detalhe redigido, cancelamento de item ainda não iniciado, diagnóstico e saúde do processamento. O cadastro/configuração permanece em 04/04.1.

## 2. Acesso e layout

**Rota:** `/gestec_help_desk/integracoes/execucoes`. **Sidebar ativa:** Integrações.

**Permissões sugeridas:** `view_integration_executions`, `cancel_integration_execution`, `export_integration_diagnostic`.

- Cards por `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED` e `CANCELLED`.
- Filtros por integração, período, status, evento e correlação.
- Tabela com instante, integração, tentativa informativa, duração, código HTTP redigido e ações permitidas.
- Detalhe em sheet com request/response redigidos, timeline e correlação.
- Ações disponíveis: copiar correlação, exportar diagnóstico autorizado e cancelar apenas item ainda não iniciado.

## 3. API sugerida

| Operação | Método | Endpoint |
|----------|--------|----------|
| Listar execuções | GET | `/api/v1/gestec-help-desk/integration-executions` |
| Consultar detalhe | GET | `/api/v1/gestec-help-desk/integration-executions/[id]` |
| Cancelar pendente | POST | `/api/v1/gestec-help-desk/integration-executions/[id]/cancel` |
| Exportar diagnóstico | POST | `/api/v1/gestec-help-desk/integration-executions/[id]/diagnostic` |
| Consultar saúde agregada | GET | `/api/v1/gestec-help-desk/integration-executions/health` |

## 4. User Stories

### HD-US-1001 — Consultar histórico de execuções

**Classificação:** `INFERRED`. **Regras:** `BR-1001` retenção configurável; `BR-1002` escopo acompanha permissão da integração; `BR-1003` payloads não entram na listagem.

**Aceite:** filtros, contadores e paginação usam o mesmo recorte e nenhum secret aparece.

### HD-US-1002 — Inspecionar execução redigida

**Classificação:** `INFERRED`. **Regras:** `BR-1004` secrets são mascarados no servidor; `BR-1005` resposta tem limite de tamanho; `BR-1006` acesso ao detalhe é auditado.

**Aceite:** o usuário autorizado consulta metadados e corpos redigidos; conteúdo restrito não é serializado.

> Os IDs históricos `HD-US-1003`, `HD-US-1005`, `BR-1007` a `BR-1009` e `BR-1013` a `BR-1015` foram retirados do escopo. Eles não são reutilizados nem renumerados.

### HD-US-1004 — Cancelar execução ainda não iniciada

**Classificação:** `PROPOSED`. **Regras:** `BR-1010` item iniciado não pode ser declarado cancelado sem protocolo externo; `BR-1011` corrida retorna o estado real; `BR-1012` cancelamento é auditado.

**Aceite:** item pendente é cancelado; item já iniciado retorna conflito recuperável.

### HD-US-1006 — Exportar diagnóstico redigido

**Classificação:** `PROPOSED`. **Regras:** `BR-1016` nenhum secret ou corpo binário entra no arquivo; `BR-1017` link expira e é vinculado ao solicitante; `BR-1018` arquivo contém versão, correlação e checksums necessários.

**Aceite:** o pacote é temporário, auditado e limitado ao escopo permitido.

### HD-US-1007 — Acompanhar saúde do processamento

**Classificação:** `PROPOSED`. **Regras:** `BR-1019` ausência de telemetria é “desconhecido”; `BR-1020` métricas não contêm payload ou PII; `BR-1021` thresholds são versionados.

**Aceite:** indicadores diferenciam saudável, degradado e desconhecido e abrem o recorte correspondente.

## 5. Estados, segurança e pendências

- Loading por skeleton; vazio diferencia ausência de execuções e filtros sem resultado; erro possui nova tentativa; sucesso de cancelamento atualiza linha e indicadores.
- Payloads, headers, URLs e arquivos são redigidos no servidor; UI não é a barreira de segurança.
- Retenção e limites do diagnóstico estão em [lacunas-e-ambiguidades.md](../../docs/lacunas-e-ambiguidades.md).

Depende de 04/04.1, processamento assíncrono da arquitetura real e auditoria da Spec 07.
