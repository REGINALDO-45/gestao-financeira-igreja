# Orçamento mensal por categoria — Design

## Contexto

A página "Orçamento Anual" (`client/src/pages/AnnualBudget.tsx`) hoje usa uma única meta
mensal fixa (`monthlyEntriesGoal` / `monthlyExpensesGoal` na tabela `annual_budgets`),
repetida igualmente nos 12 meses do ano, para comparar contra o realizado.

O usuário forneceu a planilha de orçamento anual da igreja (Excel, uma aba por mês) como
referência. Nela, cada mês tem seu próprio valor orçado por linha de receita/despesa, e o
total do mês é a soma dessas linhas. Uma aba anual ("GRAFICO ANUAL.") consolida a meta
orçada de entradas e saídas mês a mês, variando de mês para mês (ex: Jan R$ 13.259,80,
Fev R$ 11.900,00, ...).

O objetivo desta feature é levar essa mesma lógica para o sistema: cada mês tem seu próprio
orçamento, detalhado por categoria (reaproveitando as categorias já usadas em Entradas e
Despesas), com o total mensal derivado da soma das categorias — permitindo comparar
automaticamente orçado x realizado por categoria e por mês.

## Decisões (confirmadas com o usuário)

- **Granularidade**: orçamento por categoria dentro de cada mês (não só um total mensal).
- **Categorias**: reaproveitar os enums já existentes (`entryCategoryEnum`,
  `expenseCategoryEnum`), para permitir comparação automática com o realizado a partir dos
  lançamentos de Entradas/Despesas já cadastrados. Não serão criadas categorias livres.
- **Edição**: um mês por vez (seletor de mês, como as abas da planilha), não uma matriz
  única com os 12 meses e todas as categorias visíveis ao mesmo tempo.
- **Migração**: o usuário já salvou metas mensais na tela atual (para 2026) — os valores
  existentes precisam ser preservados, não descartados.

## Modelo de dados

### Nova tabela `budget_lines`

```
id            serial primary key
year          integer not null
month         integer not null (1-12)
type          varchar/enum: 'entrada' | 'despesa'
category      varchar(50) not null   -- valor do entryCategoryEnum ou expenseCategoryEnum,
                                       -- conforme o `type`
amount        decimal(10,2) not null default 0
createdAt     timestamp default now()
updatedAt     timestamp default now() on update
unique (year, month, type, category)
```

Motivo de não usar uma FK direta para um enum compartilhado: `entryCategoryEnum` e
`expenseCategoryEnum` são dois enums distintos no schema atual; a coluna `category` fica
como texto validado na camada de aplicação (tRPC/zod), igual ao padrão já usado em
`recurringExpenses.category`.

O total orçado de um mês/tipo é `SUM(amount)` agrupado por `(year, month, type)` — não é
mais armazenado como campo solto. Isso espelha a planilha, onde o total de cada mês é uma
fórmula de soma das linhas acima.

### Tabela `annual_budgets`

Removida (`monthlyEntriesGoal` e `monthlyExpensesGoal` deixam de existir). A UI e o router
que a usam hoje (`server/routers/annualBudgets.ts`, `server/db/annualBudgets.ts`) são
substituídos pelos equivalentes para `budget_lines`.

### Migração de dados existentes

O usuário confirmou que já salvou metas mensais em `annual_budgets` para o ano corrente.
Antes de dropar a tabela, uma migração de dados (script SQL, não apenas DDL) deve:

1. Para cada linha existente em `annual_budgets` (um valor por ano, já que a meta mensal é
   fixa e igual em todos os meses):
   - Para cada mês (1 a 12), inserir em `budget_lines` uma linha
     `(year, month, 'entrada', 'outras_receitas', monthlyEntriesGoal)`.
   - Para cada mês (1 a 12), inserir em `budget_lines` uma linha
     `(year, month, 'despesa', 'outras_despesas', monthlyExpensesGoal)`.
2. Isso preserva o total orçado mensal que já existia, como ponto de partida editável —
   não é uma alocação real por categoria (o usuário poderá redistribuir depois).

Como a `DATABASE_URL` da aplicação roda com uma role sem permissão de DDL (ver memória do
projeto), a migração de schema (`drizzle/000X_*.sql`) precisa ser aplicada via Supabase MCP
(`apply_migration`) ou manualmente pelo usuário no SQL editor do Supabase — isso será feito
como um passo explícito no plano de implementação, não silenciosamente.

## Backend (tRPC)

Novo router `budgetLines` (substitui `annualBudgets`):

- `budgetLines.getByYear({ year }) -> BudgetLine[]`
  Retorna todas as linhas do ano (todos os meses/tipos/categorias já salvos).
- `budgetLines.upsertMonth({ year, month, type, lines: [{ category, amount }] })`
  Upsert em lote de todas as categorias de um mês/tipo de uma vez (uma transação),
  restrito a `tesoureiro`/`admin` (mesmo controle de acesso da tela atual via
  `isTreasurer`).

O cálculo do realizado por mês/categoria continua vindo de `entries`/`expenses` via
`listByDateRange`, como hoje — sem mudança nos routers existentes desses módulos.

## Frontend — `client/src/pages/AnnualBudget.tsx`

1. **Seletor de ano** — mantém o campo numérico atual.
2. **Seletor de mês** — linha de 12 botões (Jan–Dez), como as abas de mês da planilha.
   Selecionar um mês carrega o formulário de orçamento daquele mês.
3. **Formulário do mês selecionado** — duas colunas:
   - "Entradas": uma linha por categoria de `entryCategoryEnum`, com label em português
     (reaproveitando o mapeamento já usado no Dashboard/forms) e campo numérico para o
     valor orçado. Total do bloco (soma automática, somente leitura) ao final.
   - "Despesas": mesmo padrão com `expenseCategoryEnum`.
   - Botão "Salvar" (visível apenas para tesoureiro/admin) chama
     `budgetLines.upsertMonth` duas vezes (entrada e despesa) ou uma vez por bloco.
4. **Tabela resumo anual** — mantém o formato atual (uma linha por mês: Entradas
   Realizado / Orçado / %, Despesas Realizado / Orçado / %, linha de TOTAL do ano), mas o
   "Orçado" de cada mês passa a ser a soma das categorias daquele mês/tipo em
   `budget_lines`, em vez do valor fixo antigo.

## Fora de escopo

- Categorias livres/texto arbitrário (tipo "Mesa de Som", "Subsídio Pastoral") — a planilha
  usa isso, mas o sistema não tem esse dado estruturado hoje; ficou de fora por decisão do
  usuário.
- Centro de custo no orçamento (a planilha não amarra orçamento a centro de custo; o
  sistema já tem `costCenters` mas essa dimensão não entra neste orçamento).
- Saldo acumulado / "saldo transportado do ano anterior" (linhas 9, 71-82 da planilha) —
  não faz parte do pedido do usuário, que foi especificamente sobre "cada mês ter seu
  orçamento".
