# Redesign de UI — Dashboard, Lançamentos e Mobile

**Data:** 2026-07-04
**Status:** Aprovado (design) — pronto para plano de implementação
**Escopo:** Camada de UI apenas (`client/src`). Sem mudanças de backend, schema ou API.

---

## Contexto

O sistema de gestão financeira da Igreja Metodista Monte Alegre recebeu referências
visuais (dashboard, tela de lançamentos e telas mobile) com um layout mais moderno.
O objetivo é aplicar a **estrutura** dessas referências mantendo a **paleta atual
navy + vermelho** (cores metodistas), sem alterar dados nem regras de negócio.

**Princípios:**
- Paleta navy + vermelho preservada (nada de roxo das referências).
- Nenhuma mudança em `server/`, `shared/`, schema Drizzle ou rotas tRPC.
- Reaproveitar componentes shadcn/ui e recharts já presentes.
- Trabalho isolado por frente para permitir revisão incremental.

---

## Frente 1 — Dashboard (`client/src/pages/Dashboard.tsx`)

### 1.1 Cards KPI
- Mantêm o gradiente de accent no canto + ícone colorido já existentes.
- O 4º card, hoje **"Lançamentos"**, passa a ser **"Meta · Reforma"**:
  - Valor arrecadado atual + barra de progresso (`%` da meta anual).
  - Usa `trpc.annualBudgets.getByYear` (já consumido na página).
  - Se não houver meta cadastrada no ano, o card faz fallback para o card
    "Lançamentos" atual (contagem de entradas + saídas). Sem meta → sem card quebrado.

### 1.2 Gráfico "Movimentação · entradas vs saídas"
- Substitui o `AreaChart` atual por `BarChart` (recharts) com **barras agrupadas**
  entrada (verde `#10b981`) e saída (cinza `#cbd5e1`) por período.
- **Mantém** o toggle Mensal/Semanal já existente (`chartView` state) e as fontes
  `monthlyData` / `weeklyData` sem alteração de cálculo.

### 1.3 Donut "Entradas por categoria"
- Mantém o `PieChart` de entradas, mas move os rótulos das fatias para uma
  **legenda lateral**: cada categoria com bolinha colorida, nome e valor em R$.
- Cores mantêm a regra atual (`getCategoryColor`, verde fixo para DIZIMO).

### 1.4 Novo gráfico "Saídas por categoria" (% das entradas)
- **Novo componente** na segunda seção de cards.
- Barras horizontais, uma por categoria de despesa (usa `expenseCategoryData` já
  calculado). Cada linha mostra: nome, valor em R$ e **percentual sobre o total de
  entradas do mês** (`totalEntries` = 100%).
- Largura da barra proporcional ao percentual; cor por categoria (`EXPENSE_COLORS`).
- Rodapé com linha "Total de saídas" e sua % sobre as entradas.
- Se `totalEntries === 0`, exibe estado vazio (evita divisão por zero).

### 1.5 Seção "Movimentação recente"
- **Nova seção** no rodapé do dashboard.
- Mescla entradas e saídas do período, ordena por data desc, mostra os N mais
  recentes (ex.: 5) com descrição, categoria, data e valor colorido (verde/vermelho).
- Link "Ver todos" → navega para `/entries` (ou `/expenses`).

### 1.6 Isolamento
- Extrair os blocos novos (Saídas por categoria, Movimentação recente) em
  componentes próprios em `client/src/components/dashboard/` para manter
  `Dashboard.tsx` legível. Cada um recebe seus dados por props e é testável isolado.

---

## Frente 2 — Entradas e Saídas (`Entries.tsx`, `Expenses.tsx`)

Mantêm-se **duas páginas separadas** (decisão do usuário). Aplica-se o visual novo.

### 2.1 Tabela restilizada
- Cada linha ganha um **ícone colorido por categoria** (círculo arredondado com
  cor de fundo suave + ícone), à esquerda da descrição.
- **Valores coloridos**: entradas em verde, saídas em vermelho.
- Chips de filtro restilizados (pílulas), reaproveitando os filtros atuais.

### 2.2 Busca (novo)
- Campo de busca no cabeçalho, filtra por descrição e por nome do membro
  (client-side, sobre os dados já carregados). Sem chamada nova de API.

### 2.3 Exportar CSV (novo)
- Botão "Exportar" no cabeçalho gera um CSV dos registros **atualmente filtrados**
  (respeita busca + filtros ativos) e dispara download no browser.
- Utilitário compartilhado em `client/src/lib/exportCsv.ts` (usado pelas duas telas).
- Colunas: Data, Categoria, Descrição, Membro, Forma de pagamento, Valor.

### 2.4 Isolamento
- Se a tabela restilizada ficar repetida entre as duas páginas, extrair um
  componente comum (ex.: `TransactionTable`) parametrizado por tipo. Só extrair se
  a duplicação for real — não criar abstração especulativa.

---

## Frente 3 — Mobile

### 3.1 Navegação — menu inferior
- **Novo componente** `BottomNav` visível apenas no mobile (`useIsMobile`).
- Abas: **Início** (`/dashboard`), **Lançamentos** (`/entries`), **+** (FAB central),
  **Relatórios** (`/reports`), **Perfil**.
- FAB central "+" abre um **action sheet** (menu de escolha): "Nova Entrada" /
  "Nova Saída".
- Páginas secundárias (Membros, Centros de Custo, Orçamento Anual, Recibos,
  Configurações) acessíveis pelo item **Perfil** (lista de atalhos) ou um menu "Mais".
- **Desktop permanece com o menu lateral atual, sem mudança.** A troca é feita em
  `DashboardLayout.tsx` por `useIsMobile`: mobile esconde a sidebar e mostra
  `BottomNav`; desktop mantém a `Sidebar`.

### 3.2 Formulário de novo lançamento em tela cheia
- No mobile, "Nova Entrada"/"Nova Saída" abre o formulário em **tela cheia** (Dialog
  full-screen ou rota dedicada), não o dialog compacto atual.
- Layout: valor grande no topo, chips de categoria, campos Data/Forma lado a lado,
  botão "Salvar lançamento" com gradiente navy→vermelho.
- Reaproveita a lógica de `EntryForm` / `ExpenseForm` (mesma mutation, mesmos
  campos); muda só a apresentação. Extrair a apresentação mobile sem duplicar a
  lógica de submit/validação.
- No desktop, os formulários continuam no dialog atual.

### 3.3 Dashboard mobile
- Card de **saldo com gradiente navy** + sub-cards Entradas/Saídas embutidos.
- Gráficos em versão compacta (barras e donut menores), reaproveitando os mesmos
  componentes recharts com dimensões responsivas.

---

## Fora de escopo (YAGNI)
- Mudança de paleta de cores.
- Alterações em backend, schema, endpoints tRPC.
- Exportação server-side / PDF (só CSV client-side).
- Refatorações não relacionadas ao redesign.

---

## Faseamento (revisão ao fim de cada fase)
1. **Fase 1 — Dashboard**: cards (Meta), barras, donut com legenda, saídas por
   categoria, movimentação recente.
2. **Fase 2 — Entradas/Saídas**: tabela restilizada, busca, exportar CSV.
3. **Fase 3 — Mobile**: bottom nav + FAB, formulário full-screen, dashboard mobile.

Cada fase é entregável e revisável de forma independente.

---

## Arquivos afetados (previsão)
- `client/src/pages/Dashboard.tsx` (modificar)
- `client/src/components/dashboard/*` (novos: SaidasPorCategoria, MovimentacaoRecente, etc.)
- `client/src/pages/Entries.tsx`, `client/src/pages/Expenses.tsx` (modificar)
- `client/src/lib/exportCsv.ts` (novo)
- `client/src/components/DashboardLayout.tsx` (modificar — troca sidebar/bottom-nav)
- `client/src/components/BottomNav.tsx` (novo)
- Formulários mobile full-screen (novos wrappers de `EntryForm`/`ExpenseForm`)

Nenhum arquivo em `server/`, `shared/` ou `drizzle/`.
