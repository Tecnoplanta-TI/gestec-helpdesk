# Gestec Help Desk

Módulo de Help Desk integrado ao Gestec para receber e tratar tickets do Zeev, registrar horas, administrar centros de custo, inventariar ativos e gerar relatórios.

As regras funcionais continuam documentadas em [index.md](index.md), [docs/](docs/) e [specs/](specs/). O protótipo oficial permanece em `pencil-new.pen`.

## Stack executável

- Next.js 15.5, React 19 e TypeScript;
- shadcn/ui com preset `b2D0vQOME`;
- PostgreSQL 18 e Prisma 6;
- autenticação delegada ao Gestec por cabeçalhos assinados;
- Vitest para testes automatizados;
- ExcelJS para exportação `.xlsx`.

## Ambiente local

Pré-requisitos: Node.js 24+ e PostgreSQL 18+.

1. Copie `.env.example` para `.env.local` e configure as credenciais locais.
2. Para o Prisma CLI, configure `DATABASE_URL` e `SHADOW_DATABASE_URL` também em `.env`.
3. Instale as dependências e prepare o banco:

```powershell
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

4. Inicie a aplicação:

```powershell
npm run dev
```

Acesse `http://localhost:3000/gestec_help_desk/tickets`.

O seed é exclusivamente de desenvolvimento. Dados ilustrativos não são carregados automaticamente em produção.

## Autenticação do Gestec

O módulo não possui login ou cadastro de credenciais próprio.

- Em desenvolvimento, `GESTEC_AUTH_MODE=development` usa a identidade local definida por variáveis de ambiente.
- Em produção, o Gestec hospedeiro deve enviar `x-gestec-user-id`, `x-gestec-external-id`, `x-gestec-user-name`, `x-gestec-user-email`, `x-gestec-user-role`, `x-gestec-timestamp` e `x-gestec-signature`. Os identificadores externos podem ser textuais; o módulo os associa a uma chave UUID local.
- A assinatura é HMAC-SHA256 sobre os valores canônicos e expira em cinco minutos.
- `GESTEC_ALLOW_DEV_AUTH` deve permanecer `false` em produção.

## Integração Zeev local

Para testar o **processo real** na sua máquina:

1. `npm run dev`
2. `npm run zeev:tunnel` e copie a URL HTTPS
3. no Zeev, tarefa de serviço POST em `/api/v1/gestec-help-desk/integrations/zeev/tickets`
4. no `.env.local`: `ZEEV_API_TOKEN` e os apelidos `ZEEV_TASK_CONTACT_CODE`, `ZEEV_TASK_SERVICE_CODE`, `ZEEV_TASK_APPROVE_CODE`

A TI atende no Help Desk; o solicitante abre e avalia no Zeev. Detalhes: [docs/implementacao-local.md](docs/implementacao-local.md).

| Direção | Endpoint | Uso |
|---|---|---|
| Zeev → Help Desk | `POST /api/v1/gestec-help-desk/integrations/zeev/tickets` | Criar ou atualizar ticket com idempotência |
| Zeev → Help Desk | `POST /api/v1/gestec-help-desk/integrations/zeev/evaluations` | Receber avaliação do solicitante |
| Help Desk → Zeev | `PUT /api/2/assignments/instance/{id}/{taskCode}` | Concluir contato, atendimento e aprovação interna da TI |
| Help Desk → Zeev | `POST /api/2/messages` | Comentário externo visível ao solicitante |

Os endpoints de entrada exigem `Authorization: Bearer <ZEEV_INBOUND_TOKEN>`. A saída usa `ZEEV_API_TOKEN` do usuário de integração do Zeev.

## Verificações

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

## Escopo ainda dependente do ambiente externo

- Publicar o módulo em HTTPS no Gestec e apontar as integrações HTTP do Zeev para essa URL;
- conectar o adaptador de sessão ao middleware real do Gestec;
- configurar e-mail/notificações, deixados para a etapa posterior por decisão do produto.
