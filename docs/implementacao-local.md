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

Etapas da TI controladas pelo Help Desk:

| Ação no Help Desk         | Tarefa no Zeev      | Resultado                                              |
| ------------------------- | ------------------- | ------------------------------------------------------ |
| Aprovar triagem           | Triagem             | resultado publicado da tarefa (neste processo, `1`)    |
| Registrar contato inicial | Contato inicial     | `Concluir` + justificativa e mensagem do Help Desk     |
| Finalizar atendimento     | Atender solicitação | `Concluir`                                             |
| Aprovar conclusão         | Aprovar conclusão   | `Aprovar`                                              |
| Revisar desvio            | Verificar desvio    | resultado configurado para nova avaliação ou conclusão |

Validar conclusão / NPS permanece com o solicitante. Nota até 6 reabre o mesmo ticket para o responsável anterior no Help Desk. O Help Desk só libera a decisão de desvio depois de receber a confirmação de que a tarefa **Verificar desvio** está ativa no Zeev; isso evita concluir uma tarefa que ainda não existe no inbox da integração.

### Contrato do ciclo completo

| Sentido          | Evento                                     | Ponto do processo Zeev                             | Efeito                                                                        |
| ---------------- | ------------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------- |
| Zeev → Help Desk | `ticket.ready_for_service`                 | Serviço após `GE01`, somente no caminho normal     | Cria/atualiza ticket em **Triagem**.                                          |
| Help Desk → Zeev | `ticket.triage_approved`                   | Tarefa `Triagem`                                   | Conclui a triagem com o responsável escolhido.                                |
| Help Desk → Zeev | `ticket.contact_started`                   | Tarefa `Contato inicial`                           | Conclui a tarefa, grava `reason` e publica mensagem visível ao solicitante.   |
| Help Desk → Zeev | `ticket.resolved`                          | Tarefa `Atender solicitação`                       | Conclui o atendimento e envia o resumo/mensagens externas.                    |
| Zeev → Help Desk | `ticket.stage_ready` / `INTERNAL_APPROVAL` | Serviço imediatamente antes de `Aprovar conclusão` | Libera o botão **Aprovar conclusão** no Help Desk.                            |
| Help Desk → Zeev | `ticket.internal_approved`                 | Tarefa `Aprovar conclusão`                         | Encaminha a validação ao solicitante.                                         |
| Zeev → Help Desk | avaliação                                  | Serviço após `Validar conclusão`                   | Nota alta fecha; nota até 6 reabre e mantém o responsável.                    |
| Zeev → Help Desk | `ticket.stage_ready` / `DEVIATION_REVIEW`  | Serviço imediatamente antes de `Verificar desvio`  | Libera a revisão do desvio no Help Desk.                                      |
| Help Desk → Zeev | `ticket.deviation_reviewed`                | Tarefa `Verificar desvio`                          | Solicita nova avaliação ou conclui, conforme o resultado configurado no Zeev. |

Os eventos de etapa são persistidos com o ciclo de resolução atual. Portanto, uma confirmação antiga de `Aprovar conclusão` não libera por engano uma aprovação posterior depois de uma reabertura.

O Zeev não chama `localhost`. Para testar na máquina:

1. `npm run dev`
2. `npm run zeev:tunnel`
3. Integração HTTP POST em `https://<túnel>/api/v1/gestec-help-desk/integrations/zeev/tickets` com `Authorization: Bearer <ZEEV_INBOUND_TOKEN>`
4. No `.env.local` (não versionar o token):

```
ZEEV_API_BASE_URL="https://tecnoplanta.zeev.it"
ZEEV_API_TOKEN="<token do usuário de integração>"
ZEEV_TASK_TRIAGE_CODE="<apelido de Triagem>"
ZEEV_TRIAGE_RESULT="<resultado da Triagem que encaminha para Atender ticket>"
ZEEV_TASK_CONTACT_CODE="<apelido de Contato inicial>"
ZEEV_TASK_SERVICE_CODE="<apelido de Atender solicitação>"
ZEEV_TASK_APPROVE_CODE="<apelido de Aprovar conclusão>"
ZEEV_TASK_VALIDATE_CODE="<apelido de Validar conclusão>"
ZEEV_TASK_DEVIATION_CODE="<apelido de Verificar desvio>"
ZEEV_DEVIATION_RETRY_RESULT="<resultado que solicita nova avaliação>"
ZEEV_DEVIATION_CLOSE_RESULT="<resultado que conclui o ticket>"
```

Os apelidos e resultados saem do modelador Zeev (código original / integração de cada tarefa). `ZEEV_TRIAGE_RESULT` é obrigatório porque os resultados publicados podem ser códigos, como `1` e `2`, e não necessariamente o texto visível do botão. Os resultados padrão de contato, atendimento e aprovação permanecem `Concluir`, `Concluir` e `Aprovar` enquanto forem confirmados no processo publicado.

5. No fluxo **Abertura de Ticket T.I**, substitua somente o caminho normal `GE01 → GE02` por `GE01 → Enviar ticket ao Gestec Help Desk → GE02`. Não conecte a tarefa de serviço ao ramal de cancelamento. A tarefa deve fazer `POST` para o endpoint público acima. Assim que o solicitante envia o formulário, o ticket aparece no Help Desk como **Triagem**; a aprovação feita no Help Desk conclui a tarefa `Triagem` no Zeev.

   O Zeev valida novamente os campos obrigatórios ao concluir cada tarefa pela API. Por isso, no corpo dessa integração de entrada, inclua também `formFields` com os valores originais do formulário. O Help Desk preserva essa lista e a devolve automaticamente em Triagem, Contato inicial, Atendimento, Aprovação e Revisão de desvio. Use os aliases confirmados no aplicativo:

   ```json
   "formFields": [
     { "name": "servico", "value": "{Form.servico}", "row": 1 },
     { "name": "sistemaIndisponivel", "value": "{Form.sistemaIndisponivel}", "row": 1 },
     { "name": "infraestruturaInoperante", "value": "{Form.infraestruturaInoperante}", "row": 1 },
     { "name": "centroDeCusto", "value": "{Form.centroDeCusto}", "row": 1 },
     { "name": "prioridade", "value": "{Form.prioridade}", "row": 1 },
     { "name": "nivel", "value": "{Form.nivel}", "row": 1 },
     { "name": "grupoDeServicos", "value": "{Form.grupoDeServicos}", "row": 1 },
     { "name": "tipoSolicitacao", "value": "{Form.tipoSolicitacao}", "row": 1 },
     { "name": "responsavel", "value": "{Form.responsavel}", "row": 1 }
   ]
   ```

   Os nove nomes acima foram retornados pelo próprio Zeev como obrigatórios na tentativa de concluir a Triagem. Mantenha os demais campos que já envia no contrato do ticket; se uma tabela repetível fizer parte do formulário, repita o campo com o `row` correspondente. No Help Desk, `servico`, `nivel` e `responsavel` são obrigatórios em toda triagem; `sistemaIndisponivel` e `infraestruturaInoperante` só são exigidos localmente para **Incidente** e **Interrupção de serviços**.

   **Importante:** no Zeev, a obrigatoriedade precisa obedecer à mesma condição de visibilidade. Um campo invisível para **Solicitação** não pode permanecer marcado como obrigatório incondicionalmente; caso contrário, a própria API Zeev continuará recusando a Triagem, mesmo que o Help Desk o omita.
6. Configure uma tarefa de serviço de etapa imediatamente antes de **Aprovar conclusão** e outra imediatamente antes de **Verificar desvio**, ambas fazendo `POST` para `/api/v1/gestec-help-desk/integrations/zeev/stages`. O corpo deve informar `event: "ticket.stage_ready"`, `stage: "INTERNAL_APPROVAL"` ou `"DEVIATION_REVIEW"`, a instância e a referência externa do ticket. Cada execução da tarefa precisa de chave de idempotência própria.
7. Configure uma tarefa de serviço após **Validar conclusão** para chamar `POST /api/v1/gestec-help-desk/integrations/zeev/evaluations`. O corpo precisa conter referência externa, identificador único da avaliação, nota, expectativa atendida e justificativa/comentários quando existirem.

> **VALIDAR antes de publicar:** os nomes exatos dos resultados de `Verificar desvio` e a macro Zeev que identifica unicamente cada execução de tarefa. Não use valores inferidos como `Avaliar ticket novamente` ou `Concluir ticket` sem conferir a configuração real do gateway `GE07`.

Ao usar **Registrar contato inicial** no Help Desk, a observação obrigatória é armazenada no histórico do ticket e enviada ao Zeev no `reason` da conclusão e em uma mensagem visível ao solicitante. Os valores originais do formulário recebidos em `formFields` acompanham a conclusão da tarefa, sem que o Help Desk invente ou sobrescreva valores de campos Zeev.

## Substituição do túnel pelo Gestec

Quando o módulo estiver em HTTPS no Gestec, troque a URL da integração Zeev para a URL pública e remova o túnel. O callback continua sendo a API do Zeev, não o endpoint de teste.
