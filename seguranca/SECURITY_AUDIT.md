# Security Audit — Gestec Help Desk

**Data da auditoria:** 2026-09-28  
**Escopo:** código, configuração, migrations, dependências, artefatos de entrega e documentação presentes no repositório local  
**Método:** revisão estática e não destrutiva, modelagem de ameaça, rastreamento de entrada até operação sensível, busca de secrets e auditoria do `package-lock.json` com `npm audit`

## 1. Resumo executivo

Foram identificados **9 achados**:

| Severidade | Quantidade |
|---|---:|
| Crítica | 0 |
| Alta | 4 |
| Média | 4 |
| Baixa | 0 |
| Informativa | 1 |

Os riscos prioritários estão no modelo de autorização. Uma identidade autenticada pelo Supabase que ainda não exista no banco local é criada automaticamente como `TECHNICIAN`. Esse papel possui acesso operacional amplo. O impacto aumenta porque as APIs de tickets validam a permissão genérica do papel, mas não o vínculo do usuário com o ticket, e porque técnicos podem consultar/exportar apontamentos de qualquer usuário.

O `npm audit` encontrou uma vulnerabilidade de severidade alta em `sharp` `0.35.0`, com correção disponível em `0.35.4`. A versão vulnerável é forçada por `overrides`, embora o próprio Next.js instalado declare `sharp ^0.34.3 || ^0.35.4`. Não foi demonstrado um caminho de entrada HEIF controlado pelo atacante, por isso a explorabilidade desse componente permanece pendente de validação.

Também foram confirmados risco de consumo irrestrito de recursos na exportação síncrona, ausência de limitação de requisições nas APIs próprias e lacunas de defesa em profundidade para upload e cabeçalhos HTTP.

### Controles positivos observados

- 53 Route Handlers foram inventariados: 48 exigem `requirePermission`, 4 usam Bearer token e apenas o health check é público.
- Queries Prisma são parametrizadas; o único `$queryRaw` encontrado usa tagged template estático.
- Não foram encontrados `eval`, execução de shell, `dangerouslySetInnerHTML` ou concatenação de SQL.
- Erros inesperados retornam mensagem genérica; detalhes ficam no log do servidor.
- Upload usa nome de armazenamento gerado no servidor, limite de 10 MB, allowlist de MIME, verificação básica de assinatura e download com `Content-Disposition: attachment` e `nosniff`.
- O container de produção executa com usuário não root e publica a porta apenas em `127.0.0.1` no Compose de referência.
- A migration de Supabase revoga acesso do papel `anon`, habilita RLS e limita `authenticated` ao próprio perfil em `UserRef` pela Data API.
- Operações críticas usam validação Zod, idempotência, transações e controle otimista de versão em vários fluxos.
- A exportação XLSX neutraliza células iniciadas por `=`, `+`, `-` ou `@`.
- A busca por secrets no conteúdo versionado encontrou placeholders, não credenciais reais confirmadas. URL e publishable key do Supabase aparecem nos bundles de frontend, o que é esperado para variáveis `NEXT_PUBLIC_*`; nenhuma `service_role` foi encontrada.

### Limitações da auditoria

- Nenhum sistema externo ou ambiente de produção foi testado.
- A configuração efetiva do projeto Supabase — especialmente autocadastro, confirmação de e-mail, MFA, expiração de sessão e rate limits — não está no repositório.
- `node_modules` não está instalado. A documentação exigida em `node_modules/next/dist/docs/` não estava disponível; nenhum código da aplicação foi alterado. Os bundles de release contêm o runtime do Next.js, mas não a documentação local.
- Semgrep, Gitleaks, TruffleHog e OSV-Scanner não estavam instalados. A análise equivalente possível foi feita por buscas estruturadas, revisão do histórico por nomes de arquivos e `npm audit` ao vivo.
- Não há pipeline CI/CD versionado para auditar. Os arquivos de Nginx e Compose são exemplos; controles aplicados por uma camada externa precisam ser validados no ambiente.
- A explorabilidade da advisory de `sharp` e o estado de autocadastro do Supabase exigem validação controlada em homologação.

## 2. Arquitetura analisada

### Stack e componentes

- **Frontend/backend:** Next.js `15.5.25`, React `19.2.4`, TypeScript e App Router/Route Handlers.
- **Autenticação:** Supabase Auth em produção; modo HMAC por cabeçalhos para integração com Gestec; identidade local somente para desenvolvimento explicitamente habilitado.
- **Sessão:** cookies gerenciados por `@supabase/ssr`, ou cabeçalhos `x-gestec-*` assinados com HMAC e janela de cinco minutos.
- **Autorização:** RBAC local com `ADMIN`, `MANAGER`, `TECHNICIAN` e `AUDITOR`, mapeados para permissões como `tickets:view`, `tickets:work` e `reports:export`.
- **Banco:** PostgreSQL/Supabase via Prisma `6.12.0`.
- **Arquivos:** anexos em filesystem local sob `ATTACHMENT_ROOT`, com metadados no PostgreSQL.
- **Integrações:** APIs inbound do Zeev com Bearer token; callbacks outbound via API Zeev ou URL configurada; outbox persistente e `pg-boss`.
- **Infraestrutura:** Docker multi-stage, processo não root, Docker Compose e Nginx de referência.
- **Logging/auditoria:** `AuditEvent`, `TicketHistory`, logs de erro no servidor e histórico de `SyncExecution`.
- **CI/CD:** não encontrado no repositório.
- **Cache:** apenas caches em memória/processo para sessão sincronizada; nenhum Redis.

### Fluxos principais

```text
Navegador
  ↓ cookie Supabase
Middleware de refresh de sessão
  ↓
Server Component / Route Handler
  ↓ requirePermission(papel)
Prisma / domínio
  ↓
PostgreSQL, filesystem de anexos e/ou Zeev
```

```text
Zeev
  ↓ Authorization: Bearer ZEEV_INBOUND_TOKEN
Route Handler de integração
  ↓ Zod + idempotência
PostgreSQL / outbox
  ↓ pg-boss
API Zeev ou callback configurado
```

### Superfícies de ataque

- `/login`, recuperação de senha e `/auth/confirm`;
- 53 Route Handlers HTTP;
- IDs de tickets, usuários, anexos, apontamentos, projetos e execuções;
- upload e download de anexos;
- filtros e exportações de relatórios;
- callbacks e tokens Zeev;
- cabeçalhos HMAC do modo integrado;
- variáveis de ambiente, bundles de release e configuração Docker/Nginx;
- banco PostgreSQL, Data API Supabase e filesystem persistente.

## 3. Threat Model

### Ativos críticos

- contas, sessões e papéis de usuários;
- tickets, comentários internos, histórico e dados dos solicitantes;
- anexos corporativos;
- apontamentos, descrições de trabalho, projetos e centros de custo;
- tokens de integração e credenciais de banco;
- payloads e respostas do Zeev;
- trilhas de auditoria;
- disponibilidade do processo Next.js, banco e volume de anexos.

### Atacantes considerados

- usuário não autenticado;
- identidade Supabase autenticada, mas não aprovisionada no Help Desk;
- técnico autenticado curioso ou malicioso;
- usuário tentando elevar privilégios ou acessar outro recurso por ID;
- conta ou token Zeev comprometido;
- atacante que obtém uma sessão válida;
- fornecedor/dependência comprometida.

### Trust boundaries

1. Navegador → Supabase Auth.
2. Cookie/claims Supabase → sincronização com `UserRef` e papel local.
3. Request autenticado → verificação de permissão e escopo do recurso.
4. Formulário/upload → memória do processo, filesystem e banco.
5. Zeev → endpoints Bearer e schemas de entrada.
6. Outbox/banco → chamadas HTTPS externas.
7. Container → PostgreSQL/Supabase e volume persistente.
8. Lockfile/build → código de dependências executado em build e runtime.

### STRIDE resumido

| Ameaça | Cenário relevante | Controle atual | Lacuna principal |
|---|---|---|---|
| Spoofing | identidade Supabase não aprovisionada | validação de claims | criação automática como técnico |
| Tampering | alteração de ticket/apontamento | RBAC, Zod, versão e auditoria | escopo por recurso incompleto |
| Repudiation | negação de ação administrativa | `AuditEvent` e histórico | retenção e imutabilidade operacional não formalizadas |
| Information disclosure | ticket/anexo/relatório de terceiro | permissão por papel | BOLA e exportação ampla |
| Denial of service | exportação ou uploads repetidos | alguns limites por item | ausência de cota/rate limit e exportação sem limite global |
| Elevation of privilege | identidade comum vira técnica | allowlist apenas para ADMIN | fallback privilegiado para `TECHNICIAN` |

## 4. Achados

### SEC-001 — Identidade Supabase não aprovisionada recebe papel técnico automaticamente

**Severidade:** Alta

**Status:** Provável

**Natureza:** Vulnerabilidade provável; a exploração externa depende de o autocadastro ou a criação não controlada de usuários estar habilitada no projeto Supabase.

**Categoria:** Autenticação, aprovisionamento e elevação de privilégio

**OWASP:** A01:2021 Broken Access Control; API5:2023 Broken Function Level Authorization

**CWE:** CWE-269 Improper Privilege Management; CWE-862 Missing Authorization

**Localização:**

```text
arquivo: lib/auth/session.ts
linha: 189-210 e 128-135
função/componente: getGestecSession / resolveLocalSession

arquivo: lib/auth/permissions.ts
linha: 52-62
função/componente: ROLE_PERMISSIONS.TECHNICIAN

arquivo: docs/publicacao-supabase-locaweb.md
linha: 66-71
função/componente: instrução de publicação
```

**Descrição**

No modo Supabase, a aplicação procura um `UserRef` por `authUserId` ou e-mail. Quando não encontra, usa `TECHNICIAN` como fallback e `resolveLocalSession` cria o registro local com `active: true`. A allowlist protege apenas o papel `ADMIN`; ela não restringe quem pode virar técnico.

O papel técnico pode ler todos os tickets, trabalhar em tickets, consultar ativos, relatórios, notificações e metas, além de exportar relatórios. A documentação de implantação orienta que todos os usuários fora da allowlist administrativa iniciem como técnicos, mas não documenta a desativação de signup público nem uma allowlist de usuários autorizados.

**Evidência**

```ts
role: isAdministrator
  ? UserRole.ADMIN
  : current?.role === UserRole.ADMIN
    ? UserRole.TECHNICIAN
    : (current?.role ?? UserRole.TECHNICIAN)
```

```ts
: tx.userRef.create({
    data: { ...identityData, active: true },
  });
```

**Fluxo vulnerável**

```text
identidade autenticada no Supabase sem UserRef aprovado
↓
fallback current?.role ?? TECHNICIAN
↓
criação automática de UserRef ativo
↓
acesso operacional amplo ao Help Desk
```

**Cenário de exploração**

Se signup por e-mail estiver habilitado, um atacante cria e confirma uma conta diretamente pelo endpoint público do Supabase usando a publishable key, autentica-se e acessa a aplicação. No primeiro request, a aplicação cria o usuário como técnico. Mesmo com signup desabilitado, uma identidade criada por engano, importada ou comprometida recebe acesso técnico sem aprovação local explícita.

**Impacto**

- **Confidencialidade:** leitura de tickets, anexos, comentários internos, diretório e relatórios.
- **Integridade:** comentários, anexos e operações de atendimento em tickets.
- **Disponibilidade:** capacidade de acionar operações caras e armazenar anexos.

**Probabilidade:** Alta se signup estiver habilitado; Média se somente administradores puderem criar identidades.

**Recomendação**

Adotar aprovisionamento fail-closed. Uma identidade Supabase somente deve entrar se já existir um `UserRef` ativo e vinculado ao `authUserId`/e-mail aprovado. O primeiro login pode concluir o vínculo, mas não deve criar usuário ativo nem atribuir papel. Desabilitar signup público no Supabase, limitar provedores/domínios conforme a política e testar uma conta não aprovisionada antes do go-live.

**Exemplo de correção**

```ts
const current = await prisma.userRef.findFirst({
  where: { OR: [{ authUserId: subject }, { email: email.toLowerCase() }] },
});

if (!current?.active) {
  throw new ApiError(403, "USER_NOT_PROVISIONED", "Acesso não autorizado.");
}

// Vincular authUserId somente após validar que o cadastro aprovado é único.
```

---

### SEC-002 — Tickets, anexos e payloads de integração não aplicam autorização por objeto

**Severidade:** Alta

**Status:** Confirmada

**Natureza:** Vulnerabilidade confirmada em relação ao contrato de visibilidade documentado.

**Categoria:** BOLA/IDOR e exposição excessiva de dados

**OWASP:** A01:2021 Broken Access Control; API1:2023 Broken Object Level Authorization; API3:2023 Broken Object Property Level Authorization

**CWE:** CWE-639 Authorization Bypass Through User-Controlled Key; CWE-200 Exposure of Sensitive Information

**Localização:**

```text
arquivo: app/api/v1/gestec-help-desk/tickets/route.ts
linha: 9-35
função/componente: GET

arquivo: app/api/v1/gestec-help-desk/tickets/[id]/route.ts
linha: 13-26
função/componente: GET

arquivo: app/api/v1/gestec-help-desk/tickets/[id]/attachments/[attachmentId]/route.ts
linha: 11-30
função/componente: GET

arquivo: lib/domain/tickets.ts
linha: 44-125
função/componente: ticketInclude

arquivo: specs/help-desk/05-ciclo-de-vida-e-colaboracao.md
linha: 21-45
função/componente: contrato de acesso a ticket
```

**Descrição**

Os endpoints exigem apenas `tickets:view`. A listagem não recebe a sessão no filtro e retorna todos os tickets. O detalhe usa `findUnique({ where: { id } })`, e o download valida apenas que o anexo pertence ao `ticketId` informado, sem confirmar que o usuário pode ver aquele ticket.

O `ticketInclude` retorna comentários internos, histórico, participantes, anexos e até `SyncExecution.payload`/`lastError`. A especificação exige que solicitantes vejam apenas tickets próprios/participados, que técnicos respeitem seu escopo e que dados internos sejam filtrados campo a campo. Não existe um predicado central de acesso ao objeto nem um papel de solicitante na implementação atual.

**Evidência**

```ts
await requirePermission("tickets:view");
const ticket = await prisma.ticket.findUnique({
  where: { id },
  include: ticketInclude,
});
```

```ts
syncExecutions: {
  select: { payload: true, lastError: true, /* ... */ },
}
```

**Fluxo vulnerável**

```text
usuário autenticado com tickets:view
↓ altera UUID/consulta lista global
GET /tickets/{outro-ticket}
↓ sem filtro por solicitante, participante ou escopo técnico
ticket completo / payloads / metadados / anexos
```

**Cenário de exploração**

Um usuário obtém o UUID de um ticket por uma listagem, link compartilhado, histórico do navegador ou resposta anterior e solicita diretamente o detalhe ou um anexo. A API verifica o papel, mas não o vínculo com o ticket, retornando dados internos de outro solicitante. O UUID reduz enumeração aleatória, mas não substitui autorização.

**Impacto**

- **Confidencialidade:** exposição de tickets, PII, comentários internos, anexos e payloads Zeev.
- **Integridade:** os mesmos padrões amplos aparecem em várias mutações `tickets:work`, permitindo agir fora do escopo esperado.
- **Disponibilidade:** impacto indireto por operações indevidas em tickets alheios.

**Probabilidade:** Alta para usuário autenticado.

**Recomendação**

Criar uma política server-side única que produza o filtro Prisma autorizado por usuário/papel/escopo. Aplicá-la em toda leitura e mutação, inclusive anexos. Retornar 404 para objetos fora do escopo. Serializar campos conforme audiência: solicitante não recebe nota interna, auditoria operacional ou payload bruto de integração.

**Exemplo de correção**

```ts
const ticket = await prisma.ticket.findFirst({
  where: {
    id,
    AND: [ticketVisibilityWhere(session)],
  },
  include: ticketIncludeFor(session),
});

if (!ticket) {
  throw new ApiError(404, "TICKET_NOT_FOUND", "Ticket não encontrado.");
}
```

---

### SEC-003 — Técnicos podem consultar e exportar apontamentos globais

**Severidade:** Alta

**Status:** Provável

**Natureza:** Vulnerabilidade provável; o comportamento é confirmado, mas a matriz final de audiência dos relatórios ainda está marcada como proposta na documentação.

**Categoria:** Broken Function Level Authorization e exposição de dados corporativos

**OWASP:** A01:2021 Broken Access Control; API5:2023 Broken Function Level Authorization

**CWE:** CWE-862 Missing Authorization; CWE-200 Exposure of Sensitive Information

**Localização:**

```text
arquivo: lib/auth/permissions.ts
linha: 52-62
função/componente: permissões de TECHNICIAN

arquivo: app/api/v1/gestec-help-desk/reports/time-entries.xlsx/route.ts
linha: 23-37 e 137-154
função/componente: GET

arquivo: lib/domain/report-query.ts
linha: 65-86
função/componente: reportFilters

arquivo: app/gestec_help_desk/relatorios/page.tsx
linha: 46-82 e 121-156
função/componente: ReportsPage
```

**Descrição**

`TECHNICIAN` e `AUDITOR` recebem `reports:view` e `reports:export`. A API aceita `userId` escolhido pelo cliente e, quando o filtro é omitido, consulta todos os apontamentos. A página também aceita `userId=all`. O XLSX inclui descrição, horários, projeto/centro de custo, ticket, pessoa, faturável e origem.

Não há autorização por equipe, projeto, centro de custo ou usuário-alvo. As specs de relatórios indicam Gestor, Analista, Financeiro e Administrador/Auditor autorizado como audiências, além de requerer escopo por tipo.

**Evidência**

```ts
TECHNICIAN: new Set([
  // ...
  "reports:view",
  "reports:export",
])
```

```ts
const userId = searchParams.get("userId")?.trim();
// ...
...(userId ? { userId } : {}),
```

**Fluxo vulnerável**

```text
técnico autenticado
↓ define userId de terceiro ou remove o filtro
GET /reports/time-entries.xlsx
↓ apenas reports:export, sem escopo do usuário-alvo
exportação de apontamentos corporativos globais
```

**Cenário de exploração**

Um técnico acessa diretamente a rota de exportação sem `userId` ou informa o UUID de outro colaborador. A API gera um arquivo com apontamentos e descrições de trabalho de pessoas fora de sua responsabilidade.

**Impacto**

- **Confidencialidade:** vazamento de atividade, horários, e-mails, projetos, centros de custo e tickets.
- **Integridade:** não há alteração de dados nessa rota.
- **Disponibilidade:** a exportação global também amplifica o SEC-005.

**Probabilidade:** Alta para conta técnica; a classificação como acesso indevido depende da matriz de negócio final.

**Recomendação**

Separar relatório individual de relatório gerencial. Para usuários comuns, ignorar `userId` do cliente e forçar `session.userId`. Exigir permissão específica e escopo server-side para consultas de equipe/globais. Aplicar a mesma função de política na página, endpoint de resumo e exportação.

**Exemplo de correção**

```ts
const canViewTeam = hasPermission(session.role, "time:manage");
const effectiveUserId = canViewTeam
  ? validatedRequestedUserId
  : session.userId;

const where = {
  ...baseWhere,
  ...(effectiveUserId ? { userId: effectiveUserId } : {}),
};
```

---

### SEC-004 — `sharp` vulnerável é forçado abaixo da versão aceita pelo Next.js

**Severidade:** Alta

**Status:** Necessita validação

**Natureza:** Vulnerabilidade confirmada na composição de dependências; caminho explorável na aplicação não demonstrado.

**Categoria:** Componente vulnerável / supply chain

**OWASP:** A06:2021 Vulnerable and Outdated Components

**CWE:** CWE-122 Heap-based Buffer Overflow; CWE-1395 Dependency on Vulnerable Third-Party Component

**Localização:**

```text
arquivo: package.json
linha: 78-82
função/componente: overrides.sharp

arquivo: package-lock.json
linha: 9774-9801 e 11819-11820
função/componente: resolução de next/sharp
```

**Descrição**

O `npm audit --json` reportou `sharp <0.35.4` como vulnerável à advisory `GHSA-rgj7-g3m4-5g8c` — vulnerabilidades em `libheif`, severidade alta, CWE-122 — e informou correção disponível. O lockfile instala `sharp 0.35.0` porque o `overrides` fixa essa versão. O Next.js `15.5.25` declara `sharp ^0.34.3 || ^0.35.4`, portanto o override elimina explicitamente a faixa corrigida.

Não há import de `next/image`, `sharp` ou upload HEIF no código da aplicação. Ainda assim, o pacote vulnerável entra no runtime/bundle e deve ser removido antes do release.

**Evidência**

```json
"overrides": {
  "sharp": "0.35.0"
}
```

Resultado resumido do scanner:

```text
sharp < 0.35.4
GHSA-rgj7-g3m4-5g8c
severity: high
fixAvailable: true
```

**Fluxo vulnerável**

```text
arquivo HEIF controlado pelo atacante
↓ processamento por sharp/libheif
corrupção de memória
↓
crash ou impacto nativo no processo
```

O primeiro passo não foi identificado no código atual.

**Cenário de exploração**

Se a otimização de imagens do Next.js ou outra funcionalidade passar a processar HEIF controlado pelo usuário, um arquivo malformado pode atingir a biblioteca vulnerável. Sem esse sink, o alerta permanece não alcançável na revisão atual.

**Impacto**

- **Confidencialidade:** dependente do comportamento da corrupção de memória.
- **Integridade:** potencial comprometimento do processo nativo.
- **Disponibilidade:** crash do processo servidor.

**Probabilidade:** Baixa no código atual; aumenta imediatamente se houver processamento de HEIF/imagem não confiável.

**Recomendação**

Atualizar o override para `0.35.4` ou versão posterior compatível, executar instalação imutável, `npm audit`, testes e build. Não usar `npm audit fix --force`. Verificar o motivo histórico do override antes de removê-lo.

**Exemplo de correção**

```json
"overrides": {
  "sharp": "0.35.4"
}
```

---

### SEC-005 — Exportações e consultas de relatório não possuem limite global de volume

**Severidade:** Média

**Status:** Confirmada

**Natureza:** Vulnerabilidade confirmada de consumo irrestrito de recursos.

**Categoria:** Denial of Service / Unrestricted Resource Consumption

**OWASP:** A04:2021 Insecure Design; API4:2023 Unrestricted Resource Consumption

**CWE:** CWE-400 Uncontrolled Resource Consumption

**Localização:**

```text
arquivo: lib/domain/report-query.ts
linha: 10-32 e 79-105
função/componente: reportFilters

arquivo: app/api/v1/gestec-help-desk/reports/time-entries.xlsx/route.ts
linha: 23-37 e 102-163
função/componente: GET

arquivo: app/api/v1/gestec-help-desk/reports/summary/route.ts
linha: 6-30
função/componente: GET
```

**Descrição**

O período aceita qualquer data válida, sem duração máxima. A exportação consulta todos os registros correspondentes sem `take`, materializa relações, cria todas as linhas do workbook em memória e chama `writeBuffer()`. O resumo também carrega todos os apontamentos do período para agregação em JavaScript.

Isso permite que uma única conta com permissão solicite repetidamente todo o histórico. O custo cresce com o volume do banco e pode consumir memória, CPU e conexões até indisponibilizar o processo.

**Evidência**

```ts
const entries = await prisma.timeEntry.findMany({
  where,
  include: {
    user: { select: { name: true, email: true } },
    // ticket, costCenter e manualProject
  },
});

const buffer = await workbook.xlsx.writeBuffer();
```

**Fluxo vulnerável**

```text
from muito antigo + to muito futuro
↓
query sem limite/paginação
↓
todos os registros e workbook em memória
↓
exaustão de CPU/memória/conexões
```

**Cenário de exploração**

Um usuário autenticado repete exportações globais com intervalo de vários anos. Cada request consulta e serializa o conjunto integral em memória, concorrendo com requests normais.

**Impacto**

- **Confidencialidade:** amplifica o volume exposto por SEC-003.
- **Integridade:** sem impacto direto.
- **Disponibilidade:** degradação severa ou encerramento do processo por falta de memória.

**Probabilidade:** Média, crescente com o volume de dados.

**Recomendação**

Limitar período e quantidade de linhas, impor timeout e rejeitar/encaminhar exportações grandes para job assíncrono com cota. Agregar no PostgreSQL em vez de carregar todas as linhas no resumo. Registrar métricas de duração, linhas e memória.

**Exemplo de correção**

```ts
const MAX_RANGE_DAYS = 93;
const MAX_EXPORT_ROWS = 50_000;

if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * 86_400_000) {
  throw new ApiError(422, "PERIOD_TOO_LARGE", "Reduza o período.");
}

const count = await prisma.timeEntry.count({ where });
if (count > MAX_EXPORT_ROWS) {
  throw new ApiError(413, "EXPORT_TOO_LARGE", "Use a exportação assíncrona.");
}
```

---

### SEC-006 — Upload aceita documentos ativos sem antivírus ou quarentena

**Severidade:** Média

**Status:** Provável

**Natureza:** Vulnerabilidade provável de distribuição de conteúdo malicioso; o download forçado reduz, mas não elimina, o risco.

**Categoria:** Upload de arquivo perigoso

**OWASP:** A04:2021 Insecure Design; A08:2021 Software and Data Integrity Failures

**CWE:** CWE-434 Unrestricted Upload of File with Dangerous Type

**Localização:**

```text
arquivo: lib/domain/attachments.ts
linha: 9-59 e 69-150
função/componente: ALLOWED_TYPES / validateFileContent / saveTicketAttachment

arquivo: docs/lacunas-e-ambiguidades.md
linha: 27
função/componente: GAP-017
```

**Descrição**

PDF, DOCX, XLSX e imagens são aceitos. A verificação confirma apenas assinatura básica; para OOXML, procura strings como `[Content_Types].xml` e `xl/`/`word/` no buffer. Não existe antivírus, sandbox, Content Disarm and Reconstruction, estado de quarentena ou limite de quantidade/cota por usuário/ticket.

Arquivos válidos nesses formatos ainda podem conter conteúdo malicioso, links externos, exploits de leitor ou engenharia social. A própria documentação marca antivírus e retenção de anexos como indefinidos.

**Evidência**

```ts
const validOfficeDocument =
  hasPrefix(bytes, [0x50, 0x4b, 0x03, 0x04]) &&
  zipDirectory.includes("[Content_Types].xml") &&
  (zipDirectory.includes("xl/") || zipDirectory.includes("word/"));
```

**Fluxo vulnerável**

```text
usuário com tickets:work envia PDF/DOCX/XLSX malicioso válido
↓ allowlist e assinatura superficial aprovam
filesystem e metadados persistem o arquivo
↓ colega autorizado baixa e abre
comprometimento do endpoint do usuário / phishing
```

**Cenário de exploração**

Uma conta comprometida anexa um PDF ou documento Office preparado para explorar o leitor ou induzir o usuário a habilitar conteúdo/fornecer credenciais. O arquivo é distribuído dentro de um contexto corporativo confiável.

**Impacto**

- **Confidencialidade:** roubo de credenciais ou dados no endpoint da vítima.
- **Integridade:** comprometimento do endpoint ou documentos corporativos.
- **Disponibilidade:** malware/ransomware no endpoint; consumo do volume por uploads repetidos.

**Probabilidade:** Média.

**Recomendação**

Persistir novos arquivos em quarentena, executar scanner corporativo antes de disponibilizar o download, bloquear arquivos infectados/inconclusivos, registrar hash/veredito/engine e definir cota, retenção e política de reanálise. Manter download forçado e nome gerado no servidor.

**Exemplo de correção**

```ts
const verdict = await malwareScanner.scan(bytes);
if (verdict !== "clean") {
  throw new ApiError(422, "FILE_REJECTED", "O arquivo não foi aprovado.");
}

// Só após o veredito: mover da quarentena para o storage disponível.
```

---

### SEC-007 — Cabeçalhos de segurança e HTTPS não são impostos pela configuração versionada

**Severidade:** Média

**Status:** Necessita validação

**Natureza:** Risco arquitetural e recomendação de hardening; um proxy/WAF externo pode aplicar os controles fora do repositório.

**Categoria:** Security Misconfiguration

**OWASP:** A05:2021 Security Misconfiguration

**CWE:** CWE-693 Protection Mechanism Failure; CWE-1021 Improper Restriction of Rendered UI Layers

**Localização:**

```text
arquivo: next.config.ts
linha: 4-37
função/componente: nextConfig

arquivo: deploy/nginx/helpdesk.conf.example
linha: 1-15
função/componente: server
```

**Descrição**

Não há configuração versionada de Content-Security-Policy, `frame-ancestors`, HSTS, Referrer-Policy ou Permissions-Policy. O Nginx de referência escuta apenas HTTP e não redireciona para HTTPS. A documentação manda habilitar HTTPS antes da exposição, mas a configuração que efetivamente o garante não está no repositório.

Sem esses controles, a aplicação pode ser enquadrada para clickjacking, perde mitigação adicional contra XSS e pode aceitar transporte sem TLS se o operador publicar diretamente o exemplo.

**Evidência**

```nginx
server {
    listen 80;
    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

**Fluxo vulnerável**

```text
configuração de exemplo publicada sem camada adicional
↓
HTTP e respostas sem CSP/frame-ancestors/HSTS
↓
interceptação de sessão ou clickjacking/maior impacto de XSS
```

**Cenário de exploração**

Se não existir terminação TLS externa, um atacante na rede intercepta cookies e conteúdo. Mesmo com TLS externo, a ausência de `frame-ancestors` permite tentar embutir telas autenticadas em iframe e induzir cliques em ações sensíveis.

**Impacto**

- **Confidencialidade:** possível interceptação sem TLS; maior impacto de injeção futura.
- **Integridade:** clickjacking ou alteração de tráfego sem TLS.
- **Disponibilidade:** impacto limitado.

**Probabilidade:** Média sem proxy externo; Baixa se todos os controles já forem aplicados no edge.

**Recomendação**

Documentar e versionar o ponto de terminação TLS, redirecionar HTTP para HTTPS e aplicar cabeçalhos em todas as respostas. Começar CSP em modo report-only, inventariar fontes e então impor. Confirmar os detalhes na documentação local do Next.js `15.5.25` após instalar as dependências, antes de implementar no framework.

**Exemplo de correção**

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'" always;
```

O CSP final deve incluir explicitamente os endpoints Supabase necessários; não copiar este exemplo para produção sem testar login, assets e callbacks.

---

### SEC-008 — APIs próprias não possuem rate limiting ou cotas compartilhadas

**Severidade:** Média

**Status:** Confirmada

**Natureza:** Vulnerabilidade confirmada de proteção insuficiente contra abuso autenticado ou com token comprometido.

**Categoria:** Unrestricted Resource Consumption / falta de defesa contra brute force de token

**OWASP:** API4:2023 Unrestricted Resource Consumption; API8:2023 Security Misconfiguration

**CWE:** CWE-770 Allocation of Resources Without Limits or Throttling; CWE-307 Improper Restriction of Excessive Authentication Attempts

**Localização:**

```text
arquivo: app/api/v1/gestec-help-desk/tickets/[id]/attachments/route.ts
linha: 5-37
função/componente: POST

arquivo: app/api/v1/gestec-help-desk/integrations/zeev/tickets/route.ts
linha: 9-18
função/componente: POST

arquivo: deploy/nginx/helpdesk.conf.example
linha: 1-15
função/componente: server/location
```

**Descrição**

Não há limiter no código nem `limit_req` no Nginx versionado. O limite de 10 MB é por arquivo, não por usuário, ticket, IP, token ou janela temporal. Os endpoints Zeev fazem comparação segura de token, mas cada tentativa ainda chega à aplicação; um token comprometido permite disparar validação, transações e crescimento do banco repetidamente.

Rate limits do Supabase Auth, se configurados, não cobrem as APIs próprias do Help Desk.

**Evidência**

```text
busca por rate limit/throttle/limit_req: nenhum controle encontrado
upload: MAX_BYTES por arquivo, sem cota cumulativa
Nginx: somente client_max_body_size e proxy_pass
```

**Fluxo vulnerável**

```text
sessão ou Bearer token válido/comprometido
↓ requests concorrentes repetidos
upload, validação, banco e filesystem sem throttle
↓
consumo de CPU, conexões, armazenamento e fila
```

**Cenário de exploração**

Uma conta técnica comprometida envia milhares de anexos válidos de 10 MB para tickets distintos/chaves distintas, enchendo o volume. Um token Zeev comprometido pode gerar alto volume de eventos únicos e pressão no banco/outbox.

**Impacto**

- **Confidencialidade:** sem impacto direto.
- **Integridade:** crescimento indevido de registros e arquivos.
- **Disponibilidade:** exaustão de storage, conexões e CPU.

**Probabilidade:** Média.

**Recomendação**

Aplicar limites por IP e endpoint no edge e cotas por identidade/token no backend. Usar armazenamento compartilhado para contadores quando houver mais de uma instância. Definir limites específicos para upload, integrações, exportações e mutações em lote; retornar `429` com `Retry-After`.

**Exemplo de correção**

```nginx
limit_req_zone $binary_remote_addr zone=gestec_api:10m rate=10r/s;

location /api/ {
    limit_req zone=gestec_api burst=20 nodelay;
    proxy_pass http://127.0.0.1:3000;
}
```

O limite por IP é apenas a primeira camada; upload e integração também precisam de cota por `userId`/token.

---

### SEC-009 — Retenção e descarte de PII, anexos e payloads não estão definidos

**Severidade:** Informativa

**Status:** Confirmada

**Natureza:** Risco arquitetural de privacidade e governança, sem exploração direta demonstrada.

**Categoria:** Privacidade, minimização e ciclo de vida de dados

**OWASP:** ASVS V8 Data Protection; Privacy by Design

**CWE:** CWE-359 Exposure of Private Personal Information

**Localização:**

```text
arquivo: prisma/schema.prisma
linha: 301-585
função/componente: Ticket, TicketComment, TicketAttachment, SyncExecution, AuditEvent

arquivo: docs/modelo-de-dominio.md
linha: 219-221
função/componente: pendências de retenção/LGPD/purge

arquivo: docs/lacunas-e-ambiguidades.md
linha: 27 e 60
função/componente: retenção de anexos e auditoria
```

**Descrição**

Tickets, nomes/e-mails, comentários, anexos, payloads/respostas de integração e snapshots de auditoria não possuem TTL, política de purge ou fluxo verificável de exportação/correção/exclusão de dados pessoais. Apenas filas `pg-boss` têm retenção explícita. Anexo removido recebe `deletedAt` e o arquivo é apagado, mas não há política global nem tratamento documentado de backup.

**Evidência**

```text
Modelo de domínio: "Retenção, LGPD e purge" permanece como pendência.
GAP-017: quantidade, retenção e antivírus de anexos = TO_DEFINE.
GAP-029: retenção/imutabilidade/acesso da auditoria indefinidos.
```

**Fluxo vulnerável**

```text
coleta operacional de PII e documentos
↓ persistência sem prazo/finalidade automatizada
backups, payloads, logs e storage crescem indefinidamente
↓
maior impacto de incidente e dificuldade de atender direitos do titular
```

**Cenário de exploração**

Não há exploração direta necessária: em caso de vazamento, dados antigos sem necessidade operacional continuam expostos; em uma solicitação LGPD, não existe mecanismo demonstrável que encontre e trate todas as cópias.

**Impacto**

- **Confidencialidade:** aumenta o volume histórico sujeito a vazamento.
- **Integridade:** risco de cópias divergentes em purge/correção manual.
- **Disponibilidade:** crescimento contínuo de banco, backups e storage.

**Probabilidade:** Alta como risco de governança; impacto de segurança depende de incidente futuro.

**Recomendação**

Classificar dados, documentar finalidade e base legal, definir retenção por entidade, implementar purge/anonimização auditável e cobrir backups, anexos, filas e payloads de integração. Criar testes de exportação/correção/exclusão e legal hold.

**Exemplo de correção**

```text
Política por entidade:
- SyncExecution.payload/response: retenção operacional definida e redação de campos sensíveis;
- anexos: retenção por status do ticket + legal hold;
- AuditEvent: retenção compatível com finalidade e acesso restrito;
- backups: expiração e restauração que reaplica pedidos de exclusão.
```

## 5. Matriz de priorização

| ID | Vulnerabilidade | Severidade | Probabilidade | Status | Componente | Prioridade |
|---|---|---|---|---|---|---|
| SEC-001 | Autoaprovisionamento Supabase como técnico | Alta | Alta/Média conforme signup | Provável | Auth/RBAC | P0 |
| SEC-002 | Ausência de autorização por objeto em tickets/anexos | Alta | Alta | Confirmada | APIs de tickets | P0 |
| SEC-003 | Exportação global disponível a técnicos | Alta | Alta para conta técnica | Provável | Relatórios/RBAC | P0 |
| SEC-004 | `sharp 0.35.0` vulnerável | Alta | Baixa no sink atual | Necessita validação | Dependências | P0 |
| SEC-005 | Relatório síncrono sem limite global | Média | Média | Confirmada | Relatórios | P1 |
| SEC-006 | Upload sem antivírus/quarentena | Média | Média | Provável | Anexos | P1 |
| SEC-007 | Headers/TLS não impostos no repositório | Média | Média/Baixa conforme edge | Necessita validação | Next/Nginx | P1 |
| SEC-008 | APIs sem rate limiting/cotas | Média | Média | Confirmada | APIs/Nginx | P1 |
| SEC-009 | Retenção e purge não definidos | Informativa | Alta como governança | Confirmada | Dados/Storage | P2 |

## 6. Plano de correção

### P0 — Corrigir imediatamente

1. **SEC-001 — Tornar o aprovisionamento fail-closed.** Bloquear qualquer identidade Supabase não cadastrada e ativa; validar signup no painel Supabase.  
   **Complexidade:** Média
2. **SEC-002 — Implementar autorização por objeto.** Centralizar filtros de visibilidade e aplicá-los a detalhe, anexos e mutações.  
   **Complexidade:** Alta
3. **SEC-003 — Restringir relatórios globais.** Forçar escopo individual para papel comum e criar permissões gerenciais explícitas.  
   **Complexidade:** Média
4. **SEC-004 — Atualizar `sharp`.** Subir para `0.35.4+`, regenerar lockfile de forma controlada, testar e auditar.  
   **Complexidade:** Baixa

### P1 — Próxima Sprint

1. **SEC-005 — Limitar/assíncronizar relatórios grandes.**  
   **Complexidade:** Média
2. **SEC-006 — Adicionar quarentena, scanner e cotas de anexos.**  
   **Complexidade:** Alta
3. **SEC-007 — Versionar TLS e security headers.**  
   **Complexidade:** Média
4. **SEC-008 — Aplicar rate limiting no edge e por identidade.**  
   **Complexidade:** Média

### P2 — Hardening / melhoria contínua

1. **SEC-009 — Implementar retenção, purge e direitos do titular.**  
   **Complexidade:** Alta
2. Adicionar CI com `npm ci`, `npm audit`, secret scanning, SAST e teste de autorização negativa.  
   **Complexidade:** Média
3. Remover bundles de release do Git ou publicar artefatos assinados em repositório próprio, com SBOM e proveniência.  
   **Complexidade:** Média
4. Validar configurações Supabase: signup, confirmação de e-mail, MFA para administradores, expiração/revogação, cookies e rate limits.  
   **Complexidade:** Média

## 7. Backlog de segurança

### SEC-001

**Título:** Exigir aprovisionamento prévio para login Supabase  
**Prioridade:** P0  
**Problema:** identidade Supabase desconhecida é criada ativa como técnico.  
**Correção proposta:** rejeitar identidade sem `UserRef` ativo e vincular `authUserId` somente após aprovação. Desabilitar signup público.  
**Critério de aceite:** uma conta Supabase válida sem cadastro local recebe 403 e nenhum `UserRef` é criado; usuário aprovado mantém o papel cadastrado; testes cobrem e-mail conflitante e usuário inativo.  
**Arquivos/componentes envolvidos:** `lib/auth/session.ts`, configuração Supabase, testes de sessão.  
**Complexidade:** Média

### SEC-002

**Título:** Aplicar escopo por ticket a toda leitura e mutação  
**Prioridade:** P0  
**Problema:** `tickets:view/work` permite acesso por ID sem ownership/participação/escopo.  
**Correção proposta:** criar política central de visibilidade e serialização por audiência; usar `findFirst` com filtro autorizado.  
**Critério de aceite:** usuário sem vínculo recebe 404 em detalhe, download e mutações; solicitante não recebe conteúdo interno; técnico sem escopo global não acessa ticket fora do escopo; testes alteram IDs entre dois usuários.  
**Arquivos/componentes envolvidos:** rotas `tickets/**`, `lib/domain/tickets.ts`, `lib/domain/attachments.ts`, páginas de ticket.  
**Complexidade:** Alta

### SEC-003

**Título:** Restringir relatórios e exportações por papel e escopo  
**Prioridade:** P0  
**Problema:** técnico pode escolher outro `userId` ou exportar todos os apontamentos.  
**Correção proposta:** separar permissão individual/gerencial e construir `where` autorizado no servidor.  
**Critério de aceite:** usuário comum recebe somente seus dados, mesmo enviando `userId=all` ou UUID de terceiro; gestor autorizado vê somente sua equipe; exportação e tela usam a mesma política; tentativa negada é auditada.  
**Arquivos/componentes envolvidos:** `lib/auth/permissions.ts`, `lib/domain/report-query.ts`, página e APIs de relatórios.  
**Complexidade:** Média

### SEC-004

**Título:** Atualizar `sharp` para versão corrigida  
**Prioridade:** P0  
**Problema:** override fixa `sharp 0.35.0`, vulnerável à GHSA-rgj7-g3m4-5g8c.  
**Correção proposta:** atualizar para `0.35.4+`, revisar changelog, regenerar lockfile e validar build/runtime.  
**Critério de aceite:** `npm audit` não reporta GHSA-rgj7-g3m4-5g8c; lockfile não contém `sharp <0.35.4`; testes e build passam; processamento de imagens não confiáveis é testado ou explicitamente desabilitado.  
**Arquivos/componentes envolvidos:** `package.json`, `package-lock.json`, pipeline.  
**Complexidade:** Baixa

### SEC-005

**Título:** Impor limites de período e volume em relatórios  
**Prioridade:** P1  
**Problema:** exportação síncrona materializa volume ilimitado em memória.  
**Correção proposta:** limitar período/linhas, agregar no banco e enviar exportações grandes para fila.  
**Critério de aceite:** período/volume acima do limite é rejeitado ou vira job assíncrono; request síncrono tem timeout e limite documentados; teste de carga não excede orçamento de memória; métricas registram linhas e duração.  
**Arquivos/componentes envolvidos:** `report-query.ts`, rotas de summary/XLSX, fila e UI.  
**Complexidade:** Média

### SEC-006

**Título:** Implantar quarentena e verificação antimalware de anexos  
**Prioridade:** P1  
**Problema:** arquivos ativos ficam disponíveis após validação superficial de formato.  
**Correção proposta:** scanner corporativo, quarentena, veredito persistido, cotas e retenção.  
**Critério de aceite:** arquivo fica indisponível até veredito clean; EICAR é bloqueado em homologação; erro/inconclusivo falha fechado; hash e veredito são auditados; cota por usuário/ticket é aplicada.  
**Arquivos/componentes envolvidos:** `attachments.ts`, rotas de upload/download, schema/migration, storage e scanner.  
**Complexidade:** Alta

### SEC-007

**Título:** Impor HTTPS e security headers  
**Prioridade:** P1  
**Problema:** configuração versionada não garante TLS, CSP, anti-frame, HSTS e políticas de navegador.  
**Correção proposta:** versionar terminação TLS/redirecionamento e conjunto testado de cabeçalhos.  
**Critério de aceite:** HTTP redireciona para HTTPS; todas as respostas têm HSTS, `nosniff`, Referrer-Policy e `frame-ancestors`; CSP não quebra login/assets; teste automatizado verifica os headers.  
**Arquivos/componentes envolvidos:** Nginx/edge, `next.config.ts` conforme documentação local da versão, documentação de deploy.  
**Complexidade:** Média

### SEC-008

**Título:** Adicionar rate limiting e cotas nas APIs  
**Prioridade:** P1  
**Problema:** upload, integração e operações caras aceitam requests ilimitados.  
**Correção proposta:** limiter no edge e contador compartilhado por identidade/token; cotas de storage.  
**Critério de aceite:** excesso retorna 429 e `Retry-After`; limites são distintos por endpoint; duas instâncias compartilham contador; token Zeev e usuário têm chaves separadas; teste concorrente confirma o bloqueio.  
**Arquivos/componentes envolvidos:** Nginx/edge, middleware/serviço de limiter, rotas de upload e integração.  
**Complexidade:** Média

### SEC-009

**Título:** Definir retenção, purge e tratamento LGPD  
**Prioridade:** P2  
**Problema:** PII, anexos, auditoria e payloads persistem sem ciclo de vida verificável.  
**Correção proposta:** matriz de dados/finalidade/retenção, jobs de purge/anonimização, legal hold e cobertura de backups.  
**Critério de aceite:** cada entidade tem owner e prazo; purge de homologação remove/anonimiza banco, storage e índices; restauração de backup reaplica exclusões; exportação do titular localiza todas as categorias documentadas.  
**Arquivos/componentes envolvidos:** Prisma/migrations, jobs, storage, política de backup e documentação.  
**Complexidade:** Alta

## 8. Itens verificados sem achado explorável confirmado

- **SQL/NoSQL/command injection:** nenhuma entrada chegou a query raw insegura ou shell. Prisma e tagged templates são usados corretamente.
- **XSS:** React escapa conteúdo; nenhum `dangerouslySetInnerHTML`/`innerHTML` foi encontrado. A ausência de CSP permanece no SEC-007.
- **Path traversal:** nomes de storage são UUIDs gerados no servidor. `storageKey` vem do banco, não do request. Recomenda-se ainda validar containment caso o storage passe a receber chaves externas.
- **CORS:** nenhuma política `Access-Control-Allow-Origin: *` foi encontrada; o comportamento é same-origin por padrão.
- **Secrets:** apenas exemplos/placeholders foram encontrados. E-mails administrativos reais constam nos templates, o que é PII e deve ser revisado se o repositório for público, mas não é credencial.
- **Erros:** falhas inesperadas são redigidas na resposta; mensagens de integração são persistidas e expostas pelo detalhe, já abrangido pelo SEC-002.
- **Container:** processo não root e porta restrita ao loopback no Compose; não foram encontrados modo privileged, capabilities extras ou Docker socket.
- **CI/CD:** não existe configuração no repositório; portanto não houve action não pinada ou permissão excessiva a classificar, mas também não há gates automáticos de segurança.
- **CSRF:** não foi demonstrado bypass concreto. As APIs dependem de cookies Supabase e chamadas same-origin; confirmar `SameSite`, `Secure`, Origin/CSRF e comportamento efetivo dos cookies em homologação.
- **SSRF:** URLs outbound vêm de variáveis de ambiente, não de request direto. Se essas URLs passarem a ser administráveis pela aplicação, será necessário allowlist, bloqueio de redes privadas e redirects desabilitados.

## 9. Evidências de ferramentas

```text
npm audit --json
critical: 0
high: 1
moderate: 0
low: 0
pacote: sharp
faixa vulnerável: <0.35.4
fixAvailable: true
```

```text
Inventário de Route Handlers
total: 53
requirePermission: 48
Bearer token: 4
público: 1 (health check)
```

```text
Ferramentas locais não disponíveis
Semgrep
Gitleaks
TruffleHog
OSV-Scanner
```

Nenhuma correção foi aplicada ao código da aplicação durante esta etapa.
