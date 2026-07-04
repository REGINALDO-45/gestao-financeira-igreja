export interface CategoryAmount {
  name: string;
  value: number;
}

export interface ExpenseShareItem {
  name: string;
  value: number;
  pct: number;
}

export interface ExpenseShareResult {
  items: ExpenseShareItem[];
  totalExpenses: number;
  totalPct: number;
}

export function calculateExpenseSharePct(
  expenseCategoryData: CategoryAmount[],
  totalEntries: number
): ExpenseShareResult {
  if (totalEntries <= 0) {
    return { items: [], totalExpenses: 0, totalPct: 0 };
  }

  const items = expenseCategoryData
    .map((category) => ({
      name: category.name,
      value: category.value,
      pct: (category.value / totalEntries) * 100,
    }))
    .sort((a, b) => b.value - a.value);

  const totalExpenses = expenseCategoryData.reduce((sum, category) => sum + category.value, 0);
  const totalPct = (totalExpenses / totalEntries) * 100;

  return { items, totalExpenses, totalPct };
}

export interface Movement {
  id: string;
  description: string;
  date: Date;
  amount: number;
  type: "entrada" | "saida";
}

interface EntryLike {
  id: number;
  description?: string | null;
  category: string;
  entryDate: string | Date;
  amount: string;
}

interface ExpenseLike {
  id: number;
  description?: string | null;
  category: string;
  expenseDate: string | Date;
  amount: string;
}

export function buildRecentMovements(
  entries: EntryLike[],
  expenses: ExpenseLike[],
  limit: number
): Movement[] {
  const fromEntries: Movement[] = entries.map((entry) => ({
    id: `entry-${entry.id}`,
    description: entry.description?.trim() || entry.category.replace(/_/g, " "),
    date: new Date(entry.entryDate),
    amount: parseFloat(entry.amount),
    type: "entrada",
  }));

  const fromExpenses: Movement[] = expenses.map((expense) => ({
    id: `expense-${expense.id}`,
    description: expense.description?.trim() || expense.category.replace(/_/g, " "),
    date: new Date(expense.expenseDate),
    amount: parseFloat(expense.amount),
    type: "saida",
  }));

  return [...fromEntries, ...fromExpenses]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit);
}

export type GoalCardData =
  | {
      kind: "goal";
      label: string;
      currentValue: number;
      goalValue: number;
      pct: number;
    }
  | {
      kind: "count";
      entriesCount: number;
      expensesCount: number;
    };

export function getGoalCardData(
  monthlyEntriesGoal: number,
  totalEntries: number,
  entriesCount: number,
  expensesCount: number
): GoalCardData {
  if (monthlyEntriesGoal > 0) {
    return {
      kind: "goal",
      label: "Meta de Entradas",
      currentValue: totalEntries,
      goalValue: monthlyEntriesGoal,
      pct: (totalEntries / monthlyEntriesGoal) * 100,
    };
  }
  return { kind: "count", entriesCount, expensesCount };
}
