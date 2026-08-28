# Padrões de UI

Convenções visuais e de interação do **Gestec existente** + design Pencil do Help Desk.

> Base visual do `.pen`: preset shadcn `b2D0vQOME`, estilo Luma, tema neutral, fonte Geist.
> Referência completa: [referencia-gestec.md](referencia-gestec.md)

## Design system

| Item | Valor / Referência |
|------|-------------------|
| **Pencil Help Desk** | `pencil-new.pen` |
| **Component library** | shadcn/ui (`C:\Users\julia.souza\Gestec\components.json`) |
| **Tipografia** | Geist (via Next.js) |
| **Paleta de cores** | Tema neutral (shadcn), light default + dark via `next-themes` |
| **Espaçamento** | Tailwind spacing scale |
| **Ícones** | Traço linear compatível com Hugeicons; biblioteca nativa do Pencil quando disponível |

### Preset oficial solicitado e reconciliação

O preset informado para o Gestec Help Desk é `b2D0vQOME` (`https://ui.shadcn.com/create?preset=b2D0vQOME`). A decodificação pela CLI oficial em 2026-08-14 retornou:

| Propriedade | Preset solicitado | Padrão documentado atual |
|-------------|------------------|--------------------------|
| Style | `luma` | `new-york` |
| Base/theme | `neutral` | `neutral` |
| Charts | `emerald` | não documentado |
| Ícones | `hugeicons` | `lucide` |
| Fonte | `geist` | `geist` |
| Radius | `medium` | não documentado |
| Menu | accent `subtle`; color `default-translucent` | não documentado |

**Direção do design:** o `.pen` usa superfície neutral clara, texto de alto contraste, bordas sutis, raio médio, densidade Luma, cards sem elevação excessiva, sidebar translúcida clara com accent discreto, tipografia Geist e gráficos com destaque emerald. A aplicação integral está presente nas 50 telas mantidas e nos 4 componentes reutilizáveis, incluindo as nove continuações de Meu Tempo, com revisão visual e validação estrutural em 2026-08-27. Como a biblioteca nativa do Pencil não oferece Hugeicons, os ícones usam traço linear equivalente; no código, a biblioteca indicada pelo preset é obrigatória.

Este repositório continua documental: não contém nem deve receber `package.json`, `components.json`, Tailwind ou CSS global. A aplicação técnica do preset pertence ao repositório executável do Gestec.

No coding, o preset `b2D0vQOME` é obrigatório e deve ser inicializado na raiz do projeto Next.js com:

```bash
npx shadcn@latest init --preset b2D0vQOME --template next
```

## Componentes reutilizáveis

| Componente | Uso | Variantes |
|------------|-----|-----------|
| Botão primário | Ação principal | default, disabled, loading |
| Botão secundário | Ação alternativa | — |
| Input de texto | Formulários | error, disabled |
| Tabela | Listagens | paginação, ordenação, filtros |
| Modal | Confirmações / formulários | sm, md, lg |
| Toast / Alert | Feedback | success, error, warning, info |

## Padrões de interação

- **Formulários:** validação inline + resumo de erros no submit
- **Listagens:** paginação server-side quando > 50 itens
- **Confirmação de exclusão:** modal com texto explícito
- **Loading:** skeleton em listas; spinner em botões de ação
- **Formulários shadcn novos:** preferir `Field`/`FieldGroup`, labels associados e mensagens acessíveis; preservar a API já usada pelo Gestec até migração planejada
- **Dialogs:** sempre incluir `DialogTitle`; ações destrutivas exigem confirmação e foco inicial seguro
- **Cores:** usar tokens semânticos (`bg-background`, `text-foreground`, `border-border`), sem cores hardcoded quando houver token

## Layout (herdado do Gestec)

- **Sidebar:** `AppSidebar` fixa à esquerda (`SidebarProvider`)
- **Header:** `SiteHeader` com breadcrumb e ações
- **Conteúdo:** área principal via `DefaultLayout`
- **Mobile:** header alternativo + cards no lugar de tabelas (`useIsMobile`)
- **Título de página:** componentes `Title` + `Description`

### Navegação contextual

- A sidebar deve selecionar o item correspondente à rota atual; subtelas mantêm selecionado o item pai (por exemplo, detalhe do ticket mantém **Tickets** ou **Kanban** conforme a origem; criar/editar apontamento mantém **Meu Tempo**).
- Um item nunca permanece visualmente ativo fora de seu contexto. A seleção usa cor, contraste e `aria-current="page"`, não apenas um marcador cromático.
- A top bar deve representar a tela atual: breadcrumb com módulo, seção e entidade quando houver; ações globais (busca, notificações e perfil) permanecem consistentes.
- Ações específicas da página ficam no cabeçalho do conteúdo ou no último nível contextual, sem substituir indevidamente o breadcrumb.
- Sidebar aberta exibe ícone e rótulo. Recolhida mantém ícones, tooltip, item ativo, badges essenciais e controle acessível para reabrir.
- O timer compacto existe somente na navegação do **Gestec Help Desk**. Recolhido, exibe estado/duração por tooltip ou popover; navegar não interrompe a sessão.

Ordem canônica da sidebar do Help Desk: **Tickets**, **Minha Caixa**, **Kanban**, **Solicitações**, **Meu Tempo**, **SLA**, **Integrações**, **Notificações**, **Conhecimento**, **Relatórios**. Não existe destino independente para apontamentos.

### Estados obrigatórios por tela

| Estado | Representação mínima |
|--------|----------------------|
| Loading | skeleton na geometria final; ação em progresso disabled e com nome acessível |
| Vazio inicial | explicação do que aparecerá e CTA somente se permitido |
| Sem resultado | filtros atuais visíveis e ação para limpar/ajustar filtros |
| Erro recuperável | alerta inline, mensagem útil e tentar novamente |
| Erro de permissão | acesso negado sem revelar conteúdo ou metadados sensíveis |
| Sucesso | toast/feedback anunciado e dados afetados atualizados sem duplicação |
| Mutação incerta | bloquear repetição cega e reconciliar estado no servidor |

## Acessibilidade

- Contraste mínimo WCAG AA
- Foco visível em elementos interativos
- Labels em todos os campos de formulário

## Responsividade

| Breakpoint | Comportamento |
|------------|---------------|
| Desktop (≥ 1280px) | Sidebar aberta por padrão, tabela e ações completas; opção recolhida preserva contexto |
| Desktop compacto (1024–1279px) | Sidebar pode iniciar recolhida; filtros secundários em popover/sheet |
| Tablet (768–1023px) | Sidebar recolhida/drawer, grids empilhados, tabela reduzida e filtros em sheet |
| Mobile (< 768px) | Navegação em drawer, top bar compacta, cards no lugar de tabelas e CTA primário alcançável |

Nenhum breakpoint pode esconder uma ação essencial sem oferecer alternativa em menu, drawer ou card. Overflow horizontal só é aceito para conteúdo intrinsecamente tabular e deve possuir indicação/teclado adequados.

## Checklist antes de implementação visual

1. Inspecionar o `components.json`, aliases, CSS global, Tailwind e componentes instalados no Gestec real.
2. Confirmar que o preset obrigatório `b2D0vQOME` foi inicializado com o comando documentado e reconciliar tokens/componentes existentes sem substituí-lo.
3. Reutilizar componentes existentes antes de adicionar novos.
4. Validar light/dark, teclado, contraste, loading, vazio, erro e mobile.
5. Preservar no código a semântica validada no `.pen`: label fora do controle, valor dentro do campo e mensagem associada ao campo correto.
