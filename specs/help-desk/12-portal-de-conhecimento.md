# 12 — Portal de Conhecimento

## Metadados

| Campo | Valor |
|-------|-------|
| **ID** | 12 |
| **Nome** | Portal de Conhecimento |
| **Epic** | Autoatendimento e conhecimento |
| **Status** | Rascunho para validação |
| **Prioridade** | P2/P3 |
| **Perfis envolvidos** | Solicitante, Técnico, Autor, Revisor, Administrador |
| **Classificação** | `PROPOSED` para o portal em geral; `CONFIRMED` para HD-US-1205 |
| **Origem** | HD-US-0714/0715 e entidades `KnowledgeArticle`/`ArticleTicketLink` |
| **Última atualização** | 2026-08-27 |
| **Referência Pencil** | `09 — Conhecimento`, `09.1 — Conhecimento — Artigo`, `09.2 — Conhecimento — Editar artigo`, `09.3 — Conhecimento — Categorias e tags` |

## 1. Objetivo e limite de duplicidade

Materializar a consulta e governança da base de conhecimento. HD-US-0714 continua definindo o ciclo editorial e HD-US-0715 a sugestão durante abertura; esta spec acrescenta as telas de navegação, detalhe, feedback, categorias, versões e vínculo explícito com solução.

## 2. Rotas e acesso

| Tela | Rota |
|------|------|
| Portal/pesquisa | `/gestec_help_desk/conhecimento` |
| Artigo publicado | `/gestec_help_desk/conhecimento/[slug]` |
| Administração | `/gestec_help_desk/conhecimento/admin` |
| Editor | `/gestec_help_desk/conhecimento/admin/[id]` |

Leitura respeita audiência do artigo. Criar/editar/revisar/publicar exige ações distintas: `view_knowledge`, `author_knowledge`, `review_knowledge`, `publish_knowledge`, `admin_knowledge` — nomes finais devem reutilizar o catálogo Gestec.

## 3. Layout

- Portal: hero compacto com busca; categorias; artigos populares/recentes; empty state.
- Resultado: filtros por categoria/tag, ordenação por relevância/atualização, paginação server-side.
- Detalhe: breadcrumb, título, versão/data, conteúdo sanitizado, anexos autorizados, feedback e artigos relacionados.
- Administração: `DataTable` por status, owner/revisor, validade e ações; editor com preview.
- Histórico: `Sheet`/página com versões e diff sem permitir sobrescrita silenciosa.
- Categorias e tags (`09.3`): manter **Conhecimento** ativo na sidebar e breadcrumb/top bar contextual; separar categorias e tags em painéis com pesquisa, contagem de artigos, status e ações de criar, editar, mesclar e desativar; permitir reordenação de categorias com ação explícita **Salvar ordem**; antes de mesclar ou desativar, exibir preview do impacto e confirmação.

### 3.1 Contrato semântico de `09.2 — Conhecimento — Editar artigo`

Este contrato visual é `CONFIRMED`; as regras editoriais de publicação continuam classificadas conforme HD-US-0714.

- O título da página é **Editar artigo**. O título existente do artigo nunca substitui o título da página, o nome de um campo ou o texto de um label.
- **Título do artigo** é um input preenchido com `KnowledgeArticle.title`.
- **Categoria** é um select ou combobox preenchido com a categoria atual; o label, o placeholder de campo vazio e a opção selecionada devem ser visualmente distintos.
- **Resumo** é um textarea preenchido com `KnowledgeArticle.summary`.
- **Conteúdo** é um editor multilinha/rich text preenchido com `KnowledgeArticle.body`, visualmente distinto de um input simples e com sanitização na persistência/renderização.
- **Status** apresenta o estado atual do artigo. Transições disponíveis dependem de permissão e das regras editoriais.
- **Autor** aparece quando aplicável, preenchido a partir de `KnowledgeArticle.authorId`; a possibilidade de alterá-lo permanece `VALIDAR`.
- **Tags** aparecem quando aplicável, preenchidas a partir de `KnowledgeArticle.tags`; criação livre versus seleção de taxonomia permanece `VALIDAR`.
- **Visibilidade** representa `KnowledgeArticle.audience` quando aplicável; o catálogo final de audiências permanece `VALIDAR` em `GAP-038`.
- As ações são **Salvar alterações**, **Cancelar** e **Publicar** quando o usuário possuir permissão e a transição for válida. Salvar não publica implicitamente; cancelar preserva a versão persistida; publicar exige confirmação ou etapa editorial conforme HD-US-0714.
- Labels ficam fora e associados aos controles; valores existentes ficam dentro dos inputs, textareas, selects ou editor; placeholders aparecem apenas em campos vazios; ajuda e validação ficam abaixo do campo correspondente.
- A sidebar mantém **Conhecimento** ativo e a top bar usa breadcrumb `Gestec Help Desk / Conhecimento / Editar artigo`.
- Loading bloqueia repetição da mutação; erro preserva os valores editados; sucesso atualiza versão/status e apresenta feedback; conflito de versão exige reconciliação antes de sobrescrever.

## 4. API sugerida

| Operação | Método | Endpoint |
|----------|--------|----------|
| Buscar publicados | GET | `/api/v1/gestec-help-desk/knowledge-articles` |
| Ler por slug | GET | `/api/v1/gestec-help-desk/knowledge-articles/by-slug/[slug]` |
| Feedback | POST | `/api/v1/gestec-help-desk/knowledge-articles/[id]/feedback` |
| Sinalizar desatualizado | POST | `/api/v1/gestec-help-desk/knowledge-articles/[id]/reports` |
| Categorias | GET/POST/PATCH | `/api/v1/gestec-help-desk/knowledge-categories` |
| Versões | GET/POST | `/api/v1/gestec-help-desk/knowledge-articles/[id]/versions` |
| Vincular ao ticket | POST | `/api/v1/gestec-help-desk/tickets/[id]/knowledge-links` |

## 5. User Stories

### HD-US-1201 — Pesquisar e navegar por conhecimento

| Classificação | Prioridade |
|---------------|------------|
| `PROPOSED` | P2 |

**User Story:** Como usuário, quero localizar artigos publicados por texto, categoria e tag para resolver uma necessidade.

**Fluxo:** informar termo ou escolher categoria → API aplica audiência e busca → exibir resultados com resumo/destaques seguros → paginar.

**Regras:** `BR-1201` somente versões publicadas e autorizadas aparecem; `BR-1202` busca vazia usa conteúdo recomendado, não consulta ilimitada; `BR-1203` relevância não expõe termos/conteúdo restrito.

**Aceite:** Given artigos publicados, When pesquiso termo, Then recebo apenas resultados autorizados; Given artigo rascunho, Then ele não aparece ao solicitante.

### HD-US-1202 — Ler artigo publicado

| Classificação | Prioridade |
|---------------|------------|
| `PROPOSED` | P2 |

**User Story:** Como usuário, quero ler conteúdo confiável e atualizado para executar a orientação com segurança.

**Fluxo:** abrir slug → validar audiência → renderizar versão publicada, metadata e links relacionados → registrar visualização agregada.

**Regras:** `BR-1204` HTML/Markdown é sanitizado no servidor/renderizador; `BR-1205` links externos são identificados; `BR-1206` artigo arquivado mostra estado e alternativa autorizada.

**Aceite:** Given artigo público ao meu perfil, When abro, Then vejo versão/data e conteúdo sanitizado; Given slug restrito, Then recebo resposta segura sem metadados.

### HD-US-1203 — Avaliar utilidade do artigo

| Classificação | Prioridade |
|---------------|------------|
| `PROPOSED` | P3 |

**User Story:** Como leitor, quero indicar se o artigo ajudou para melhorar a qualidade da base.

**Fluxo:** selecionar útil/não útil → solicitar comentário opcional/condicional → salvar uma resposta por usuário/versão → permitir alteração.

**Regras:** `BR-1207` feedback é por versão; `BR-1208` múltiplos cliques não duplicam voto; `BR-1209` agregados não identificam leitores sem permissão.

**Aceite:** Given artigo publicado, When avalio duas vezes, Then existe um feedback atual; Given nova versão, Then feedback anterior permanece associado à versão antiga.

### HD-US-1204 — Sinalizar conteúdo desatualizado

| Classificação | Prioridade |
|---------------|------------|
| `PROPOSED` | P2 |

**User Story:** Como leitor, quero reportar orientação desatualizada ou insegura para revisão editorial.

**Fluxo:** abrir ação → escolher motivo e comentário → criar ocorrência → notificar owner/revisor → acompanhar confirmação sem expor workflow interno.

**Regras:** `BR-1210` limite antiabuso; `BR-1211` report não despublica automaticamente; `BR-1212` ocorrência duplicada pode ser agrupada preservando autores.

**Aceite:** Given artigo publicado, When reporto, Then revisor recebe ocorrência; Given repetição excessiva, Then aplica rate limit sem criar duplicatas.

### HD-US-1205 — Administrar categorias e tags

| Classificação | Prioridade |
|---------------|------------|
| `CONFIRMED` | P3 |

**User Story:** Como administrador de conhecimento, quero organizar taxonomia para facilitar descoberta sem criar categorias duplicadas.

**Fluxo:** listar → criar/renomear/reordenar → validar slug/unicidade → desativar ou mesclar com preview de impacto.

**Regras:** `BR-1213` nome/slug únicos no mesmo pai; `BR-1214` categoria usada não é apagada; `BR-1215` mesclagem é transacional e auditada.

**Aceite:** Given categoria com artigos, When desativo, Then artigos permanecem acessíveis por outras rotas e novos vínculos são bloqueados; Given slug duplicado, Then API rejeita.

### HD-US-1206 — Comparar e restaurar versão como novo rascunho

| Classificação | Prioridade |
|---------------|------------|
| `PROPOSED` | P3 |

**User Story:** Como autor, quero comparar versões e recuperar conteúdo anterior sem apagar o histórico editorial.

**Fluxo:** abrir histórico → selecionar duas versões → visualizar diff → escolher restaurar → criar novo rascunho baseado na versão antiga.

**Regras:** `BR-1216` versão publicada é imutável; `BR-1217` restauração nunca republica automaticamente; `BR-1218` autoria/origem da cópia são registradas.

**Aceite:** Given versões anteriores, When restauro uma, Then surge novo rascunho com referência; Given sem permissão de autoria, Then histórico pode ser readonly, sem restaurar.

### HD-US-1207 — Vincular artigo à solução de ticket

| Classificação | Prioridade |
|---------------|------------|
| `PROPOSED` | P2 |

**User Story:** Como técnico, quero vincular um artigo utilizado na solução para registrar conhecimento reutilizável.

**Fluxo:** buscar artigo publicado → selecionar relação (`SUGGESTED`, `USED_IN_SOLUTION`, `CREATED_FROM_TICKET`) → salvar → mostrar no detalhe/timeline permitido.

**Regras:** `BR-1219` vínculo não altera status; `BR-1220` duplicidade ticket/artigo/relação é impedida; `BR-1221` solicitante só vê artigo compatível com sua audiência.

**Aceite:** Given artigo publicado, When vinculo como solução, Then o ticket exibe o vínculo uma vez; Given artigo restrito ao técnico, Then solicitante não recebe link nem título.

## 6. Estados, segurança e acessibilidade

- Busca e artigo têm skeleton/empty/erro distintos.
- Conteúdo rich text, URLs e anexos passam por sanitização e autorização.
- Preview não executa scripts, embeds arbitrários ou HTML inseguro.
- Headings possuem hierarquia semântica; índice do artigo e foco funcionam por teclado.
- Métricas respeitam privacidade e não convertem ausência de feedback em avaliação negativa.

## 7. Dependências e pendências

Depende de HD-US-0714/0715, modelo de conhecimento, upload seguro e RBAC. A administração mínima de categorias e tags definida em HD-US-1205 está confirmada. Audiências, revisão obrigatória, validade do conteúdo, métricas e detalhes finais da hierarquia taxonômica permanecem em [lacunas-e-ambiguidades.md](../../docs/lacunas-e-ambiguidades.md).
