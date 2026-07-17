import { describe, expect, it } from "vitest";
import { getMonthlyOrcadoTotals, getCategoryAmountsForMonth } from "./budgetMath";

describe("getMonthlyOrcadoTotals", () => {
  it("sums amounts per month and type, defaulting missing months to zero", () => {
    const lines = [
      { month: 1, type: "entrada" as const, category: "dizimo", amount: "9000.00" },
      { month: 1, type: "entrada" as const, category: "oferta", amount: "700.00" },
      { month: 1, type: "despesa" as const, category: "agua", amount: "80.00" },
      { month: 2, type: "entrada" as const, category: "dizimo", amount: "8500.00" },
    ];
    const result = getMonthlyOrcadoTotals(lines);
    expect(result[1]).toEqual({ entrada: 9700, despesa: 80 });
    expect(result[2]).toEqual({ entrada: 8500, despesa: 0 });
    expect(result[3]).toEqual({ entrada: 0, despesa: 0 });
    expect(result[12]).toEqual({ entrada: 0, despesa: 0 });
  });
});

describe("getCategoryAmountsForMonth", () => {
  it("returns a category -> amount map for the given month and type", () => {
    const lines = [
      { month: 1, type: "entrada" as const, category: "dizimo", amount: "9000.00" },
      { month: 1, type: "despesa" as const, category: "agua", amount: "80.00" },
      { month: 2, type: "entrada" as const, category: "oferta", amount: "700.00" },
    ];
    expect(getCategoryAmountsForMonth(lines, 1, "entrada")).toEqual({ dizimo: "9000.00" });
    expect(getCategoryAmountsForMonth(lines, 1, "despesa")).toEqual({ agua: "80.00" });
    expect(getCategoryAmountsForMonth(lines, 3, "entrada")).toEqual({});
  });
});
