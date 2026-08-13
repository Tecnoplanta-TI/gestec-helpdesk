# 01 — Gestec Desk (Inventário e Auditoria)

## Metadados

| Campo | Valor |
|-------|-------|
| **ID** | 01 |
| **Nome** | Gestec Desk — Inventário e Auditoria |
| **Status** | Rascunho |
| **Última atualização** | 2026-07-07 |
| **Referência Figma** | Pagina 1 — Gestec Desk |
| **Referência técnica** | `gestecDesk_panel-main` (desk panel) |

---

## 1. Objetivo

Tela **inicial** do módulo **Gestec Desk** — equivalente ao desk panel existente.

Permite:

1. **Visualizar cobertura de inventário** em calendário mensal (quais dias todas ou parte das estações reportaram inventário).
2. **Listar e buscar estações** com dados do agente Gestec Desk.
3. **Executar auditoria em massa** comparando inventários entre duas datas.

É a landing do item **Gestec Desk** na sidebar.

---

## 2. Acesso e permissões

| Perfil | Pode acessar? | Observações |
|--------|---------------|-------------|
| Usuário com `gestec_desk:view` | Sim | Visualiza calendário, estações e resultados |
| Usuário com `gestec_desk:edit` | Sim | Pode executar auditoria em massa |
| Sem permissão | Não | Acesso negado |

**Rota:** `/gestec-desk`

**Permissão Gestec:** `gestec_desk:view` · `gestec_desk:edit` (auditoria)

**Pré-condições:** Usuário autenticado via NextAuth

**Proteção:** `<ProtectedRoute module={Modules.GestecDesk} action={Actions.View}>`

**Breadcrumb:** `Início / Gestec Desk`

---

## 3. Layout e componentes

### 3.1 Estrutura visual

Layout padrão Gestec (sidebar + header + conteúdo). Grid **2×2**:

```
┌─────────────────────────────┬─────────────────────────────┐
│  Cobertura de inventário    │  Estações                   │
│  (calendário)               │  (tabela + busca)           │
├─────────────────────────────┼─────────────────────────────┤
│  Auditoria em Massa         │  (ignorar — vazio)          │
└─────────────────────────────┴─────────────────────────────┘
```

### 3.2 Header da página

| Elemento | Conteúdo |
|----------|----------|
| **Título** | Inventário e Auditoria |
| **Subtítulo** | Gestão de inventário de estações de trabalho e auditoria de conformidade em tempo real. |
| **Badge (canto superior direito)** | `Origem: COSMOS \| Estações visíveis: X` |

O badge reflete a origem dos dados (Cosmos DB) e o total de estações visíveis no sistema.

### 3.3 Componentes

| Componente | Tipo | Descrição | Comportamento |
|------------|------|-----------|---------------|
| Badge origem | Badge / pill | Origem + contagem de estações | `GET /api/v1/gestec-desk/health` |
| Card Cobertura | Card | Calendário mensal | Navegação ← → entre meses |
| Legenda calendário | Legenda | 4 cores de status | Verde, vermelho, cinza escuro, cinza claro |
| Card Estações | Card | Listagem de estações | Tabela + busca + Atualizar |
| Busca | Input search | Filtra estações | Placeholder: "Buscar por Hos..." |
| Tabela estações | DataTable | Hostname, Usuário, IP, Último Inventário | Clique na linha → modal detalhe (spec 01.1) |
| Checkbox linha | Checkbox | Seleção para auditoria | Não abre modal |
| Checkbox header | Checkbox | Selecionar todas (filtro atual) | — |
| Botão Atualizar | Button | Recarrega estações + calendário | — |
| Card Auditoria | Card | Período + ações | Igual ao desk panel |
| Data inicial / final | datetime-local | Intervalo da auditoria | Opcionais |
| Botão Executar | Button (primary) | Dispara auditoria em massa | POST bulk audit |
| Botão Visualizar | Button | Abre página de resultado | Spec 01.2 — desabilitado até executar |
| Botão Exportar JSON | Button | Download do resultado | Desabilitado até executar |
| Área resultado | Pre / textarea | Preview JSON | Após Executar |
| Card inferior direito | — | **Ignorar** | Não implementar nesta versão |

---

## 4. Campos e formulários

### 4.1 Calendário de cobertura

| Campo | Tipo | Valor padrão |
|-------|------|--------------|
| Mês exibido | navegação | Mês atual |

### 4.2 Tabela de estações

| Campo | Tipo | Observações |
|-------|------|-------------|
| Busca | text | Filtra hostname, usuário, IP |
| Checkbox | checkbox | Seleção para auditoria em massa |

### 4.3 Auditoria em massa

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| Data inicial | datetime-local | Não | `from ≤ to` se ambos preenchidos |
| Data final | datetime-local | Não | idem |

---

## 5. Ações do usuário

| Ação | Gatilho | Resultado | Feedback |
|------|---------|-----------|----------|
| Navegar mês | ← / → no calendário | Recarrega cobertura do mês | Loading |
| Buscar estação | Digitar na busca | Filtra tabela (client-side) | — |
| Atualizar | Botão "Atualizar" | Recarrega estações + calendário | Toast |
| Selecionar estação | Checkbox | Marca para auditoria em massa | — |
| Abrir detalhe | Clique na **linha** (não no checkbox) | Abre modal [01.1](01.1-gestec-desk.md) | — |
| Executar auditoria | Botão "Executar" | POST bulk; exibe JSON; habilita Visualizar/Exportar | Loading + JSON |
| Visualizar | Botão "Visualizar" | Navega para [01.2](01.2-gestec-desk.md) | Spec 01.2 |
| Exportar JSON | Botão "Exportar JSON" | Download `auditoria_massa_{timestamp}.json` | — |

---

## 6. Regras de negócio

### 6.1 Calendário — cores dos dias

Para cada dia do mês (dias úteis passados e hoje):

| Cor | Condição | Exemplo |
|-----|----------|---------|
| **Verde** | Todas as estações fizeram inventário naquele dia | 100/100 estações |
| **Vermelho** | Cobertura **parcial** — faltou ao menos 1 estação | 100/101 → vermelho |
| **Cinza claro** | Nenhuma estação rodou inventário naquele dia | 0 coletas |
| **Cinza escuro** | Final de semana ou feriado | Sáb/dom/feriado — sem verde/vermelho |

**Regras adicionais:**

1. **Total de estações** = conjunto único de hostnames com inventário no Cosmos.
2. Um dia conta como inventariado para uma estação se existir **≥ 1 registro** na data (YYYY-MM-DD).
3. Verde/vermelho aplicam-se a **dias passados e hoje**; dias futuros ficam neutros (cinza claro).
4. Fins de semana e feriados usam cinza escuro **mesmo com dados** — não exibem verde/vermelho.
5. Feriados: **TBD** (lista fixa BR ou cadastro futuro).

### 6.2 Tabela de estações

| Coluna | Descrição | Formato |
|--------|-----------|---------|
| Hostname | Nome da máquina | Texto |
| Usuário | Usuário logado no último inventário | Texto |
| IP | IPv4 atual | Texto |
| Último Inventário | Data/hora da última coleta | `dd/mm/aaaa, hh:mm` |

- Ordenação padrão: hostname ASC
- Limite sugerido: 500 estações (configurável, igual ao panel)
- Busca: hostname, usuário ou IP

### 6.3 Auditoria em massa (igual ao desk panel)

1. **Nenhuma estação selecionada** → audita **todas**.
2. **Com seleção via checkbox** → audita **apenas** as selecionadas.
3. Período `from`/`to` filtra snapshots no intervalo.
4. Compara snapshots consecutivos: hardware, usuário, IP, política de IP corporativo.
5. Severidade por estação: `low`, `medium`, `high`.
6. **Visualizar** e **Exportar JSON** desabilitados até primeira execução bem-sucedida.
7. **Visualizar** navega para página dedicada (spec 01.2); resultado via `sessionStorage` (`gestec-desk:last-bulk-audit`).

### 6.4 Card inferior direito

**Ignorar** — não exibir conteúdo nesta versão.

---

## 7. Integrações / API

**Fonte:** Azure Cosmos DB — container `desk.inventories` (database `gestec`).

Referência de implementação: `gestecDesk_panel-main/src/server.js`

| Operação | Método | Endpoint | Observações |
|----------|--------|----------|-------------|
| Health / status | GET | `/api/v1/gestec-desk/health` | Badge: origem + total estações |
| Cobertura mensal | GET | `/api/v1/gestec-desk/inventories/coverage?month=YYYY-MM` | Calendário |
| Breakdown do dia | GET | `/api/v1/gestec-desk/inventories/day?date=YYYY-MM-DD` | **TBD:** clique no dia |
| Listar estações | GET | `/api/v1/gestec-desk/stations` | Tabela |
| Auditoria em massa | POST | `/api/v1/gestec-desk/audit/bulk` | `{ hostnames?, from?, to? }` |

**Permissões API:**

| Endpoint | Permissão |
|----------|-----------|
| GET | `gestec_desk:view` |
| POST audit/bulk | `gestec_desk:edit` |

---

## 8. Estados da tela

| Estado | Quando | O que exibir |
|--------|--------|--------------|
| Carregando inicial | Ao abrir | Skeleton nos cards |
| Calendário carregando | Troca de mês | Spinner/skeleton no calendário |
| Sem estações | `totalStations === 0` | Calendário neutro; empty state na tabela |
| Tabela vazia (busca) | Filtro sem match | "Nenhuma estação encontrada" |
| Auditoria executando | Clique Executar | Loading no botão |
| Auditoria pronta | Execução OK | JSON visível; Visualizar/Exportar habilitados |
| Erro API | Falha | Toast (Sonner) |

---

## 9. Navegação

| Origem | Destino | Como |
|--------|---------|------|
| Sidebar → Gestec Desk | `/gestec-desk` | Landing do módulo |
| Clique em estação | Modal Detalhe | [01.1](01.1-gestec-desk.md) |
| Botão Visualizar | Página resultado auditoria | [01.2](01.2-gestec-desk.md) |
| Breadcrumb Início | Dashboard Gestec | Link |

---

## 10. Critérios de aceite

- [ ] Página em `/gestec-desk` com layout Gestec (sidebar, header, breadcrumb)
- [ ] Título, subtítulo e badge `Origem: COSMOS | Estações visíveis: X` visíveis
- [ ] Calendário com legenda e cores corretas (verde, vermelho, cinza claro, cinza escuro)
- [ ] Parcial (ex.: 100/101) exibe **vermelho**
- [ ] Fins de semana/feriados em cinza escuro
- [ ] Tabela com hostname, usuário, IP e último inventário (pt-BR)
- [ ] Busca, checkbox, Atualizar funcionam
- [ ] Clique na linha abre modal [01.1](01.1-gestec-desk.md); checkbox não abre
- [ ] Auditoria em massa igual ao panel: Executar, Visualizar, Exportar JSON
- [ ] Card inferior direito ausente ou vazio (ignorado)
- [ ] Permissões `gestec_desk:view` / `gestec_desk:edit` respeitadas

---

## 11. Observações e pendências

- **Spec [01.1](01.1-gestec-desk.md)** — Modal Detalhe da Estação
- **Spec [01.1.1](01.1.1-gestec-desk.md)** — Aplicativos instalados
- **Spec 01.1.2** — Histórico (pendente)
- **Spec [01.2](01.2-gestec-desk.md)** — Resultado da Auditoria em Massa
- **Feriados** — origem dos dados a definir
- **Clique no dia do calendário** — **TBD** (panel abre modal de breakdown)

---

## 12. Histórico de revisões

| Data | Autor | Alteração |
|------|-------|-----------|
| 2026-07-07 | Cursor | Criação inicial |
