# 11 — Minha Caixa

## Metadados

| Campo | Valor |
|-------|-------|
| **ID** | 11 |
| **Nome** | Minha Caixa |
| **Status** | Em revisão — escopo funcional confirmado |
| **Prioridade** | P1 |
| **Perfis** | Técnico, Gestor autorizado |
| **Classificação** | `CONFIRMED` |
| **Última atualização** | 2026-08-27 |
| **Referência Pencil** | `02 — Minha Caixa` |

## 1. Objetivo e limite de duplicidade

Oferecer uma central de recebimento de notificações direcionadas ao usuário. A fila operacional de tickets continua sendo a Spec 01; esta tela não cria um segundo CRUD de tickets.

## 2. Rota, navegação e layout

**Rota:** `/gestec_help_desk/minha-caixa`. **Sidebar ativa:** Minha Caixa. **Breadcrumb:** Gestec Help Desk / Minha Caixa.

**Permissão:** `notifications:view`.

- Header com contador de não lidas e ação para marcar todas como lidas.
- Filtro de não lidas e pesquisa por título, descrição ou origem.
- Cada notificação mostra prioridade, origem, data, estado de leitura e link interno quando houver recurso associado.
- Uma notificação só pode ser lida ou marcada como lida por seu destinatário.

## 3. API sugerida

| Operação | Método | Endpoint |
|----------|--------|----------|
| Consultar contadores e lista | GET | `/api/v1/gestec-help-desk/my-workbox` |

## 4. User Story

### HD-US-1101 — Consultar minha caixa de trabalho

**Classificação:** `CONFIRMED`. **Prioridade:** P1.

**User Story:** Como técnico, quero reunir tickets que exigem minha ação para priorizar o atendimento.

**Fluxo:** abrir caixa → carregar contadores no escopo → selecionar aba de sistema → buscar/filtrar → abrir ticket mantendo contexto de retorno.

**Regras:** `BR-1101` critérios de cada aba são documentados; `BR-1102` um ticket pode aparecer em mais de um contador, mas uma vez por lista; `BR-1103` escopo nunca excede permissões.

**Aceite:** contadores e lista usam o mesmo critério; ticket sem acesso não aparece por consulta direta nem agregação.

> Os IDs históricos `HD-US-1102` a `HD-US-1107` e `BR-1104` a `BR-1123` foram retirados do escopo. Eles não são reutilizados nem renumerados.

## 5. Estados, segurança e pendências

- Loading por skeleton de contadores e tabela; vazio diferencia caixa sem trabalho de filtro sem resultado; erro preserva filtros e oferece tentar novamente.
- Paginação e ordenação são server-side; URL pode refletir somente filtros permitidos e nunca dados sensíveis.
- O mobile usa cards e filtros em sheet; a sidebar recolhida mantém tooltip e seleção.

Critérios finais das abas e regra de “mencionados” permanecem `VALIDAR` em [lacunas-e-ambiguidades.md](../../docs/lacunas-e-ambiguidades.md). Reutiliza lista/filtros de 01 e pesquisa da Spec 05.
