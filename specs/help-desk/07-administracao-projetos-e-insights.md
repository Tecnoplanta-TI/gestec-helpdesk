# 07 — Administração e Insights

## Metadados

| Campo | Valor |
|-------|-------|
| **ID** | 07 |
| **Epic** | Administração e evolução do produto |
| **Status** | Rascunho para validação |
| **Prioridade** | P0–P3 conforme história |
| **Perfis** | Técnico, Gestor, Analista, Administrador, Auditor |
| **Última atualização** | 2026-08-27 |
| **Fontes** | Campos das specs atuais, cadastros, faturamento, métricas, auditoria e conhecimento do legado |

## Objetivo e limite de duplicidade

Documentar catálogos, vínculos corporativos, faturamento de tickets, indicadores, auditoria, conhecimento e permissões. O CRUD de usuários, login e RBAC do Gestec não será recriado; o Help Desk apenas declara ações adicionais. Despesas de ticket já cobertas em 02.1/02.1.1 são referenciadas, não repetidas.

## Contrato comum

- Cadastros usam lista paginada, busca, filtros, estados de loading/vazio/erro, formulário validado e autorização server-side.
- Registros referenciados são desativados, não apagados; códigos únicos são normalizados no servidor.
- Relatórios aplicam escopo antes da agregação e exibem período, fuso, filtros e atualização.
- Exportações são auditadas, usam links temporários e mitigam injeção em planilhas.
- Valores monetários usam decimal e moeda ISO; ações privilegiadas geram auditoria.

## HD-US-0701 — Administrar centros de custo

**Classificação:** `CONFIRMED`. **Prioridade:** P1. **Perfil:** Administrador.

**User Story:** Como administrador autorizado, quero criar, editar, ativar e inativar centros de custo no Gestec para classificar tickets e horas sem duplicidade.

**Pré-condições:** usuário autenticado com permissão administrativa; catálogo carregado ou erro recuperável.

**Fluxo principal:**

1. O administrador abre o cadastro de centros de custo na área administrativa existente.
2. Pesquisa por nome ou código antes de criar.
3. Informa nome, código/identificador e status.
4. O sistema normaliza e valida duplicidade.
5. Ao salvar, atribui identidade estável e registra auditoria.
6. Centro ativo torna-se elegível em tickets e aparece automaticamente como projeto em Meu Tempo.

**Regras:**

- `BR-0701` código normalizado é único e a identidade interna permanece estável.
- `BR-0702` ticket e apontamento históricos mantêm referência e snapshot suficiente para leitura após renomeação.
- `BR-0703` o Gestec administra o catálogo; nenhum cadastro paralelo em Meu Tempo pode representar o mesmo centro.
- `BR-0749` criação e edição exigem nome, código/identificador e status válidos.
- `BR-0750` duplicidade por código é bloqueada; possível colisão por nome normalizado exige confirmação ou rejeição conforme política `VALIDAR`.
- `BR-0751` renomear não cria nova identidade nem reclassifica silenciosamente registros históricos.
- `BR-0752` inativar impede uso em novos tickets e apontamentos, mas preserva vínculos anteriores.
- `BR-0753` centro referenciado não pode ser excluído de forma destrutiva.
- `BR-0754` criar, editar, ativar e inativar exige permissão específica e produz auditoria.

```gherkin
Dado um centro de custo ativo cadastrado no Gestec
Quando a alteração for salva
Então ele deve ficar disponível para novos tickets
E deve aparecer como projeto em Meu Tempo sem cadastro adicional

Dado um centro de custo com apontamentos históricos
Quando ele for inativado
Então não deve aparecer em novos registros
Mas os apontamentos existentes devem continuar legíveis
```

## HD-US-0702 — Administrar catálogo de serviços

**Classificação:** `CONFIRMED`. **Prioridade:** P0. **Perfil:** Administrador/Gestor de catálogo.

**User Story:** Como gestor, quero organizar grupos, serviços, sistemas e itens de infraestrutura para orientar abertura, triagem e SLA.

**Regras:** `BR-0704` código único por tipo/escopo; `BR-0705` filho não fica ativo sob pai inativo; `BR-0706` mudança não reclassifica tickets existentes silenciosamente.

## HD-US-0703 — Vincular ativo ou equipamento ao ticket

**Classificação:** `CONFIRMED`. **Prioridade:** P1. **Perfil:** Participante autorizado.

**User Story:** Como participante autorizado, quero vincular um ativo existente para dar contexto técnico ao atendimento.

**Regras:** `BR-0707` não duplicar inventário; `BR-0708` ativo inacessível não aparece na busca; `BR-0709` remoção do vínculo preserva histórico.

## HD-US-0704 — Configurar valores por hora

**Classificação:** `CONFIRMED` no legado; `INFERRED` no produto atual. **Prioridade:** P1. **Perfil:** Administrador/Financeiro.

**User Story:** Como financeiro autorizado, quero configurar valores por hora por escopo para calcular o custo do atendimento.

**Regras:** `BR-0710` decimal não negativo; `BR-0711` intervalos não se sobrepõem no mesmo escopo; `BR-0712` apontamento usa taxa vigente ou snapshot definido.

> Os IDs históricos `HD-US-0705` a `HD-US-0708` e `BR-0713` a `BR-0724` foram retirados do escopo. Eles não são reutilizados nem renumerados.

## HD-US-0709 — Gerar relatório de faturamento de tickets

**Classificação:** `INFERRED`. **Prioridade:** P1. **Perfil:** Financeiro/Gestor autorizado.

**User Story:** Como financeiro autorizado, quero consolidar horas e despesas de tickets para conferência e faturamento.

**Regras:** `BR-0725` timezone e intervalo explícitos; `BR-0726` cada valor rastreia fonte e taxa; `BR-0727` fechamento é idempotente e não altera a origem.

## HD-US-0710 — Visualizar dashboard operacional

**Classificação:** `INFERRED`. **Prioridade:** P1. **Perfil:** Gestor/Analista.

**User Story:** Como gestor, quero acompanhar volume, backlog, tempos e produtividade do atendimento.

**Regras:** `BR-0728` KPI possui fórmula documentada; `BR-0729` filtro e timezone visíveis; `BR-0730` drill-down reconcilia com o indicador quando aplicável.

## HD-US-0711 — Analisar cumprimento de SLA

**Classificação:** `INFERRED`. **Prioridade:** P1. **Perfil:** Gestor/Analista.

**Regras:** `BR-0731` denominador e exclusões explícitos; `BR-0732` políticas históricas preservadas; `BR-0733` tickets sem SLA aparecem separados.

## HD-US-0712 — Analisar satisfação do atendimento

**Classificação:** `INFERRED`. **Prioridade:** P2. **Perfil:** Gestor/Analista.

**Regras:** `BR-0734` fórmula segue 01.6; `BR-0735` sem resposta não equivale a zero; `BR-0736` amostras pequenas obedecem política de privacidade.

## HD-US-0713 — Consultar log de auditoria

**Classificação:** `INFERRED`. **Prioridade:** P1. **Perfil:** Auditor/Administrador autorizado.

**Regras:** `BR-0737` log append-only; `BR-0738` acesso ao log também é auditado; `BR-0739` tokens, senhas, webhooks e anexos nunca são registrados.

## HD-US-0714 — Publicar artigo ou FAQ

**Classificação:** `PROPOSED`. **Prioridade:** P3. **Perfil:** Autor/Revisor de conhecimento.

**Regras:** `BR-0740` publicação exige revisor quando configurado; `BR-0741` versões publicadas são preservadas; `BR-0742` conteúdo não executa scripts.

## HD-US-0715 — Sugerir conhecimento durante abertura ou atendimento

**Classificação:** `PROPOSED`. **Prioridade:** P3. **Perfil:** Solicitante/Técnico.

**Regras:** `BR-0743` somente conteúdo publicado e autorizado; `BR-0744` sugestão não envia texto sensível a terceiro sem base aprovada; `BR-0745` usuário sempre pode continuar o ticket.

## HD-US-0716 — Declarar permissões do módulo no RBAC existente

**Classificação:** `CONFIRMED`. **Prioridade:** P0. **Perfil:** Administrador corporativo.

**Regras:** `BR-0746` não criar login ou papel paralelo; `BR-0747` negar por padrão; `BR-0748` ação administrativa não é implicada por simples `view`.

## HD-US-0717 — Disponibilizar centros de custo em Meu Tempo

**Classificação:** `CONFIRMED`. **Prioridade:** P1. **Perfil:** Sistema; Administrador do catálogo; usuário de Meu Tempo.

**User Story:** Como usuário de Meu Tempo, quero encontrar centros de custo ativos no seletor Projeto para classificar horas sem criar um projeto duplicado.

**Regras:**

- `BR-0755` cada centro de custo ativo produz exatamente uma opção lógica no seletor Projeto.
- `BR-0756` a opção referencia o identificador estável do centro, não uma cópia por nome.
- `BR-0757` nome e status alterados refletem no seletor após atualização consistente do catálogo.
- `BR-0758` centro inativo não aparece para novo uso e permanece resolvível no histórico.
- `BR-0759` o dialog Criar projeto de Meu Tempo nunca cria nem edita centro de custo.
- `BR-0760` a interface não expõe origem técnica nem separa centros de custo e projetos manuais por badge/grupo.

```gherkin
Dado que Financeiro está ativo no cadastro de centros de custo
Quando o usuário abrir o seletor Projeto em Meu Tempo
Então Financeiro deve aparecer uma única vez
E não deve ser identificado por origem técnica
```

## Estados e pendências

Loading, vazio, erro, sucesso, conflito, sem permissão e indisponibilidade da fonte corporativa devem ser representados. Ownership de cadastros, KPIs, privacidade, taxas e conhecimento estão em [lacunas-e-ambiguidades.md](../../docs/lacunas-e-ambiguidades.md). Modelo conceitual em [modelo-de-dominio.md](../../docs/modelo-de-dominio.md).
