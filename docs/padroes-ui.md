# Padrões de UI

Convenções visuais e de interação do **Gestec existente** + mockups Figma do Help Desk.

> Base técnica: shadcn/ui (estilo "new-york"), Tailwind CSS 4, Lucide icons, fonte Geist.  
> Referência completa: [referencia-gestec.md](referencia-gestec.md)

## Design system

| Item | Valor / Referência |
|------|-------------------|
| **Figma Help Desk** | [link do arquivo — TBD] |
| **Component library** | shadcn/ui (`C:\Users\julia.souza\Gestec\components.json`) |
| **Tipografia** | Geist (via Next.js) |
| **Paleta de cores** | Tema neutral (shadcn), light default + dark via `next-themes` |
| **Espaçamento** | Tailwind spacing scale |
| **Ícones** | Lucide React |

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

## Layout (herdado do Gestec)

- **Sidebar:** `AppSidebar` fixa à esquerda (`SidebarProvider`)
- **Header:** `SiteHeader` com breadcrumb e ações
- **Conteúdo:** área principal via `DefaultLayout`
- **Mobile:** header alternativo + cards no lugar de tabelas (`useIsMobile`)
- **Título de página:** componentes `Title` + `Description`

## Acessibilidade

- Contraste mínimo WCAG AA
- Foco visível em elementos interativos
- Labels em todos os campos de formulário

## Responsividade

| Breakpoint | Comportamento |
|------------|---------------|
| Desktop (≥ 1024px) | Layout completo |
| Tablet (768–1023px) | TBD |
| Mobile (< 768px) | TBD |
