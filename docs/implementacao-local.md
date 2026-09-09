# Implementação local do Gestec Help Desk

## Estado atual

A aplicação executável ocupa a raiz deste repositório. `docs/`, `specs/`, `index.md` e `pencil-new.pen` permanecem como fontes funcionais e visuais.

O primeiro incremento funcional cobre:

- fila e detalhe de tickets recebidos do Zeev;
- comentários internos/externos, períodos de trabalho e conclusão;
- sincronização de contato, atendimento e aprovação interna da TI com o Zeev;
- fila persistente `pg-boss` no PostgreSQL, com ordenação por ticket, repetição exponencial e reconciliação de eventos pendentes;
- idempotência de entrada, conclusão e timer;
- centro de custo disponibilizado como projeto;
- projetos manuais, Meu Tempo, lançamento manual e histórico;
- inventário básico de ativos;
- relatórios e exportação real em Excel.

## Banco de dados

O schema oficial está em `prisma/schema.prisma` e a migration inicial em `prisma/migrations/`. O banco de sombra existe somente para o comando de desenvolvimento do Prisma e não é usado pela aplicação em execução.

O usuário da aplicação deve ser proprietário apenas do banco do módulo, sem privilégios de superusuário, criação de roles ou criação livre de bancos.

## Segurança do modo local

`GESTEC_AUTH_MODE=development` é aceito num build local somente quando `GESTEC_ALLOW_DEV_AUTH=true`. Não publique essa configuração. No modo integrado, a identidade vem do Gestec e é validada por assinatura HMAC e prazo máximo de cinco minutos.

Tokens do Zeev e URLs de callback devem existir apenas nos arquivos `.env*`, ignorados pelo Git, ou no cofre de segredos do ambiente.

No primeiro acesso autenticado ao módulo — ou assim que uma operação de saída é enfileirada — o worker `zeev-outbound-sync` é iniciado. A operação funcional e o registro `SyncExecution` são confirmados antes do job; se o processo cair entre essas etapas, o worker reenfileira execuções `PENDING` ou `FAILED` ao ser iniciado novamente. Eventos do mesmo ticket usam FIFO estrito, evitando que a conclusão ultrapasse o contato inicial. Após esgotar as tentativas com backoff, o job segue para a fila morta para inspeção e redrive operacional.

## Integração Zeev na máquina local

O solicitante abre e avalia no Zeev. Toda a TI atende no Help Desk com a conta do Gestec. Um único `ZEEV_API_TOKEN` (usuário de integração) conclui as tarefas humanas da TI no processo, para ninguém da TI precisar voltar ao inbox do Zeev.

Etapas da TI no subprocesso **Atender ticket**:

| Ação no Help Desk | Tarefa no Zeev | Resultado |
|---|---|---|
| Iniciar atendimento | Contato inicial | `Concluir` |
| Finalizar | Atender solicitação | `Concluir` |
| Finalizar | Aprovar conclusão | `Aprovar` |

Validar conclusão / NPS permanece com o solicitante. Nota até 6 reabre o mesmo ticket.

O Zeev não chama `localhost`. Para testar na máquina:

1. `npm run dev`
2. `npm run zeev:tunnel`
3. Integração HTTP POST em `https://<túnel>/api/v1/gestec-help-desk/integrations/zeev/tickets` com `Authorization: Bearer <ZEEV_INBOUND_TOKEN>`
4. No `.env.local` (não versionar o token):

```
ZEEV_API_BASE_URL="https://tecnoplanta.zeev.it"
ZEEV_API_TOKEN="<token do usuário de integração>"
ZEEV_TASK_CONTACT_CODE="<apelido de Contato inicial>"
ZEEV_TASK_SERVICE_CODE="<apelido de Atender solicitação>"
ZEEV_TASK_APPROVE_CODE="<apelido de Aprovar conclusão>"
```

Os apelidos saem do modelador Zeev (código original / integração de cada tarefa). Os resultados padrão já são `Concluir`, `Concluir` e `Aprovar`, iguais aos botões mapeados no processo.

5. Abra a solicitação **no Zeev**. Atenda no Help Desk. A avaliação volta em `POST /api/v1/gestec-help-desk/integrations/zeev/evaluations`.

## Substituição do túnel pelo Gestec

Quando o módulo estiver em HTTPS no Gestec, troque a URL da integração Zeev para a URL pública e remova o túnel. O callback continua sendo a API do Zeev, não o endpoint de teste.
