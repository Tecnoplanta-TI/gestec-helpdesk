# 15 — Meu Tempo

## Metadados

| Campo | Valor |
|-------|-------|
| **ID** | 15 |
| **Nome** | Meu Tempo |
| **Epic** | Produtividade, classificação de esforço e cobrança |
| **Status** | Em revisão — fluxo funcional confirmado |
| **Prioridade** | P1 |
| **Perfis envolvidos** | Técnico, Gestor, Administrador e Auditor autorizado |
| **Classificação** | `CONFIRMED`, com decisões pontuais `INFERRED`, `PROPOSED` e `VALIDAR` |
| **Origem** | Pedidos funcionais de 2026-08-27; Specs 01.3, 01.4 e 07; anexos Clockify apenas como referência estrutural |
| **Última atualização** | 2026-08-27 |
| **Referência Pencil** | `Meu Tempo — Timer parado`, `Meu Tempo — Timer ativo`, `Meu Tempo — Lançamento manual`, `Meu Tempo — Selecionar projeto`, `Meu Tempo — Criar projeto`, `Meu Tempo — Projeto criado`, `Meu Tempo — Apontamento gerado por ticket`, `Meu Tempo — Ticket sem centro de custo`, `Meu Tempo — Editar apontamento` |

## 1. Objetivo e limites

Concentrar timer, lançamento manual, classificação por projeto, histórico, totais, correções e exportação em um único destino chamado **Meu Tempo**. **Apontamentos** permanece integrado a esse fluxo e não constitui página ou item separado da sidebar.

Os projetos desta Spec existem somente para classificar, medir, faturar, filtrar, exportar e relatar horas. Não existe recriação do antigo módulo genérico “Projetos e tarefas” nem uma página principal “Projetos”. O Clockify é referência apenas para composição da barra, alternância de modo e agrupamento visual; identidade, textos, navegação e componentes permanecem do Gestec com o preset shadcn `b2D0vQOME`.

Esta Spec é um contrato funcional e conceitual. Ela não define endpoints, tabelas físicas, bibliotecas de aplicação ou detalhes de implementação.

## 2. Navegação e telas

| Experiência | Abertura | Item ativo |
|-------------|----------|------------|
| Timer parado, timer ativo ou lançamento manual | `/gestec_help_desk/meu-tempo` | Meu Tempo |
| Selecionar ou criar projeto manual | Dialog ou Sheet iniciado em Meu Tempo | Meu Tempo |
| Projeto criado | Retorno à página com feedback e projeto selecionado | Meu Tempo |
| Apontamento gerado por ticket | Histórico de Meu Tempo | Meu Tempo |
| Ticket sem centro de custo | Estado de pendência no histórico | Meu Tempo |
| Editar apontamento | Dialog ou Sheet sobre Meu Tempo | Meu Tempo |

- Não existe rota principal nem item de sidebar **Apontamentos** ou **Projetos**.
- Trocar de página não encerra nem duplica um timer ativo.
- Timer parado e timer ativo são telas completas comparáveis no `.pen`.
- Em larguras menores a barra pode quebrar em linhas, sem cortar descrição, projeto, duração ou ações.

## 3. Projeto usado no apontamento

### 3.1 Conceito apresentado ao usuário (`CONFIRMED`)

Todo novo timer ou lançamento manual possui exatamente um **Projeto**. O seletor apresenta uma lista única com centros de custo ativos e projetos manuais ativos.

```text
Projeto
├── Financeiro · CC-10027
├── Recursos Humanos · CC-10031
├── Operações · CC-10041
├── Implantação SemeAR · SEM-009
└── Evolução da plataforma · SEM-014
```

- Não exibir origem, tipo técnico, “Zeev”, “SemeAR” como badge, nem separar a lista por origem.
- Grupos neutros permitidos: **Recentes** e **Todos os projetos**.
- Quando nomes forem semelhantes, código ou identificador neutro pode desambiguar.
- Cor de identificação não é usada para comunicar origem e nunca é o único identificador.

### 3.2 Centro de custo disponibilizado como projeto (`CONFIRMED`)

- O centro de custo é cadastrado e administrado no Gestec conforme a Spec 07.
- Cada centro de custo ativo aparece automaticamente no seletor de Meu Tempo, sem cadastro duplicado.
- O vínculo usa o identificador estável do centro de custo; renomear não cria outra opção nem quebra o histórico.
- Inativar impede novos usos, mas preserva apontamentos, relatórios, exportações e snapshots anteriores.
- Centro de custo com apontamentos não pode ser excluído de forma destrutiva.
- O dialog **Criar projeto** não cria nem edita centro de custo.

### 3.3 Projeto manual (`CONFIRMED`)

- É criado pelo dialog **Criar projeto**, principalmente para iniciativas SemeAR que não dependem de centro de custo.
- Campos: nome, cor de identificação, disponível para todos quando permitido pelo RBAC, faturável por padrão e status ativo.
- Somente usuário autorizado visualiza a ação de criação e pode editar, ativar ou arquivar.
- Projeto manual arquivado não aparece em novos registros e permanece no histórico, relatórios e exportações.
- Projeto com apontamento não é excluído fisicamente.
- A natureza interna de centro de custo ou projeto manual é imutável e não aparece no seletor.

## 4. Barra de registro

### 4.1 Composição (`CONFIRMED`)

A barra superior representa um novo registro iniciado manualmente e contém, nesta ordem:

1. descrição da atividade;
2. seletor único **Projeto**;
3. botão de ícone de faturabilidade;
4. contador ou data e horários manuais;
5. ação principal **Iniciar**, **Parar** ou **Adicionar**;
6. alternância Timer/Manual;
7. menu de ações adicionais, quando necessário.

Não existe campo ou seletor de ticket na barra. Tickets aparecem somente em apontamentos gerados pelo fluxo do atendimento e nas linhas/detalhes do histórico.

Componentes de referência: `Input`, `Combobox`, `Button`, `Tooltip`, `DropdownMenu`, `Dialog`/`Sheet`, `Separator`, `Toggle` e `Alert`. Labels ficam acima de campos em dialogs; valores ficam dentro dos controles e placeholders não substituem labels.

### 4.2 Timer parado (`CONFIRMED`)

- Descrição vazia com placeholder **Em que você está trabalhando?**.
- Projeto não selecionado, contador `00:00:00` e botão **Iniciar**.
- Iniciar exige descrição e projeto ativos.
- Erros distinguem descrição ausente, projeto ausente, projeto indisponível e falha de carregamento.
- O histórico e os totais do dia e da semana continuam visíveis.

### 4.3 Timer ativo (`CONFIRMED`)

- Descrição, projeto e estado faturável permanecem visíveis.
- Contador em execução possui feedback textual e visual que não depende somente da cor.
- **Parar** substitui **Iniciar** e usa variante destrutiva.
- Existe no máximo um timer ativo por usuário, inclusive entre dispositivos.
- Alterar projeto ou faturabilidade durante a execução exige confirmação.
- Repetir a parada por retry não cria dois apontamentos.
- Pausa e retomada do timer manual permanecem `VALIDAR`.

### 4.4 Lançamento manual (`CONFIRMED`)

O modo manual preserva descrição, projeto e faturabilidade e substitui o contador por data, hora inicial, hora final e duração calculada. A ação principal é **Adicionar**. Alternar de volta ao timer preserva os campos comuns enquanto a página permanecer aberta.

- Hora final deve ser posterior à inicial; duração fictícia não é criada.
- Conflitos de sobreposição seguem política `VALIDAR`.
- Falha de salvamento preserva os valores e permite nova tentativa.

### 4.5 Faturabilidade por ícone (`CONFIRMED`)

Usar botão de ícone equivalente a `CircleDollarSign`, nunca um campo textual largo.

| Estado | Apresentação | Tooltip | Nome acessível |
|--------|--------------|---------|----------------|
| Faturável | preenchimento/contorno e indicador de seleção | Faturável | Marcar como não faturável |
| Não faturável | contorno sem seleção | Não faturável | Marcar como faturável |

- Não depender somente da cor.
- Barra, lançamento manual e edição usam controle interativo.
- Histórico usa o mesmo símbolo de forma informativa.
- Filtros podem usar o símbolo acompanhado de texto para evitar ambiguidade.
- Apontamento pendente sem projeto válido é não faturável.

## 5. Seleção e criação de projeto manual

### 5.1 Seletor (`CONFIRMED`)

- Lista centros de custo ativos e projetos manuais ativos na mesma coleção visual.
- Pesquisa por nome ou código, oferece **Recentes** e **Todos os projetos** e elimina duplicatas por identidade estável.
- Abrir o seletor ou dialog não apaga a descrição digitada.
- Usuário autorizado vê **Criar projeto**; usuário sem permissão apenas pesquisa e seleciona.
- Falha de carregamento oferece nova tentativa sem apagar a barra.

### 5.2 Dialog Criar projeto (`CONFIRMED`)

- Título **Criar projeto**, botão Fechar, ação secundária **Cancelar** e ação principal **Criar projeto**.
- Labels acima de Nome do projeto, Cor de identificação, Disponível para todos, Faturável por padrão e Status ativo.
- Nome é obrigatório; duplicidade normalizada por nome/código é rejeitada com mensagem junto ao campo.
- **Criar projeto** permanece desabilitado enquanto inválido ou durante salvamento.
- Loading impede envio duplicado; erro preserva dados; sucesso emite feedback.
- Fechar com alterações não salvas exige confirmação.
- A opção **Disponível para todos** depende do RBAC final (`VALIDAR` quanto ao papel e escopo exatos).

Após sucesso, o sistema fecha o dialog, atualiza o seletor, seleciona o novo projeto, preserva a descrição, exibe confirmação e permite iniciar sem recarregar a página.

## 6. Geração automática ao finalizar ticket

### 6.1 Fluxo confirmado

1. O ticket possui centro de custo cadastrado no Gestec.
2. Os períodos de trabalho de cada participante são registrados no atendimento.
3. O usuário executa a transição que finaliza o ciclo de resolução.
4. O sistema consolida somente os intervalos válidos.
5. Cria ou atualiza o apontamento de cada usuário e ciclo de resolução.
6. O projeto do apontamento referencia o centro de custo do ticket.
7. Número e resumo do ticket aparecem na linha do histórico.
8. O apontamento entra nos totais, filtros, relatórios e exportações.

O evento exato do workflow que representa “finalização” — envio para aprovação, aprovação do solicitante, resolução ou encerramento — permanece `VALIDAR` porque as Specs atuais descrevem mais de uma transição terminal.

### 6.2 Consolidação e idempotência

| Decisão | Contrato | Classe |
|---------|----------|--------|
| Duração | Soma de `fim - início` dos intervalos válidos do usuário no ciclo | `CONFIRMED` |
| Período pausado | Trecho pausado não é contado | `CONFIRMED` |
| Intervalo sem fim ou inválido | Não compõe duração nem produz duração fictícia; gera pendência | `CONFIRMED` |
| Múltiplos usuários | Um apontamento separado por usuário e ciclo | `CONFIRMED` |
| Chave idempotente | ticket + usuário + ciclo de resolução | `PROPOSED` |
| Finalização repetida | Atualiza o mesmo registro do ciclo; não duplica | `CONFIRMED` |
| Reabertura | Preserva o ciclo anterior; trabalho novo pertence a ciclo novo | `CONFIRMED` |
| Centro de custo renomeado | Preserva identidade estável e snapshot histórico | `CONFIRMED` |
| Centro de custo alterado após ciclo | Regra de reclassificação do registro já gerado | `VALIDAR` |
| Centro de custo inativo | Preservar vínculo histórico; permitir finalizar ou exigir correção | `VALIDAR` |
| Ticket sem tempo válido | Não criar duração fictícia; sinalizar ausência de horas | `CONFIRMED` |
| Quem corrige registro automático | Papel, prazo e necessidade de aprovação | `VALIDAR` |

### 6.3 Linha gerada por ticket (`CONFIRMED`)

A linha mostra número e resumo do ticket, projeto, usuário, data, intervalo inicial/final quando representável, duração consolidada, símbolo de faturabilidade, status e ações permitidas. Múltiplos intervalos podem ser exibidos como “3 períodos” no resumo e detalhados na edição/auditoria.

A diferença entre origem automática e manual fica no detalhe e na auditoria, sem badge de origem na linha principal.

### 6.4 Ticket sem centro de custo (`CONFIRMED` + `VALIDAR`)

- Nunca associar projeto aleatório.
- O apontamento fica **Pendente de classificação**, sem faturabilidade e fora dos totais faturáveis até obter projeto válido.
- A interface orienta corrigir o centro de custo no ticket; não oferece criar centro de custo pelo dialog Criar projeto.
- Bloquear a finalização em vez de gerar pendência é alternativa `VALIDAR`; até a decisão, a documentação e o `.pen` representam a pendência explícita.
- O papel que corrige o centro de custo e libera a classificação é `VALIDAR`.

## 7. Histórico, filtros, totais e cobrança

- Histórico agrupado por semana e por dia, com total semanal e total diário.
- Linha manual: descrição, projeto, intervalo, duração, símbolo faturável, reiniciar e menu autorizado.
- Linha de ticket: número, resumo, projeto, usuário, data/intervalo, duração, símbolo faturável, status e ações.
- **Reiniciar semelhante** cria timer novo com dados reaproveitados e não altera o apontamento anterior; ticket não é copiado para a barra manual.
- Filtros: período, projeto, centro de custo, projeto manual, ticket, usuário, status e faturável/não faturável.
- Totais: hoje, semana, por projeto, por centro de custo, por projeto manual, faturável e não faturável.
- Totais por centro de custo são base de horas para cobrança. Preço/hora, moeda, arredondamento, impostos e congelamento monetário permanecem `VALIDAR`.
- Totais, relatórios e exportação reaplicam exatamente o mesmo período, timezone, filtros e escopo de autorização.

## 8. User Stories e regras de negócio

### HD-US-1501 — Acompanhar e controlar meu timer

**Como** técnico, **quero** iniciar e parar meu timer, **para** registrar o esforço real de uma atividade.

- `BR-1501` existe no máximo um timer ativo por usuário.
- `BR-1502` duração é calculada a partir de instantes persistidos, não do texto do contador.
- `BR-1503` iniciar/parar repetido é idempotente.
- `BR-1504` timer de Meu Tempo não altera SLA automaticamente.

```gherkin
Dado que informei descrição e projeto ativos
Quando iniciar o timer
Então a barra deve mostrar a atividade, o projeto, o tempo transcorrido e a ação Parar

Dado que meu timer está ativo
Quando a parada for recebida novamente por repetição de rede
Então deve existir somente um apontamento resultante
```

### HD-US-1502 — Criar apontamento manual

**Como** técnico, **quero** lançar um intervalo manual, **para** registrar trabalho não cronometrado.

- `BR-1505` a duração deve ser positiva.
- `BR-1506` a barra manual não contém campo de ticket.
- `BR-1507` sobreposição segue política `VALIDAR`.
- `BR-1508` ajuste posterior registra ator, motivo, antes e depois.

### HD-US-1503 — Consultar e filtrar apontamentos

**Como** usuário autorizado, **quero** consultar apontamentos, **para** reconciliar horas registradas.

- `BR-1509` totais usam o mesmo filtro e escopo da lista.
- `BR-1510` período usa o timezone registrado/exibido.
- `BR-1511` visão de equipe não amplia RBAC.
- `BR-1512` paginação e ordenação são determinísticas.

### HD-US-1504 — Corrigir ou invalidar apontamento

**Como** usuário autorizado, **quero** corrigir ou invalidar registro, **para** manter o histórico confiável.

- `BR-1513` exclusão operacional é lógica.
- `BR-1514` registro derivado de ticket exige motivo e auditoria na edição.
- `BR-1515` conflito de versão retorna o estado atual sem sobrescrever silenciosamente.
- `BR-1516` prazo de edição é `VALIDAR`.

### HD-US-1505 — Exportar apontamentos autorizados em Excel

**Como** gestor, **quero** exportar o recorte autorizado, **para** análise e cobrança.

- `BR-1517` exportação reaplica filtros, timezone, ordenação e RBAC.
- `BR-1518` formato requerido é Excel `.xlsx` com tipos seguros.
- `BR-1519` arquivos grandes são processados de forma assíncrona e auditada.
- `BR-1520` falha não publica arquivo parcial.
- `BR-1521` CSV não substitui esta entrega.

### HD-US-1506 — Selecionar projeto na lista unificada

**Como** técnico, **quero** pesquisar uma lista única de projetos, **para** classificar minhas horas sem compreender detalhes internos.

- `BR-1522` todo novo timer ou lançamento manual exige exatamente um projeto ativo.
- `BR-1523` seletor não separa nem identifica visualmente a origem técnica.
- `BR-1524` itens inativos ou arquivados não aparecem para novo registro.
- `BR-1525` busca aceita nome ou código e recentes não duplicam itens.

```gherkin
Dado que existem centros de custo e projetos manuais ativos
Quando abrir o seletor
Então devo encontrá-los juntos em Recentes ou Todos os projetos
E não devo visualizar badges ou grupos de origem
```

### HD-US-1507 — Disponibilizar centro de custo como projeto

**Como** técnico, **quero** encontrar centros de custo ativos no seletor, **para** classificar horas sem cadastro duplicado.

- `BR-1526` disponibilidade deriva do cadastro de centro de custo no Gestec.
- `BR-1527` vínculo usa identificador estável.
- `BR-1528` renomear atualiza a opção sem criar duplicata.
- `BR-1529` inativar impede uso novo e preserva histórico.

### HD-US-1508 — Tratar projeto indisponível no registro manual

**Como** técnico, **quero** receber orientação clara, **para** não iniciar horas em projeto inválido.

- `BR-1530` ausência ou falha nunca seleciona projeto aleatório.
- `BR-1531` projeto inativado entre seleção e início bloqueia a ação e solicita nova escolha.
- `BR-1532` falha de lista oferece nova tentativa e preserva descrição.

### HD-US-1509 — Criar projeto manual

**Como** usuário autorizado, **quero** criar projeto pelo seletor, **para** classificar uma iniciativa sem centro de custo.

- `BR-1533` nome é obrigatório e duplicidade normalizada é rejeitada.
- `BR-1534` campos de criação são nome, cor, disponibilidade, faturabilidade padrão e status ativo.
- `BR-1535` usuário sem permissão não visualiza a ação.
- `BR-1536` loading impede duplicidade e erro preserva valores.
- `BR-1537` sucesso fecha o dialog, atualiza e seleciona o projeto sem reload e preserva descrição.
- `BR-1538` fechar com alterações exige confirmação.

### HD-US-1510 — Editar, ativar e arquivar projeto manual

**Como** administrador autorizado, **quero** manter projetos manuais, **para** controlar disponibilidade sem perder histórico.

- `BR-1539` projeto manual pode ser editado, ativado e arquivado por autorizado.
- `BR-1540` projeto com apontamento não é excluído fisicamente.
- `BR-1541` arquivado some de novos registros e permanece no histórico, relatórios e exportações.
- `BR-1542` natureza interna do projeto não pode ser convertida.

### HD-US-1511 — Alternar timer e lançamento manual

**Como** técnico, **quero** alternar o método de registro, **para** não redigitar contexto.

- `BR-1543` descrição, projeto e faturabilidade são preservados na alternância.
- `BR-1544` manual substitui contador por data, início, fim e duração calculada.
- `BR-1545` mudança sensível durante timer ativo exige confirmação.

### HD-US-1512 — Consultar histórico agrupado

**Como** técnico, **quero** ver registros por semana e dia, **para** conferir minha jornada.

- `BR-1546` agrupamentos exibem total semanal e diário.
- `BR-1547` linha exibe os dados definidos na seção 7 sem badges de origem.
- `BR-1548` projeto inativo/arquivado mantém identificação histórica.

### HD-US-1513 — Reiniciar timer semelhante

**Como** técnico, **quero** reutilizar os dados de um apontamento, **para** iniciar nova sessão.

- `BR-1549` reiniciar cria novo timer e não altera o registro anterior.
- `BR-1550` projeto indisponível exige nova seleção.
- `BR-1551` referência de ticket não é copiada para a barra manual.

### HD-US-1514 — Totalizar horas para gestão e cobrança

**Como** gestor, **quero** totais por projeto e faturabilidade, **para** analisar esforço e apoiar cobrança.

- `BR-1552` totaliza hoje, semana, projeto, centro de custo, projeto manual, faturável e não faturável.
- `BR-1553` total por centro de custo constitui base de horas para cobrança.
- `BR-1554` preço, moeda, arredondamento, impostos e congelamento são `VALIDAR`.

### HD-US-1515 — Recuperar estados vazios e falhas

**Como** técnico, **quero** compreender e recuperar falhas, **para** não perder o contexto preenchido.

- `BR-1555` falha oferece nova tentativa e preserva descrição e seleção válida.
- `BR-1556` lista vazia oferece criar projeto somente a perfil autorizado.
- `BR-1557` mensagens distinguem descrição ausente, projeto ausente, indisponibilidade e falha técnica.

### HD-US-1516 — Gerar apontamento ao finalizar ticket

**Como** técnico, **quero** que os períodos do ticket sejam consolidados em Meu Tempo, **para** não lançar o atendimento novamente.

- `BR-1558` projeto é o centro de custo estável do ticket.
- `BR-1559` ticket e resumo aparecem na linha, não na barra superior.
- `BR-1560` apenas períodos válidos participam da duração.
- `BR-1561` apontamento gerado participa de totais, filtros, relatórios e exportações.

```gherkin
Dado um ticket com centro de custo ativo e períodos válidos
Quando o ciclo de resolução for finalizado
Então Meu Tempo deve conter o apontamento de cada usuário
E cada linha deve mostrar ticket, projeto, duração e faturabilidade
```

### HD-US-1517 — Consolidar períodos e usuários sem duplicidade

**Como** gestor, **quero** consolidação determinística, **para** confiar nas horas faturáveis.

- `BR-1562` soma intervalos válidos por usuário e ciclo.
- `BR-1563` pausas e lacunas não compõem duração.
- `BR-1564` usuários diferentes geram apontamentos diferentes.
- `BR-1565` finalização repetida não duplica o registro.
- `BR-1566` chave ticket + usuário + ciclo é `PROPOSED` como mecanismo de idempotência.

### HD-US-1518 — Preservar ciclos após reabertura

**Como** auditor, **quero** separar trabalho anterior e posterior à reabertura, **para** preservar a história do atendimento.

- `BR-1567` reabertura não altera o apontamento do ciclo anterior.
- `BR-1568` novo trabalho pertence a ciclo novo.
- `BR-1569` relação entre status concretos e identificador do ciclo é `VALIDAR`.

### HD-US-1519 — Tratar ticket sem centro de custo

**Como** técnico, **quero** visualizar a pendência de classificação, **para** corrigir o ticket sem cobrança indevida.

- `BR-1570` nenhum projeto é escolhido automaticamente.
- `BR-1571` pendência é não faturável e não entra no total faturável.
- `BR-1572` interface orienta corrigir o centro de custo no cadastro apropriado.
- `BR-1573` bloquear finalização ou gerar pendência é decisão `VALIDAR`; até decisão, representar pendência.
- `BR-1574` papel corretor é `VALIDAR`.

### HD-US-1520 — Editar apontamento gerado e auditar correção

**Como** usuário autorizado, **quero** corrigir apontamento gerado, **para** resolver inconsistências sem apagar evidência.

- `BR-1575` ticket de origem e chave idempotente não são editáveis.
- `BR-1576` projeto, duração ou faturabilidade alterados exigem motivo.
- `BR-1577` auditoria registra antes, depois, ator, instante e motivo.
- `BR-1578` nova finalização não desfaz silenciosamente correção manual.
- `BR-1579` autoridade de correção e eventual aprovação são `VALIDAR`.

## 9. Permissões

Nomes finais serão reconciliados com RBAC (`GAP-007`):

| Capacidade | Técnico | Gestor | Administrador/Auditor autorizado |
|------------|---------|--------|-----------------------------------|
| Ver/iniciar/parar timer próprio | sim | sim | conforme escopo |
| Criar lançamento manual próprio | sim | sim | conforme escopo |
| Selecionar projetos ativos | sim | sim | sim |
| Criar/editar/arquivar projeto manual | não | conforme permissão | sim |
| Administrar centro de custo | não | conforme permissão | conforme permissão administrativa |
| Editar/inativar registro de terceiro | não | conforme escopo | conforme permissão |
| Corrigir registro gerado por ticket | `VALIDAR` | `VALIDAR` | `VALIDAR` |
| Exportar | conforme permissão | conforme permissão | conforme permissão |

Autorizações são revalidadas na persistência futura; ocultar botão não substitui controle de acesso.

## 10. Estados, acessibilidade e casos de borda

- Loading, vazio, erro, sucesso, conflito, sem permissão e projeto inativado são estados explícitos.
- Skeleton de histórico não apaga a barra preenchida; retry não envia criação ou parada duplicada.
- Botões somente de ícone possuem tooltip e nome acessível; foco retorna ao acionador ao fechar Dialog/Sheet.
- **Parar** usa variante destrutiva; não utilizar “STOP”.
- Nome digitado fica dentro do `Input`; label não recebe valor.
- Dois dispositivos tentando iniciar resultam em um único timer ativo.
- Projeto arquivado entre seleção e início bloqueia persistência e solicita nova escolha.
- Renomear projeto durante timer preserva identidade e atualiza apresentação sem duplicar.
- Perda de autorização durante timer não expõe dados indevidos; forma de parada segura é `VALIDAR`.
- Intervalos que cruzam meia-noite, horário de verão e timezone exigem persistência inequívoca; apresentação segue timezone do usuário.

## 11. Rastreabilidade e classificação

| Descoberta | Classificação | Fonte |
|------------|---------------|-------|
| Centros de custo são administrados no Gestec e aparecem como projetos | `CONFIRMED` | Pedido funcional de 2026-08-27; Spec 07 |
| Lista única, sem Zeev/SemeAR na interface | `CONFIRMED` | Pedido funcional de 2026-08-27 |
| Projeto manual criado no seletor e selecionado sem reload | `CONFIRMED` | Pedido funcional de 2026-08-27 |
| Barra sem ticket e faturabilidade por ícone | `CONFIRMED` | Pedido funcional de 2026-08-27 |
| Disposição compacta, alternância e agrupamento | Requisito `CONFIRMED`; organização visual `INFERRED` | Pedido + anexos estruturais |
| Geração ao finalizar ticket, múltiplos usuários e ciclos | `CONFIRMED`, salvo itens marcados `VALIDAR` | Pedido funcional de 2026-08-27 |
| Chave ticket + usuário + ciclo | `PROPOSED` | Recomendação expressa no pedido |
| Evento terminal exato, corretores e centro inativo | `VALIDAR` | Divergências/ausências nas Specs atuais |
| Pausa/retomada do timer manual | `VALIDAR` | Não confirmado |
| Valores monetários | `VALIDAR` | Não definido |

## 12. Dependências e referências cruzadas

- Administração de centros de custo: [07 — Administração e Insights](07-administracao-projetos-e-insights.md).
- Períodos do atendimento: [01.4 — Atender Solicitação](01.4-help-desk.md).
- Reabertura: [05 — Ciclo de Vida e Colaboração](05-ciclo-de-vida-e-colaboracao.md).
- Modelo conceitual: [modelo-de-dominio.md](../../docs/modelo-de-dominio.md).
- Decisões abertas: [lacunas-e-ambiguidades.md](../../docs/lacunas-e-ambiguidades.md).
- Padrões visuais: [padroes-ui.md](../../docs/padroes-ui.md).
