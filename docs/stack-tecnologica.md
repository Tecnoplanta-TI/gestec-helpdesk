# Stack Tecnológica

## 1. Premissa

O código da aplicação não está neste repositório. Os itens `EXISTING` abaixo são herdados do Gestec conforme `referencia-gestec.md` e `decisoes-tecnicas.md`; não foram verificados contra o repositório de implementação nesta análise.

| Tecnologia | Responsabilidade | Motivo da escolha | Status |
|------------|------------------|-------------------|--------|
| TypeScript | Linguagem ponta a ponta | Contratos consistentes e integração com a stack Gestec | EXISTING |
| Node.js | Runtime server-side e tooling | Runtime do Next.js/Gestec | EXISTING |
| Next.js 15 App Router | Frontend, rotas e API | Framework já adotado pelo Gestec | EXISTING |
| React 19 | Interface | Base do Gestec | EXISTING |
| PostgreSQL | Banco transacional | Relacionamentos, integridade e relatórios do domínio | EXISTING |
| Prisma 6 | ORM e migrations | Padrão já documentado no Gestec | EXISTING |
| NextAuth.js 4 | Login e sessão | Reutiliza autenticação atual; evita login paralelo | EXISTING |
| RBAC `module:action` | Autorização | Integra `Modules`, `Actions`, `ProtectedRoute` e API | EXISTING |
| Zod | Validação server/client | Contratos tipados e schemas discriminados | EXISTING |
| React Hook Form | Formulários | Integração existente com Zod | EXISTING |
| shadcn/ui | Componentes e design system | Componentes acessíveis em código-fonte | EXISTING |
| Tailwind CSS 4 | Tokens e layout | Padrão Gestec | EXISTING |
| Geist | Tipografia | Padrão documentado e também presente no preset pedido | EXISTING |
| Lucide React | Referência legada do código Gestec documentado | Não deve prevalecer sobre a biblioteca definida pelo preset obrigatório do Help Desk | LEGACY_REFERENCE |
| Hugeicons | Ícones do preset `b2D0vQOME` | Obrigatório no coding; no Pencil foi aproximado por traço linear compatível | DESIGN_APPLIED / CODE_REQUIRED |
| TanStack Query 5 | Data fetching e cache client-side | Padrão Gestec para queries/mutations | EXISTING |
| Estado local/Context | Estado efêmero de UI | Evita store global sem necessidade | RECOMMENDED |
| Zustand | Timer/estado global complexo, se necessário | Legado validou o caso, mas o Gestec pode já ter solução | TO_DEFINE |
| DataTable/TanStack Table | Tabelas, paginação, ordenação e filtros | Reutilizar componente existente antes de adicionar dependência | EXISTING |
| Recharts | Dashboards e KPIs | Evidência apenas no legado; ecossistema React | TO_DEFINE |
| Sonner | Toasts | Padrão documentado do Gestec Radix/shadcn | EXISTING |
| pg-boss + PostgreSQL | Jobs de notificações, relatórios e integrações assíncronas | Reutiliza o PostgreSQL já adotado e elimina a dependência operacional de Redis para o Help Desk | DECIDED |
| Object storage compatível com Blob/S3 | Anexos e comprovantes | Não armazenar binário no PostgreSQL; provider ainda indefinido | TO_DEFINE |
| Serviço de e-mail | Notificações externas | Canal citado nas specs, fornecedor ausente | TO_DEFINE |
| Notificações in-app | Eventos ao solicitante/técnico | Necessárias para triagem, aprovação e mensagens | RECOMMENDED |
| Logs estruturados | Diagnóstico de API/jobs | Evita logs ad hoc e facilita correlação | RECOMMENDED |
| Auditoria persistente | Eventos de segurança e negócio | Rastreabilidade de mudanças e conformidade | RECOMMENDED |
| OpenTelemetry | Traces, métricas e correlação | Observabilidade independente de fornecedor | RECOMMENDED |
| Sentry ou equivalente | Erros frontend/backend | Produto/ferramenta ainda não escolhido | TO_DEFINE |
| Vitest ou Jest | Testes unitários | Escolher o runner já usado pelo Gestec | TO_DEFINE |
| Testes de integração com PostgreSQL | Controllers, autorização e concorrência | Valida contratos reais e constraints | RECOMMENDED |
| Playwright | Testes E2E | Fluxos críticos multiator e acessibilidade básica | RECOMMENDED |
| ESLint | Lint | Deve reutilizar configuração do Gestec | EXISTING |
| Formatter do Gestec | Formatação | Evita configuração paralela | TO_DEFINE |
| Package manager do Gestec | Dependências e scripts | Não existe manifesto neste repositório | TO_DEFINE |
| Docker | PostgreSQL local e deploy | Adotar somente se já fizer parte do Gestec | TO_DEFINE |
| CI/CD do Gestec | Build, lint, typecheck, testes e migrations | Evita pipeline paralelo | TO_DEFINE |
| Plataforma de deploy do Gestec | Hospedagem | O repositório atual não contém evidência | TO_DEFINE |
| Markdown + ADRs leves | Documentação | Padrão atual deste repositório | EXISTING |

> **Decisão fechada:** pg-boss não está classificado como `TO_DEFINE`. Sua implementação sobre PostgreSQL é obrigatória na fase de coding do Gestec Help Desk.

## 2. shadcn/ui e preset oficial solicitado

O código `b2D0vQOME` foi validado com `shadcn@4.18.0 preset decode` em 2026-08-14:

| Propriedade | Valor decodificado |
|-------------|--------------------|
| Style | `luma` |
| Base color / theme | `neutral` / `neutral` |
| Chart color | `emerald` |
| Icon library | `hugeicons` |
| Font / heading | `geist` / `inherit` |
| Radius | `medium` |
| Menu accent | `subtle` |
| Menu color | `default-translucent` |

O preset foi aplicado como referência visual integral do `pencil-new.pen` e validado nas 46 telas mantidas em 2026-08-27. Seu uso no código é obrigatório e não está `TO_DEFINE`. A execução técnica ocorrerá no repositório de implementação porque:

1. não existe `package.json`, `components.json`, Tailwind ou CSS global neste repositório;
2. a aplicação de destino está em outro repositório Gestec;
3. os componentes existentes precisam ser reconciliados sem substituir o preset obrigatório;
4. a arquitetura e os aliases reais somente podem ser verificados no repositório executável.

Procedimento obrigatório no repositório de implementação:

1. localizar a raiz do projeto Next.js executável;
2. executar exatamente `npx shadcn@latest init --preset b2D0vQOME --template next`;
3. executar `npx shadcn@latest info --json` e confirmar que o preset foi resolvido corretamente;
4. comparar componentes, aliases, `base`, CSS e tokens, preservando customizações compatíveis;
5. revisar diffs componente a componente;
6. executar build, lint, typecheck, testes e QA visual.

## 3. Restrições arquiteturais

- Não criar autenticação local, JWT próprio ou cadastro duplicado de usuários.
- Não transportar a arquitetura Electron/Cosmos do legado.
- Não persistir secrets de integrações em texto puro nem devolvê-los ao client.
- Não executar integrações HTTP arbitrárias sem proteção contra SSRF, limites e allow/deny policy.
- Não armazenar anexos diretamente no banco relacional quando object storage estiver disponível.
