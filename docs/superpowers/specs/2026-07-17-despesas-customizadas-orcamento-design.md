# Despesas Customizadas no Orçamento Mensal — Design

## Contexto

O Orçamento Mensal por Categoria (`client/src/pages/AnnualBudget.tsx`, tabela `budget_lines`)
hoje só permite orçar as 11 categorias fixas de despesa já usadas em Saídas (`Água`,
`Energia`, `Internet`, `Aluguel`, `Material de Limpeza`, `Evangelismo`, `Missões`,
`Construção`, `Equipamentos`, `Manutenção`, `Outras Despesas`).

A planilha original da igreja tinha linhas de despesa com descrição livre (ex: "Subsídio
Pastoral", "Mesa de Som", "APLICATIVO IN CHURCH") que não mapeiam para nenhuma categoria
fixa do sistema. O usuário quer poder adicionar e editar esse tipo de linha diretamente no
orçamento mensal, além das 11 categorias fixas.

## Decisões (confirmadas com o usuário)

- Escopo: **só Despesas**. Entradas continuam só com as categorias fixas.
- As 11 categorias fixas de despesa continuam existindo do jeito que estão (ligadas ao
  realizado real de Saídas).
- Linhas customizadas são **adicionais** às fixas, não uma substituição.
- Sem mudança de schema: uma linha customizada é uma linha comum de `budget_lines`
  (`type='despesa'`) cuja `category` é o texto livre digitado pelo usuário, em vez de um dos
  11 slugs fixos. Como `category` já é `varchar(50)` sem enum no banco, isso não exige
  migração.

## Comportamento

### Realizado

Uma linha customizada não tem "realizado" automático — seu `category` (texto livre) não
bate com nenhum `expenseCategoryEnum` real, então nenhuma despesa lançada em Saídas jamais
vai casar com ela. Ela soma apenas no **orçado** do mês (via `getMonthlyOrcadoTotals`, que já
soma por `(year, month, type)` sem filtrar por categoria — nenhuma mudança necessária nessa
função). Isso espelha a planilha original, onde linhas ad hoc não têm coluna de realizado
vinculada a lançamentos reais.

### Renomear e remover

Editar a descrição de uma linha customizada ou remover uma linha exige apagar a linha antiga
no banco (já que `category` é parte da chave de unicidade `(year, month, type, category)`).
Para viabilizar isso sem endpoints novos, o comportamento de `budgetLines.upsertMonth` muda de
"upsert das linhas enviadas" para **substituição completa do conjunto**: o estado final de
`(year, month, type)` passa a ser exatamente o que foi enviado no `lines[]` — qualquer linha
existente no banco para aquele mês/tipo que não estiver no array enviado é apagada.

Isso não muda o comportamento visível para as categorias fixas (a tela sempre envia as 11
categorias fixas em todo salvamento, então elas nunca são removidas por acidente) e permite:
- **Renomear** uma linha customizada: a tela troca a entrada antiga pela nova no array antes
  de salvar; a antiga desaparece do banco, a nova aparece.
- **Remover** uma linha customizada: a tela simplesmente não a inclui mais no array enviado.
- **Adicionar** uma linha nova: incluída no array com uma `category` (descrição) ainda não
  usada naquele mês.

### Validação

- Descrição: texto livre, obrigatório para salvar uma linha customizada (linha em branco é
  ignorada/não enviada), máximo 50 caracteres (limite da coluna `category` no banco).
- Duas linhas customizadas com a mesma descrição no mesmo mês não são permitidas (colidiriam
  na chave de unicidade) — a tela impede duplicatas antes de salvar, mostrando um aviso.
- Valor: mesmo campo numérico já usado nas categorias fixas.

## Backend

`server/routers/budgetLines.ts` — `upsertMonth` passa a exigir uma transação que:
1. Apaga de `budget_lines` toda linha de `(year, month, type)` cuja `category` não esteja no
   array `lines[]` recebido.
2. Faz upsert (como já faz hoje) de cada item de `lines[]`.

`server/db/budgetLines.ts` — `upsertMonthBudgetLines` implementa esse delete-então-upsert.

## Frontend — `client/src/pages/AnnualBudget.tsx`

Abaixo da lista das 11 categorias fixas de despesa, nova seção **"Despesas Adicionais"**:

- Uma linha por item customizado do mês selecionado (carregado a partir das linhas de
  `budget_lines` daquele mês/tipo cuja `category` não está na lista fixa de 11): campo de
  texto (descrição, editável) + campo numérico (valor) + botão de remover.
- Botão **"+ Adicionar despesa"**: adiciona uma linha em branco à lista, para o usuário
  preencher descrição e valor.
- O botão "Salvar Orçamento de {Mês}" existente passa a incluir, no array `lines[]` enviado
  para `despesa`, tanto as 11 categorias fixas quanto as linhas customizadas preenchidas
  (linhas em branco — sem descrição — são ignoradas e não enviadas).
- "Total Despesas" do mês já soma tudo automaticamente (soma genérica sobre o mapa de
  valores), sem mudança necessária ali.

## Fora de escopo

- O mesmo recurso para Entradas — decisão explícita do usuário de manter só em Despesas.
- Vincular linhas customizadas a centro de custo.
- Qualquer forma de "realizado" automático para linhas customizadas.
