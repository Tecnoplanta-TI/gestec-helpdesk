# [NN] — [Nome da Tela]

## Metadados

| Campo | Valor |
|-------|-------|
| **ID** | NN |
| **Nome** | [Nome da Tela] |
| **Status** | Rascunho / Em revisão / Aprovada |
| **Última atualização** | YYYY-MM-DD |
| **Referência Figma** | [link ou nome do frame] |

---

## 1. Objetivo

Descrever em 1–3 frases o que o usuário consegue fazer nesta tela e por quê ela existe.

---

## 2. Acesso e permissões

| Perfil | Pode acessar? | Observações |
|--------|---------------|-------------|
| — | Sim / Não | — |

**Rota sugerida:** `/gestec_help_desk/...` (Help Desk) ou `/gestec-desk/...` (Desk) — kebab-case ou snake conforme DEC do módulo

**Permissão Gestec:** `modulo:acao` (ex.: `gestec_help_desk:view`) — ver [referencia-gestec.md](../docs/referencia-gestec.md)

**Referência de implementação:** indicar página/componente Gestec similar (ex.: `src/app/cadastros/permissoes/page.tsx`)

**Pré-condições:** (ex.: usuário autenticado via NextAuth, permissão X)

**Componente de proteção:** `<ProtectedRoute module={Modules.X} action={Actions.View}>`

---

## 3. Layout e componentes

### 3.1 Estrutura visual

Descrever regiões da tela (header, sidebar, conteúdo principal, modais, etc.) com base no mockup.

### 3.2 Componentes

| Componente | Tipo | Descrição | Comportamento |
|------------|------|-----------|---------------|
| — | Input / Botão / Tabela / etc. | — | — |

---

## 4. Campos e formulários

| Campo | Tipo | Obrigatório | Validação | Valor padrão | Observações |
|-------|------|-------------|-----------|--------------|-------------|
| — | text / select / date / etc. | Sim / Não | — | — | — |

---

## 5. Ações do usuário

| Ação | Gatilho | Resultado esperado | Feedback ao usuário |
|------|---------|-------------------|---------------------|
| — | Clique em "Salvar" | — | Toast / redirect / modal |

---

## 6. Regras de negócio

1. —
2. —

---

## 7. Integrações / API

| Operação | Método | Endpoint | Payload / Response | Observações |
|----------|--------|----------|-------------------|-------------|
| — | GET / POST / etc. | — | — | — |

> Se a integração ainda não estiver definida, marcar como **TBD** e listar o que precisa ser decidido.

---

## 8. Estados da tela

| Estado | Quando ocorre | O que exibir |
|--------|---------------|--------------|
| Carregando | Ao abrir / ao salvar | Skeleton / spinner |
| Vazio | Sem dados | Empty state com CTA |
| Erro | Falha de API / validação | Mensagem + ação de retry |
| Sucesso | Após ação concluída | — |

---

## 9. Navegação

| Origem | Destino | Como |
|--------|---------|------|
| — | — | Link / botão / redirect automático |

---

## 10. Critérios de aceite

- [ ] —
- [ ] —
- [ ] —

---

## 11. Observações e pendências

- —
- **TBD:** —

---

## 12. Histórico de revisões

| Data | Autor | Alteração |
|------|-------|-----------|
| YYYY-MM-DD | — | Criação inicial |
