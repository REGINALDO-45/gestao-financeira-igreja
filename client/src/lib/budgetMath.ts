export interface BudgetLineLike {
  month: number;
  type: "entrada" | "despesa";
  category: string;
  amount: string;
}

export function getMonthlyOrcadoTotals(
  lines: BudgetLineLike[]
): Record<number, { entrada: number; despesa: number }> {
  const totals: Record<number, { entrada: number; despesa: number }> = {};
  for (let month = 1; month <= 12; month++) {
    totals[month] = { entrada: 0, despesa: 0 };
  }

  for (const line of lines) {
    const cents = Math.round(parseFloat(line.amount) * 100);
    totals[line.month][line.type] += cents;
  }

  for (let month = 1; month <= 12; month++) {
    totals[month].entrada = totals[month].entrada / 100;
    totals[month].despesa = totals[month].despesa / 100;
  }

  return totals;
}

export function getCategoryAmountsForMonth(
  lines: BudgetLineLike[],
  month: number,
  type: "entrada" | "despesa"
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of lines) {
    if (line.month === month && line.type === type) {
      result[line.category] = line.amount;
    }
  }
  return result;
}

export function getCustomLines(
  amounts: Record<string, string>,
  fixedCategories: string[]
): { category: string; amount: string }[] {
  return Object.entries(amounts)
    .filter(([category]) => !fixedCategories.includes(category))
    .map(([category, amount]) => ({ category, amount }));
}
