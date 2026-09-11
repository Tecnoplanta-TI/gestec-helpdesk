# 04 — Integrações

## Metadados

| Campo                        | Valor                                                   |
| ---------------------------- | ------------------------------------------------------- |
| **ID**                       | 04                                                      |
| **Nome**                     | Integrações                                             |
| **Status**                   | Rascunho                                                |
| **Última atualização**       | 2026-07-20                                              |
| **Referência Figma**         | Gestec Help Desk — Integrações (lista)                  |
| **Referência implementação** | `src/app/cadastros/permissoes/page.tsx` (CRUD + tabela) |
| **Spec pai**                 | [01-help-desk.md](01-help-desk.md) (módulo)             |

---

## 1. Objetivo

**Subpágina** administrativa do módulo Help Desk — sidebar **Integrações** (`/gestec_help_desk/integracoes`).

Central para **administrar integrações** entre o Gestec e **plataformas externas** (webhooks, APIs REST, Discord, etc.), no estilo **Zeev**.

Permite:

1. **Listar** integrações configuradas.
2. **Adicionar** nova integração.
3. **Abrir** configuração de uma integração existente ([04.1](04.1-configuracao-integracao-api.md)).
4. **Excluir** integração.

---

## 2. Acesso e permissões

| Perfil                                         | Acesso              |
| ---------------------------------------------- | ------------------- |
| **Profissional help desk** (admin integrações) | Sim — CRUD completo |
| **Solicitante**                                | **Não**             |
| Sem permissão                                  | Acesso negado       |

**Rota:** `/gestec_help_desk/integracoes`

**Permissões sugeridas:**

| Permissão               | Uso                            |
| ----------------------- | ------------------------------ |
| `gestec_help_desk:view` | Listar integrações             |
| `gestec_help_desk:edit` | Criar, editar, excluir, testar |

**Proteção:**

```tsx
<ProtectedRoute module={Modules.GestecHelpDesk} action={Actions.View}>
```

**Breadcrumb:** `Início / Gestec Help Desk / Integrações`

**Cronômetro** sidebar ([01](01-help-desk.md) §5): somente help desk quando ativo.

---

## 3. Layout e componentes

### 3.1 Header

| Elemento        | Conteúdo                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------- |
| `Title`         | **Integrações**                                                                              |
| `Description`   | Configure chamadas HTTP e integrações externas, no estilo do Zeev.                           |
| **+ Adicionar** | Botão verde — cria nova integração e navega para [04.1](04.1-configuracao-integracao-api.md) |

### 3.2 Barra de busca

| Elemento | Conteúdo                                                                 |
| -------- | ------------------------------------------------------------------------ |
| Contador | `{n} registro(s)` — ex.: _1 registro_                                    |
| Pesquisa | `Input` com ícone lupa — placeholder **Pesquisar**; filtra por nome/tipo |

### 3.3 Tabela de integrações

| Coluna            | Conteúdo           | Formatação                                                       |
| ----------------- | ------------------ | ---------------------------------------------------------------- |
| **Tipo**          | Tipo da integração | `Badge` verde — ex.: **RESTful JSON**                            |
| **Nome**          | Nome descritivo    | Link verde; clique → [04.1](04.1-configuracao-integracao-api.md) |
| **Criado por**    | Usuário autor      | Nome + e-mail (duas linhas)                                      |
| **Modificado em** | Última alteração   | Data/hora — ex.: `26/06/2026, 16:52:48`                          |
| **#**             | ID + ações         | Número sequencial + ícone **lixeira** vermelho (excluir)         |

**Exemplo de linha (Figma):**

| Tipo         | Nome                       | Criado por                | Modificado em        | #   |
| ------------ | -------------------------- | ------------------------- | -------------------- | --- |
| RESTful JSON | API - Enviar P1 ao Discord | João Lopes / joao.lopes@… | 26/06/2026, 16:52:48 | 🗑 1 |

### 3.4 Componentes (shadcn/ui)

| Componente            | Uso                     |
| --------------------- | ----------------------- |
| `Card`                | Container da lista      |
| `Table` / `DataTable` | Listagem                |
| `Badge`               | Tipo                    |
| `Input`               | Pesquisa                |
| `Button`              | + Adicionar             |
| `AlertDialog`         | Confirmação de exclusão |

---

## 4. Ações do usuário

| Ação      | Gatilho            | Resultado                                                                |
| --------- | ------------------ | ------------------------------------------------------------------------ |
| Adicionar | **+ Adicionar**    | Navega `/gestec_help_desk/integracoes/nova` ou `/integracoes/[id]` vazio |
| Editar    | Clique no **Nome** | Abre [04.1](04.1-configuracao-integracao-api.md)                         |
| Pesquisar | Input Pesquisar    | Filtra lista (debounce)                                                  |
| Excluir   | Ícone lixeira      | `AlertDialog` → DELETE API → remove linha                                |

---

## 5. Dados e API

| Operação | Método | Endpoint                                    |
| -------- | ------ | ------------------------------------------- |
| Listar   | GET    | `/api/v1/gestec-help-desk/integrations?q=`  |
| Criar    | POST   | `/api/v1/gestec-help-desk/integrations`     |
| Excluir  | DELETE | `/api/v1/gestec-help-desk/integrations/:id` |

**Response listagem (exemplo):**

```json
{
  "total": 1,
  "items": [
    {
      "id": 1,
      "type": "restful_json",
      "typeLabel": "RESTful JSON",
      "name": "API - Enviar P1 ao Discord",
      "createdBy": {
        "name": "João Lopes",
        "email": "joao.lopes@tecnoplanta.com.br"
      },
      "updatedAt": "2026-06-26T16:52:48.000Z"
    }
  ]
}
```

---

## 6. Tipos de integração

| Valor          | Label UI         | Spec detalhe                                |
| -------------- | ---------------- | ------------------------------------------- |
| `restful_json` | **RESTful JSON** | [04.1](04.1-configuracao-integracao-api.md) |

Outros tipos (SOAP, GraphQL, fila) — **TBD** roadmap.

---

## 7. Caso de uso conhecido

Integração exemplo no Figma: **API - Enviar P1 ao Discord** — webhook POST para notificar tickets **P1** no Discord. Gatilho de execução (evento workflow, prioridade, etc.) — **TBD** em 04.1 §8.

## 7.1 Sincronização operacional Zeev — `CONFIRMED`

O processo **Abertura de Ticket T.I** é integrado bidirecionalmente: o solicitante inicia e avalia no Zeev; a TI executa triagem, contato, atendimento, aprovação interna e revisão de desvio no Help Desk. O Help Desk registra cada envio/recebimento em execução de integração, com idempotência, histórico e nova tentativa segura.

| Momento                                   | Direção          | Contrato                                                             |
| ----------------------------------------- | ---------------- | -------------------------------------------------------------------- |
| Solicitação criada                        | Zeev → Help Desk | `POST /integrations/zeev/tickets`, evento `ticket.ready_for_service` |
| Triagem, contato, atendimento e aprovação | Help Desk → Zeev | conclusão da respectiva tarefa configurada pelo alias Zeev           |
| Aprovação interna pronta                  | Zeev → Help Desk | `POST /integrations/zeev/stages`, etapa `INTERNAL_APPROVAL`          |
| Avaliação do solicitante                  | Zeev → Help Desk | `POST /integrations/zeev/evaluations`                                |
| Revisão de desvio pronta                  | Zeev → Help Desk | `POST /integrations/zeev/stages`, etapa `DEVIATION_REVIEW`           |
| Decisão de desvio                         | Help Desk → Zeev | conclusão da tarefa `Verificar desvio`                               |

**Regras:**

1. O Help Desk não pode avançar uma tarefa Zeev antes de receber a etapa correspondente; uma etapa antiga não libera outro ciclo de resolução.
2. Nota até 6 reabre o ticket para o responsável anterior, preservando o ciclo já concluído e seus apontamentos.
3. A repetição de webhook ou ação não pode criar ticket, avaliação, apontamento ou conclusão duplicados.
4. A escolha de resultado na revisão de desvio é `VALIDAR`: os valores devem refletir exatamente as saídas configuradas no gateway `GE07`, não textos inferidos do diagrama.
5. **CONFIRMED:** a integração de entrada `ticket.ready_for_service` preserva `formFields` como lista `{ name, value, row }`. Todo callback que conclui tarefa humana reapresenta essa lista ao Zeev, pois a API revalida os campos obrigatórios do formulário em cada conclusão. O Help Desk não fabrica valores ausentes.

---

## 8. Navegação

| Origem                | Destino                              |
| --------------------- | ------------------------------------ |
| Sidebar — Integrações | `/gestec_help_desk/integracoes`      |
| + Adicionar           | `/gestec_help_desk/integracoes/nova` |
| Clique Nome           | `/gestec_help_desk/integracoes/[id]` |
| Voltar (04.1)         | Lista                                |

---

## 9. Critérios de aceite

- [ ] Rota `/gestec_help_desk/integracoes` — somente help desk
- [ ] Header, descrição e **+ Adicionar**
- [ ] Contador + campo **Pesquisar**
- [ ] Tabela: Tipo, Nome, Criado por, Modificado em, #
- [ ] Clique no nome abre configuração 04.1
- [ ] Excluir com confirmação
- [ ] Item sidebar **Integrações** ativo

---

## 10. Histórico de revisões

| Data       | Autor  | Alteração       |
| ---------- | ------ | --------------- |
| 2026-07-20 | Cursor | Criação inicial |
