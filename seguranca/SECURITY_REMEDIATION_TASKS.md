# Tasks de Remediação de Segurança — Gestec Help Desk

**Origem:** `SECURITY_AUDIT.md`  
**Data:** 2026-09-28  
**Objetivo:** sanar os achados `SEC-001` a `SEC-009` com entregas pequenas, verificáveis e ordenadas por dependência.  
**Estado inicial:** todas as tasks estão pendentes; este documento não autoriza mudanças em produção nem alterações externas no Supabase, DNS, proxy ou backups sem validação específica.

## 1. Estratégia de execução

### Ordem de prioridade

1. **P0 — contenção e controle de acesso:** `SEC-001`, `SEC-002`, `SEC-003`, `SEC-004`.
2. **P1 — disponibilidade e defesa em profundidade:** `SEC-005`, `SEC-006`, `SEC-007`, `SEC-008`.
3. **P2 — governança e segurança contínua:** `SEC-009`, CI, artefatos e reaudição.

### Regras de implementação

- Executar uma task por vez e manter o sistema testável ao final de cada task.
- Não alterar a matriz de papéis, a política de acesso do Supabase, o scanner de malware, a política de retenção ou a terminação TLS sem decisão humana registrada nas tasks que possuem gate.
- Antes de qualquer alteração em código Next.js, instalar/restaurar as dependências de forma controlada e ler integralmente a seção relevante em `node_modules/next/dist/docs/`, conforme `AGENTS.md`.
- Não usar `npm audit fix --force`.
- Não enviar secrets, payloads reais, anexos ou PII para scanners/serviços externos durante testes.
- Testes de segurança devem usar fixtures sintéticas em banco e storage de homologação.
- Uma task só pode ser marcada como concluída quando seus critérios de aceite e sua verificação estiverem completos.

### Definition of Done comum

- [ ] Critérios de aceite específicos atendidos.
- [ ] Testes focados adicionados e aprovados.
- [ ] `npm run typecheck` aprovado.
- [ ] `npm test` aprovado.
- [ ] `npm run build` aprovado para mudanças que afetam runtime/build.
- [ ] Nenhum secret, token, PII real ou arquivo de homologação foi versionado.
- [ ] Logs e respostas de erro não expõem detalhes sensíveis.
- [ ] Documentação operacional atualizada quando houver mudança de configuração.
- [ ] Evidência de validação anexada ao PR ou registro de mudança.

## 2. Mapa de dependências

```text
T01 Inventário e decisões externas
├── T02 Matriz de acesso
│   ├── T05 Aprovisionamento fail-closed
│   ├── T06 Política central de ticket
│   │   ├── T07 Leituras de ticket
│   │   ├── T08 Anexos
│   │   ├── T09 Mutações
│   │   └── T10 Redação de campos
│   └── T11 Política de relatórios
│       └── T12 Aplicar escopo de relatórios
│           └── T13 Limites de relatório
│               └── T14 Exportação assíncrona
├── T03 Baseline e docs locais do Next
│   ├── T04 Atualizar sharp
│   └── T19 Headers e HTTPS
├── T15 Rate limiting no edge
│   └── T16 Rate limiting/cotas por identidade
├── T17 Arquitetura de quarentena
│   └── T18 Scanner e liberação de anexos
└── T20 Política de retenção
    ├── T21 Purge de payloads/auditoria
    └── T22 Retenção de anexos e backups

T14 também depende da política de retenção definida em T20
T19 também depende das decisões externas de T01 e do edge definido em T15
T23 Gates de CI depende de T04, T05-T13, T15-T19 e T21-T22
T24 Higiene de artefatos depende de T03 e T23
T25 Reauditoria depende de todas as tasks anteriores aplicáveis
```

## 3. Fase 0 — Decisões e baseline

### T01 — Validar configuração efetiva do Supabase em homologação

**Prioridade:** P0  
**Achados:** SEC-001, SEC-007, SEC-008  
**Escopo estimado:** S  
**Gate humano:** alterações no projeto Supabase somente após aprovação explícita.

**Descrição:** levantar e registrar as configurações que não existem no repositório: criação de usuários, confirmação de e-mail, provedores, redirect URLs, duração/revogação de sessão, MFA, cookies e rate limits.

**Critérios de aceite:**

- [ ] O estado de signup/autocadastro está registrado com captura ou export de configuração sem secrets.
- [ ] Uma conta sintética não aprovisionada foi testada em homologação e o resultado atual foi documentado.
- [ ] Redirect URLs, domínio autorizado, confirmação de e-mail, MFA administrativo e limites de Auth possuem decisão explícita.

**Verificação:**

- [ ] Confirmar que nenhuma alteração foi feita em produção.
- [ ] Confirmar que evidências não contêm token, cookie ou publishable/service key além do necessário e permitido.
- [ ] Relacionar o resultado à decisão de T02 e à implementação de T05.

**Dependências:** Nenhuma.

**Arquivos/componentes prováveis:**

- `docs/publicacao-supabase-locaweb.md`
- painel/configuração Supabase de homologação

---

### T02 — Aprovar matriz de papéis, escopos e campos sensíveis

**Prioridade:** P0  
**Achados:** SEC-001, SEC-002, SEC-003  
**Escopo estimado:** M  
**Gate humano:** a matriz precisa de aprovação do responsável pelo produto/segurança antes de alterar RBAC.

**Descrição:** definir quem pode visualizar e alterar tickets, anexos, comentários internos, payloads Zeev, apontamentos e relatórios. Distinguir solicitante, técnico com escopo, gestor, auditor, financeiro e administrador.

**Critérios de aceite:**

- [ ] Cada ação possui papéis permitidos e escopo por objeto/equipe/empresa.
- [ ] Cada campo sensível possui audiência definida, incluindo `SyncExecution.payload`, `lastError`, comentários internos, e-mail e dados financeiros.
- [ ] O comportamento esperado para usuário Supabase ainda não aprovisionado é “negar acesso”.

**Verificação:**

- [ ] Revisar a matriz contra `specs/help-desk/05-ciclo-de-vida-e-colaboracao.md`.
- [ ] Revisar a matriz contra `specs/help-desk/17-central-de-relatorios.md`.
- [ ] Obter aprovação registrada antes de iniciar T05 ou T10.

**Dependências:** T01.

**Arquivos/componentes prováveis:**

- `docs/decisoes-tecnicas.md`
- `specs/help-desk/05-ciclo-de-vida-e-colaboracao.md`
- `specs/help-desk/17-central-de-relatorios.md`
- `lib/auth/permissions.ts`

---

### T03 — Restaurar baseline seguro e consultar documentação local do Next.js

**Prioridade:** P0  
**Achados:** suporte a SEC-004 e SEC-007  
**Escopo estimado:** S

**Descrição:** preparar o ambiente para mudanças sem executar scripts de dependência não revisados e consultar a documentação local exigida pelo repositório.

**Critérios de aceite:**

- [ ] Dependências restauradas a partir do lockfile sem atualização incidental.
- [ ] Scripts de instalação relevantes foram revisados antes de execução.
- [ ] Guias locais do Next.js `15.5.25` sobre Route Handlers, middleware/proxy, headers e configuração foram lidos e referenciados nas tasks afetadas.

**Verificação:**

- [ ] Executar instalação inicial com scripts bloqueados ou política equivalente fail-closed.
- [ ] Confirmar que `node_modules/next/dist/docs/` existe e registrar os arquivos consultados.
- [ ] Executar `npm run typecheck` e `npm test` para estabelecer o baseline.

**Dependências:** Nenhuma.

**Arquivos/componentes prováveis:**

- `package.json`
- `package-lock.json`
- `node_modules/next/dist/docs/` (somente leitura)

---

### T04 — Atualizar `sharp` para versão corrigida

**Prioridade:** P0  
**Achado:** SEC-004  
**Escopo estimado:** S

**Descrição:** remover o pin vulnerável `0.35.0`, adotar `0.35.4` ou versão posterior compatível e validar a cadeia de build.

**Critérios de aceite:**

- [ ] `package.json` não força `sharp <0.35.4`.
- [ ] `package-lock.json` não contém instalação ativa de `sharp <0.35.4`.
- [ ] GHSA-rgj7-g3m4-5g8c não aparece no `npm audit`.

**Verificação:**

- [ ] Executar `npm audit --json` e anexar o resumo.
- [ ] Executar `npm run typecheck`, `npm test` e `npm run build`.
- [ ] Confirmar que nenhuma atualização major/transitiva não relacionada entrou no lockfile.

**Dependências:** T03.

**Arquivos/componentes prováveis:**

- `package.json`
- `package-lock.json`

## Checkpoint A — Baseline e decisões P0

- [ ] T01 a T04 concluídas.
- [ ] Matriz de acesso aprovada.
- [ ] `npm audit` sem critical/high alcançável não mitigado.
- [ ] Testes, typecheck e build verdes.
- [ ] Aprovação humana para iniciar as alterações de autorização.

## 4. Fase 1 — Autenticação e autorização

### T05 — Tornar o aprovisionamento Supabase fail-closed

**Prioridade:** P0  
**Achado:** SEC-001  
**Escopo estimado:** M

**Descrição:** impedir que identidade Supabase desconhecida crie automaticamente `UserRef` ativo ou receba `TECHNICIAN`. Manter vínculo seguro de identidade aprovada e tratamento de conflito.

**Critérios de aceite:**

- [ ] Usuário sem `UserRef` ativo recebe 403 e nenhum registro é criado.
- [ ] Usuário aprovado mantém o papel cadastrado; somente e-mails da allowlist podem ser `ADMIN`.
- [ ] Conflitos entre e-mail, `authUserId` e `externalId` falham fechados e não mesclam contas.

**Verificação:**

- [ ] Testes cobrem usuário novo, ativo, inativo, e-mail conflitante, admin permitido e admin removido da allowlist.
- [ ] Teste de integração em homologação confirma que conta não aprovisionada não acessa páginas nem APIs.
- [ ] Executar `npm run typecheck` e o teste focado de sessão.

**Dependências:** T01, T02, T03.

**Arquivos/componentes prováveis:**

- `lib/auth/session.ts`
- `tests/auth-session.test.ts`
- `docs/publicacao-supabase-locaweb.md`

---

### T06 — Criar política central de visibilidade de tickets

**Prioridade:** P0  
**Achado:** SEC-002  
**Escopo estimado:** M

**Descrição:** implementar uma função server-only que traduza a matriz aprovada em `Prisma.TicketWhereInput`, cobrindo solicitante, participante, responsável e escopo global autorizado.

**Critérios de aceite:**

- [ ] A política não depende de validação no frontend.
- [ ] Usuário fora do escopo não distingue ticket inexistente de ticket não autorizado.
- [ ] A política é reutilizável por páginas, APIs, anexos e mutações.

**Verificação:**

- [ ] Testes unitários cobrem ao menos dois usuários, dois tickets e todos os papéis aprovados.
- [ ] Testes negativos alteram o ID do ticket e confirmam 404/negação.
- [ ] Executar `npm run typecheck` e o teste focado de autorização.

**Dependências:** T02, T05.

**Arquivos/componentes prováveis:**

- `lib/auth/ticket-access.ts`
- `lib/auth/permissions.ts`
- `tests/ticket-access.test.ts`

---

### T07 — Aplicar escopo às leituras e listagens de tickets

**Prioridade:** P0  
**Achado:** SEC-002  
**Escopo estimado:** M

**Descrição:** usar a política de T06 nas APIs e páginas de listagem/detalhe, removendo queries globais para usuários sem escopo global.

**Critérios de aceite:**

- [ ] API de lista retorna somente tickets visíveis para a sessão.
- [ ] API e página de detalhe retornam 404 para ticket fora do escopo.
- [ ] Kanban, fila operacional e acompanhamento usam o mesmo predicado de visibilidade.

**Verificação:**

- [ ] Testes de Route Handler cobrem lista, detalhe e troca de UUID entre usuários.
- [ ] Teste manual com duas contas sintéticas confirma isolamento.
- [ ] Executar testes focados, `npm run typecheck` e `npm run build`.

**Dependências:** T06.

**Arquivos/componentes prováveis:**

- `app/api/v1/gestec-help-desk/tickets/route.ts`
- `app/api/v1/gestec-help-desk/tickets/[id]/route.ts`
- `app/gestec_help_desk/tickets/[id]/page.tsx`
- `app/gestec_help_desk/tickets/page.tsx`
- `app/gestec_help_desk/kanban/page.tsx`

---

### T08 — Revalidar acesso a anexos pelo ticket

**Prioridade:** P0  
**Achados:** SEC-002, suporte a SEC-006  
**Escopo estimado:** M

**Descrição:** aplicar a política de ticket antes de upload, download e remoção de anexo. Não confiar apenas na correspondência entre `ticketId` e `attachmentId`.

**Critérios de aceite:**

- [ ] Upload exige permissão no ticket-alvo.
- [ ] Download retorna 404 quando o ator não pode ver o ticket, sem expor metadados do anexo.
- [ ] Remoção exige acesso ao ticket e a regra adicional de autor/gestor.

**Verificação:**

- [ ] Testes cobrem anexo válido, ticket de terceiro, attachmentId de outro ticket e anexo removido.
- [ ] Confirmar `Content-Disposition: attachment`, `nosniff` e `no-store` nos downloads autorizados.
- [ ] Executar testes focados e `npm run typecheck`.

**Dependências:** T06.

**Arquivos/componentes prováveis:**

- `app/api/v1/gestec-help-desk/tickets/[id]/attachments/route.ts`
- `app/api/v1/gestec-help-desk/tickets/[id]/attachments/[attachmentId]/route.ts`
- `lib/domain/attachments.ts`
- `tests/attachments-access.test.ts`

---

### T09 — Aplicar autorização por objeto às mutações de ticket

**Prioridade:** P0  
**Achado:** SEC-002  
**Escopo estimado:** M por lote

**Descrição:** impedir ações `tickets:work` em ticket fora do escopo. Dividir a implementação em lotes de no máximo cinco rotas, mantendo a mesma política central.

**Critérios de aceite:**

- [ ] Comentário, trabalho, resolução, aprovação, atribuição, participantes, ativos e retry validam acesso ao ticket antes da operação.
- [ ] Ações gerenciais continuam exigindo a permissão específica além do acesso ao objeto.
- [ ] Nenhuma mutação altera ticket fora do escopo mesmo com payload e versão válidos.

**Verificação:**

- [ ] Testes parametrizados cobrem cada Route Handler e trocam apenas o ticket ID entre dois usuários.
- [ ] Confirmar que negações não criam histórico, outbox, comentário, período de trabalho ou arquivo.
- [ ] Executar testes focados após cada lote e `npm run check` ao final.

**Dependências:** T06, T07.

**Arquivos/componentes prováveis:**

- `app/api/v1/gestec-help-desk/tickets/[id]/**/route.ts`
- `lib/domain/tickets.ts`
- `lib/domain/operations.ts`
- `tests/ticket-route-authorization.test.ts`

---

### T10 — Redigir campos internos conforme a audiência

**Prioridade:** P0  
**Achado:** SEC-002  
**Escopo estimado:** M

**Descrição:** substituir o `ticketInclude` único por seleções/serialização adequadas à sessão, evitando payload bruto, `lastError`, comentário interno e campos financeiros para audiências não autorizadas.

**Critérios de aceite:**

- [ ] Solicitante não recebe comentário interno, payload Zeev, erro de integração ou campos financeiros.
- [ ] Técnicos recebem somente os campos aprovados na matriz; admin/auditor seguem escopos explícitos.
- [ ] O mesmo filtro é aplicado em API e Server Components.

**Verificação:**

- [ ] Snapshot/teste de contrato compara respostas por papel.
- [ ] Busca nas respostas serializadas confirma ausência dos campos proibidos.
- [ ] Executar testes focados, `npm run typecheck` e `npm run build`.

**Dependências:** T02, T06, T07.

**Arquivos/componentes prováveis:**

- `lib/domain/tickets.ts`
- `lib/auth/ticket-access.ts`
- `app/api/v1/gestec-help-desk/tickets/[id]/route.ts`
- `app/gestec_help_desk/tickets/[id]/page.tsx`
- `tests/ticket-serialization.test.ts`

---

### T11 — Criar política central de escopo de relatórios

**Prioridade:** P0  
**Achado:** SEC-003  
**Escopo estimado:** M

**Descrição:** separar relatório individual, de equipe e global. Não aceitar `userId` escolhido pelo cliente sem validar papel e escopo organizacional.

**Critérios de aceite:**

- [ ] Usuário comum sempre recebe somente `session.userId`, mesmo com `userId=all` ou UUID de terceiro.
- [ ] Gestor/financeiro/auditor só recebe o escopo aprovado em T02.
- [ ] API, página, resumo e exportação usam a mesma função de política.

**Verificação:**

- [ ] Testes unitários cobrem filtro ausente, `all`, UUID próprio, UUID alheio e escopo de equipe.
- [ ] Testes de integração confirmam que o XLSX não contém usuário fora do escopo.
- [ ] Executar testes focados e `npm run typecheck`.

**Dependências:** T02, T05.

**Arquivos/componentes prováveis:**

- `lib/auth/report-access.ts`
- `lib/domain/report-query.ts`
- `lib/auth/permissions.ts`
- `tests/report-access.test.ts`

---

### T12 — Aplicar escopo de relatórios na UI e nas APIs

**Prioridade:** P0  
**Achado:** SEC-003  
**Escopo estimado:** M

**Descrição:** integrar T11 ao relatório visual, resumo e exportação; ocultar opções de filtro não autorizadas sem depender disso como controle de segurança.

**Critérios de aceite:**

- [ ] Rota de summary e exportação XLSX revalidam o escopo no servidor.
- [ ] Usuários sem permissão não recebem diretório completo de colaboradores nos filtros.
- [ ] Tentativas de ampliar escopo são negadas ou reduzidas ao próprio usuário de maneira documentada e auditável.

**Verificação:**

- [ ] Testes de Route Handler e página cobrem ao menos técnico e gestor/admin.
- [ ] Abrir XLSX de teste e confirmar que somente fixtures autorizadas estão presentes.
- [ ] Executar testes focados, `npm run typecheck` e `npm run build`.

**Dependências:** T11.

**Arquivos/componentes prováveis:**

- `app/gestec_help_desk/relatorios/page.tsx`
- `app/api/v1/gestec-help-desk/reports/summary/route.ts`
- `app/api/v1/gestec-help-desk/reports/time-entries.xlsx/route.ts`
- `components/reports/reports-filters-sheet.tsx`
- `tests/report-routes.test.ts`

## Checkpoint B — Controles de acesso

- [ ] T05 a T12 concluídas.
- [ ] Conta não aprovisionada recebe 403.
- [ ] Troca de UUID entre usuários falha em lista, detalhe, anexo e mutações.
- [ ] Relatório individual/equipe/global respeita a matriz aprovada.
- [ ] Não há payload Zeev ou comentário interno em audiência não autorizada.
- [ ] `npm run check` aprovado.
- [ ] Revisão humana de segurança antes de deploy em homologação.

## 5. Fase 2 — Disponibilidade, uploads e infraestrutura

### T13 — Impor limites síncronos de período e linhas nos relatórios

**Prioridade:** P1  
**Achado:** SEC-005  
**Escopo estimado:** M

**Descrição:** definir e aplicar limite de período, linhas, timeout e memória para summary e XLSX. Mover agregações do resumo para o PostgreSQL quando possível.

**Critérios de aceite:**

- [ ] Período acima do limite retorna erro estável e documentado.
- [ ] Exportação acima do limite síncrono não materializa o workbook em memória.
- [ ] Summary usa agregação no banco e não carrega todos os apontamentos.

**Verificação:**

- [ ] Testes de boundary cobrem exatamente abaixo, no limite e acima do limite.
- [ ] Teste de carga com dados sintéticos registra duração e memória dentro do orçamento definido.
- [ ] Executar testes focados, `npm run typecheck` e `npm run build`.

**Dependências:** T11, T12.

**Arquivos/componentes prováveis:**

- `lib/domain/report-query.ts`
- `app/api/v1/gestec-help-desk/reports/summary/route.ts`
- `app/api/v1/gestec-help-desk/reports/time-entries.xlsx/route.ts`
- `tests/report-limits.test.ts`

---

### T14 — Desenhar exportação assíncrona para volumes grandes

**Prioridade:** P1  
**Achado:** SEC-005  
**Escopo estimado:** M para especificação; implementação deve ser fatiada  
**Gate humano:** aprovar retenção, storage e público antes de implementar.

**Descrição:** definir contrato de job, status, autorização revalidada, storage temporário, expiração e download auditado usando a infraestrutura de fila já adotada.

**Critérios de aceite:**

- [ ] Especificação define limites que permanecem síncronos e quando criar job.
- [ ] Autorização é capturada para auditoria e revalidada no processamento/download.
- [ ] Artefato tem expiração, nome seguro, `no-store` e remoção automática.

**Verificação:**

- [ ] Revisar o desenho contra as Specs 14 e 17.
- [ ] Executar threat model específico para dados em repouso, link de download e reprocessamento.
- [ ] Aprovação humana registrada antes de criar schema/job/storage.

**Dependências:** T02, T13, T19.

**Arquivos/componentes prováveis:**

- `specs/help-desk/14-relatorios-agendados.md`
- `specs/help-desk/17-central-de-relatorios.md`
- `docs/modelo-de-dominio.md`

---

### T15 — Implementar rate limiting no edge

**Prioridade:** P1  
**Achado:** SEC-008  
**Escopo estimado:** S

**Descrição:** adicionar limites por IP e classe de endpoint no Nginx/edge, com tratamento de proxy confiável e resposta `429` consistente.

**Critérios de aceite:**

- [ ] Upload, integrações, exportações e APIs gerais possuem zonas/limites distintos.
- [ ] IP real só é aceito de proxy confiável; spoof de `X-Forwarded-For` não contorna o limite.
- [ ] Excesso retorna `429` e `Retry-After`, sem derrubar requests normais.

**Verificação:**

- [ ] `nginx -t` ou validação equivalente aprovada.
- [ ] Teste concorrente confirma limite, burst e recuperação da janela.
- [ ] Teste por proxy confirma que IP de cliente é contabilizado corretamente.

**Dependências:** T01, T03.

**Arquivos/componentes prováveis:**

- `deploy/nginx/helpdesk.conf.example`
- `docs/publicacao-supabase-locaweb.md`
- teste/script de carga sem dados reais

---

### T16 — Implementar rate limiting e cotas por identidade

**Prioridade:** P1  
**Achado:** SEC-008  
**Escopo estimado:** M  
**Gate humano:** aprovar persistência/limites e comportamento quando o backend do limiter estiver indisponível.

**Descrição:** aplicar limites por `userId` e por token de integração em armazenamento compartilhado, além de cota cumulativa de anexos por usuário/ticket/período.

**Critérios de aceite:**

- [ ] Contadores funcionam com mais de uma instância e não dependem de memória local.
- [ ] Upload e eventos Zeev possuem chaves independentes, limites e auditoria sem registrar o token.
- [ ] Indisponibilidade do limiter segue política fail-closed/fail-open aprovada por endpoint.

**Verificação:**

- [ ] Teste com duas instâncias confirma contador compartilhado.
- [ ] Teste concorrente confirma ausência de race condition acima da cota.
- [ ] Logs não contêm Bearer token, cookie ou nome completo de arquivo sensível.

**Dependências:** T15.

**Arquivos/componentes prováveis:**

- `lib/security/rate-limit.ts`
- rotas de anexos e integrações Zeev
- migration/schema do contador, se PostgreSQL for escolhido
- `tests/rate-limit.test.ts`

---

### T17 — Definir schema e lifecycle de quarentena de anexos

**Prioridade:** P1  
**Achado:** SEC-006  
**Escopo estimado:** M  
**Gate humano:** aprovar scanner, retenção de quarentena e resposta operacional.

**Descrição:** introduzir estados de scan (`PENDING`, `CLEAN`, `INFECTED`, `ERROR`), storage de quarentena separado e metadados de veredito sem expor detalhes do engine ao usuário.

**Critérios de aceite:**

- [ ] Novo upload não fica disponível para download antes de `CLEAN`.
- [ ] Arquivo infectado/erro não é promovido ao storage disponível.
- [ ] Hash, engine, versão, timestamp e veredito são auditados; conteúdo e secrets não vão para logs.

**Verificação:**

- [ ] Migration aplica e reverte em banco descartável.
- [ ] Testes de estado impedem download em `PENDING`, `INFECTED` e `ERROR`.
- [ ] Teste de concorrência garante promoção única do arquivo.

**Dependências:** T08, T19.

**Arquivos/componentes prováveis:**

- `prisma/schema.prisma`
- `prisma/migrations/...`
- `lib/domain/attachments.ts`
- `tests/attachment-quarantine.test.ts`

---

### T18 — Integrar scanner antimalware e cotas de anexo

**Prioridade:** P1  
**Achados:** SEC-006, SEC-008  
**Escopo estimado:** M por slice

**Descrição:** criar adapter de scanner com timeout/tamanho máximo, worker de scan, promoção atômica de arquivo limpo e descarte controlado dos demais. Aplicar as cotas de T16.

**Critérios de aceite:**

- [ ] EICAR sintético é detectado em homologação sem sair da rede autorizada.
- [ ] Timeout, engine indisponível e resposta inválida falham fechados.
- [ ] Arquivo limpo é promovido uma única vez; infectado é isolado/removido conforme política.

**Verificação:**

- [ ] Testes usam adapter falso; teste E2E do scanner roda somente em homologação controlada.
- [ ] Confirmar que arquivos nunca são enviados a serviço externo não aprovado.
- [ ] Testar cota por usuário/ticket e limpeza de temporários após falha.

**Dependências:** T16, T17.

**Arquivos/componentes prováveis:**

- `lib/security/malware-scanner.ts`
- `lib/jobs/attachment-scan-queue.ts`
- `lib/domain/attachments.ts`
- configuração Docker/Compose do scanner escolhido
- `tests/malware-scanner.test.ts`

---

### T19 — Impor HTTPS e security headers

**Prioridade:** P1  
**Achado:** SEC-007  
**Escopo estimado:** M  
**Gate humano:** confirmar onde TLS termina e quais domínios Supabase precisam entrar no CSP.

**Descrição:** versionar redirecionamento HTTP→HTTPS, HSTS e cabeçalhos de navegador. Implantar CSP primeiro em report-only, corrigir violações legítimas e então impor.

**Critérios de aceite:**

- [ ] HTTP redireciona para HTTPS no ponto público efetivo.
- [ ] Todas as respostas têm HSTS, `nosniff`, Referrer-Policy, Permissions-Policy e `frame-ancestors` apropriados.
- [ ] CSP imposta permite login Supabase e assets necessários sem `unsafe-eval`; exceções são justificadas.

**Verificação:**

- [ ] Ler os guias locais relevantes em `node_modules/next/dist/docs/` antes de alterar `next.config.ts` ou middleware/proxy.
- [ ] Testar headers em página, API, redirect de auth, erro 404 e download de anexo.
- [ ] Testar login, recuperação de senha e logout em navegador real após CSP.

**Dependências:** T01, T03, T15.

**Arquivos/componentes prováveis:**

- `deploy/nginx/helpdesk.conf.example`
- `next.config.ts` ou mecanismo indicado pela documentação local
- `middleware.ts` somente se indicado pela documentação da versão
- `docs/publicacao-supabase-locaweb.md`
- `tests/security-headers.test.ts`

## Checkpoint C — Disponibilidade e hardening

- [ ] T13 a T19 aplicáveis concluídas.
- [ ] Exportação grande é limitada ou assíncrona.
- [ ] Rate limit funciona no edge e por identidade.
- [ ] Anexo não fica disponível antes de scan limpo.
- [ ] HTTPS e headers foram validados no endpoint público de homologação.
- [ ] Testes de carga e navegador não usam produção nem dados reais.
- [ ] `npm run check` aprovado.

## 6. Fase 3 — Privacidade, segurança contínua e entrega

### T20 — Aprovar matriz de retenção, finalidade e legal hold

**Prioridade:** P2  
**Achado:** SEC-009  
**Escopo estimado:** M  
**Gate humano:** aprovação conjunta de negócio, jurídico/privacidade, infraestrutura e segurança.

**Descrição:** definir por entidade a finalidade, categoria de dado, owner, prazo, gatilho de expiração, anonimização/purge, legal hold, backup e evidência de execução.

**Critérios de aceite:**

- [ ] Tickets, comentários, anexos, `SyncExecution`, `AuditEvent`, notificações e apontamentos possuem política explícita.
- [ ] A política diferencia exclusão operacional, retenção legal, anonimização e exclusão física.
- [ ] Backups, restore, storage e filas estão incluídos.

**Verificação:**

- [ ] Revisão formal com responsáveis e data de próxima revisão.
- [ ] Nenhum prazo “temporário” permanece sem owner/data.
- [ ] Casos de exportação, correção e exclusão do titular estão mapeados ponta a ponta.

**Dependências:** T01, T02.

**Arquivos/componentes prováveis:**

- `docs/politica-retencao-e-privacidade.md`
- `docs/modelo-de-dominio.md`
- `docs/lacunas-e-ambiguidades.md`

---

### T21 — Implementar purge/redação de payloads e auditoria

**Prioridade:** P2  
**Achado:** SEC-009  
**Escopo estimado:** M por entidade

**Descrição:** minimizar novos payloads e implementar jobs idempotentes de redação/purge conforme T20, começando por `SyncExecution` e dados de diagnóstico de maior risco.

**Critérios de aceite:**

- [ ] Novos payloads armazenam apenas campos necessários e redigidos.
- [ ] Job seleciona somente registros expirados, respeita legal hold e produz contagem/auditoria sem copiar PII.
- [ ] Retry do job não apaga registro fora do escopo nem duplica eventos.

**Verificação:**

- [ ] Testes com relógio controlado cobrem antes/no/depois do prazo e legal hold.
- [ ] Dry-run informa quantidade/IDs técnicos antes do primeiro purge real.
- [ ] Restore de backup em ambiente isolado reaplica o ledger de exclusões conforme política.

**Dependências:** T20.

**Arquivos/componentes prováveis:**

- `lib/jobs/data-retention.ts`
- `lib/domain/integrations.ts`
- `lib/domain/tickets.ts`
- migration/schema de legal hold/ledger, se necessário
- `tests/data-retention.test.ts`

---

### T22 — Implementar retenção e purge de anexos

**Prioridade:** P2  
**Achados:** SEC-006, SEC-009  
**Escopo estimado:** M

**Descrição:** aplicar T20 ao storage e metadados de anexos, incluindo quarentena, arquivos removidos, órfãos e backups.

**Critérios de aceite:**

- [ ] Job resolve o caminho somente sob roots allowlisted e nunca opera no root do storage.
- [ ] Ownership/metadados são lidos antes da exclusão; symlinks/path traversal são recusados.
- [ ] Banco e filesystem não ficam divergentes após falha ou retry.

**Verificação:**

- [ ] Testes cobrem arquivo válido, órfão, symlink, path fora da root, legal hold e retry.
- [ ] Dry-run e backup recuperável são obrigatórios antes do primeiro purge material.
- [ ] Auditoria registra ID técnico, regra aplicada e resultado, sem conteúdo do arquivo.

**Dependências:** T17, T20, T21.

**Arquivos/componentes prováveis:**

- `lib/jobs/attachment-retention.ts`
- `lib/domain/attachments.ts`
- `prisma/schema.prisma`
- migration relacionada
- `tests/attachment-retention.test.ts`

---

### T23 — Adicionar gates de segurança ao CI

**Prioridade:** P2  
**Achados:** prevenção de regressão de SEC-001 a SEC-009  
**Escopo estimado:** M  
**Gate humano:** escolher plataforma de CI, política de severidade e tratamento de falsos positivos.

**Descrição:** criar pipeline de instalação imutável, lint/typecheck/test/build, audit de dependências, secret scanning, SAST e testes de autorização negativos.

**Critérios de aceite:**

- [ ] CI usa lockfile, versão de Node/npm fixada e permissões mínimas.
- [ ] Critical/high alcançável, secret real e falha dos testes de autorização bloqueiam merge.
- [ ] Actions/dependências de CI são pinadas e nenhuma credencial é exposta em fork/log/artifact.

**Verificação:**

- [ ] PR sintético com teste quebrado falha.
- [ ] Fixture de secret falso controlado é detectada sem versionar credencial real.
- [ ] Exceções exigem owner, justificativa e data de revisão.

**Dependências:** T04, T05-T13, T15-T19, T21-T22.

**Arquivos/componentes prováveis:**

- pipeline CI da plataforma aprovada
- `package.json`
- configuração de scanner/SAST
- documentação de exceções

---

### T24 — Remover bundles de release do Git e publicar artefatos verificáveis

**Prioridade:** P2  
**Achado relacionado:** supply chain/hardening observado na auditoria  
**Escopo estimado:** M  
**Gate humano:** não reescrever histórico nem apagar releases sem aprovação e backup.

**Descrição:** substituir `.tar.gz` versionados por artefatos gerados no CI, com checksum, SBOM, proveniência e retenção no repositório de releases.

**Critérios de aceite:**

- [ ] Novos bundles não entram no Git.
- [ ] Release é reproduzível a partir do commit/tag e possui checksum/SBOM.
- [ ] Procedimento de rollback aponta para artefato imutável e validado.

**Verificação:**

- [ ] Comparar conteúdo do artefato com allowlist e confirmar ausência de `.env`, keys e source maps indevidos.
- [ ] Validar checksum/assinatura antes do deploy em homologação.
- [ ] Confirmar que a remoção dos arquivos atuais não quebra o procedimento operacional.

**Dependências:** T03, T23.

**Arquivos/componentes prováveis:**

- `.gitignore`
- documentação de release/deploy
- pipeline CI
- repositório de releases aprovado

---

### T25 — Executar reaudição e teste de regressão de segurança

**Prioridade:** P0 para liberação final  
**Achados:** SEC-001 a SEC-009  
**Escopo estimado:** M

**Descrição:** repetir a auditoria estática e executar testes controlados em homologação para encerrar ou reclassificar cada achado com evidência.

**Critérios de aceite:**

- [ ] Cada SEC possui status final, commit/PR da correção e evidência de teste.
- [ ] Nenhum critical/high alcançável permanece sem mitigação aprovada e data de revisão.
- [ ] O relatório registra riscos residuais e controles externos confirmados.

**Verificação:**

- [ ] Executar `npm run check` e `npm audit --json`.
- [ ] Executar suite negativa de autorização, testes de carga, upload EICAR controlado e inspeção de headers.
- [ ] Validar conta não aprovisionada, isolamento por ticket e exportação por escopo em homologação.
- [ ] Atualizar `SECURITY_AUDIT.md` ou criar relatório de reaudição sem apagar a evidência original.

**Dependências:** todas as tasks de remediação aprovadas/aplicáveis.

**Arquivos/componentes prováveis:**

- `SECURITY_AUDIT.md` ou novo relatório datado
- testes de segurança adicionados nas tasks anteriores
- evidências de homologação

## Checkpoint D — Encerramento

- [ ] T20 a T25 concluídas ou formalmente diferidas com owner e data.
- [ ] P0 e P1 encerrados ou risco aceito formalmente.
- [ ] CI bloqueia regressões de dependência, secret e autorização.
- [ ] Política de retenção está aprovada e testada.
- [ ] Reauditoria aprovada por segurança e responsável do produto.
- [ ] Plano de rollback e monitoração pós-deploy documentados.

## 7. Paralelização segura

| Trilha | Tasks | Pode iniciar quando | Observação |
|---|---|---|---|
| Dependências | T03-T04 | imediatamente | independente da matriz de acesso |
| Supabase/RBAC | T01-T02-T05 | imediatamente, sequencial | T05 exige decisão de T02 |
| Tickets | T06-T10 | após T02/T05 | T07, T08 e parte de T09 podem paralelizar após T06 |
| Relatórios | T11-T14 | após T02/T05 | T13 depende do contrato de T11/T12 |
| Edge | T15 e T19 | após T01/T03 | coordenar headers, proxy e IP real |
| Rate limiting app | T16 | após T15 | precisa de backend compartilhado |
| Anexos | T17-T18 | após T08/T16/T20 | scanner e retenção compartilham lifecycle |
| Privacidade | T20-T22 | T20 pode iniciar cedo | implementação somente após política aprovada |
| CI/release | T23-T24 | após contratos estabilizarem | evitar automatizar comportamento ainda em mudança |

## 8. Riscos e mitigação do plano

| Risco | Impacto | Mitigação |
|---|---|---|
| Bloquear usuários legítimos ao fechar aprovisionamento | Alto | inventariar usuários aprovados, piloto em homologação e rollback documentado |
| Política de ticket quebrar fila global de TI | Alto | matriz aprovada, fixtures por papel e teste de todas as visões |
| CSP quebrar Supabase Auth | Médio | report-only, leitura da documentação local e teste em navegador |
| Limite de relatório impedir operação legítima | Médio | limite mensurado, exportação assíncrona e mensagem acionável |
| Scanner indisponível parar uploads | Médio | fila, retry, observabilidade e política fail-closed aprovada |
| Rate limiting bloquear proxy/NAT corporativo | Médio | limite por identidade além de IP, burst medido e allowlist controlada |
| Purge remover evidência legal | Alto | legal hold, dry-run, dupla aprovação e backup recuperável |
| Upgrade de dependência causar regressão nativa | Médio | mudança isolada, lockfile revisado, build Docker e rollback |

## 9. Decisões humanas pendentes

- [ ] Supabase permitirá signup ou somente convite/admin?
- [ ] Quais usuários representam solicitante versus técnico?
- [ ] Técnicos possuem escopo global, por equipe, grupo de serviço ou centro de custo?
- [ ] Quem pode ver comentário interno e payload/erro Zeev?
- [ ] Quais papéis podem consultar/exportar relatório individual, de equipe e global?
- [ ] Qual o período e volume máximo para relatório síncrono?
- [ ] Qual scanner antimalware e modelo de hospedagem são aprovados?
- [ ] Onde ocorre a terminação TLS e quem mantém o CSP?
- [ ] Qual armazenamento compartilhado será usado para rate limiting?
- [ ] Quais prazos de retenção e regras de legal hold se aplicam a cada entidade?
- [ ] Qual plataforma de CI e repositório de artefatos serão usados?

## 10. Rastreabilidade dos achados

| Achado | Tasks de correção | Evidência de encerramento esperada |
|---|---|---|
| SEC-001 | T01, T02, T05 | conta não aprovisionada bloqueada e testes de sessão |
| SEC-002 | T02, T06-T10 | suite negativa por UUID/objeto e respostas redigidas |
| SEC-003 | T02, T11-T12 | exportação isolada por usuário/equipe/papel |
| SEC-004 | T03-T04 | audit limpo, lockfile e build aprovados |
| SEC-005 | T11-T14 | limites, carga controlada e fluxo assíncrono aprovado |
| SEC-006 | T08, T17-T18, T22 | quarentena, EICAR bloqueado e retenção testada |
| SEC-007 | T01, T03, T15, T19 | HTTPS/headers observados em homologação |
| SEC-008 | T15-T16, T18 | 429/cotas confirmados sob concorrência |
| SEC-009 | T20-T22 | política aprovada, purge e restore testados |

## 11. Comandos de verificação de referência

Executar conforme a task e somente em ambiente autorizado:

```powershell
npm run typecheck
npm test
npm run build
npm run check
npm audit --json
```

Para validações de infraestrutura, usar a ferramenta instalada no ambiente e registrar a saída sem secrets:

```text
validar configuração Nginx
validar Docker Compose
inspecionar headers HTTP/HTTPS de homologação
executar teste de carga controlado
executar teste EICAR somente no scanner de homologação
```

Nenhuma task deste arquivo deve ser executada contra produção antes de passar pelos checkpoints correspondentes.
