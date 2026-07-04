import { describe, expect, it } from "vitest";
import {
  calculateExpenseSharePct,
  buildRecentMovements,
  getGoalCardData,
} from "./dashboardMath";

describe("calculateExpenseSharePct", () => {
  it("computes each category's percentage of total entries, sorted by value desc", () => {
    const result = calculateExpenseSharePct(
      [
        { name: "Energia", value: 340 },
        { name: "Salário", value: 2800 },
      ],
      18400
    );
    expect(result.items[0]).toEqual({ name: "Salário", value: 2800, pct: (2800 / 18400) * 100 });
    expect(result.items[1]).toEqual({ name: "Energia", value: 340, pct: (340 / 18400) * 100 });
    expect(result.totalExpenses).toBe(3140);
    expect(result.totalPct).toBeCloseTo((3140 / 18400) * 100);
  });

  it("returns an empty result when total entries is zero to avoid dividing by zero", () => {
    const result = calculateExpenseSharePct([{ name: "Energia", value: 340 }], 0);
    expect(result).toEqual({ items: [], totalExpenses: 0, totalPct: 0 });
  });
});

describe("buildRecentMovements", () => {
  it("merges entries and expenses, sorts by date desc, and limits the result", () => {
    const entries = [
      { id: 1, description: "João Silva", category: "dizimo", entryDate: "2026-06-04", amount: "500" },
    ];
    const expenses = [
      { id: 1, description: "", category: "energia", expenseDate: "2026-06-03", amount: "340" },
      { id: 2, description: "", category: "manutencao", expenseDate: "2026-06-05", amount: "1340" },
    ];
    const result = buildRecentMovements(entries, expenses, 2);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "expense-2", type: "saida", amount: 1340, description: "manutencao" });
    expect(result[1]).toMatchObject({ id: "entry-1", type: "entrada", amount: 500, description: "João Silva" });
  });
});

describe("getGoalCardData", () => {
  it("returns goal progress when a monthly entries goal is set", () => {
    const result = getGoalCardData(30000, 18400, 12, 8);
    expect(result).toEqual({
      kind: "goal",
      label: "Meta de Entradas",
      currentValue: 18400,
      goalValue: 30000,
      pct: (18400 / 30000) * 100,
    });
  });

  it("falls back to a lançamentos count when there is no goal", () => {
    const result = getGoalCardData(0, 18400, 12, 8);
    expect(result).toEqual({ kind: "count", entriesCount: 12, expensesCount: 8 });
  });
});
