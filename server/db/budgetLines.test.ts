import { beforeEach, describe, expect, it } from "vitest";
import { getBudgetLinesByYear, upsertMonthBudgetLines } from "./budgetLines";
import { memoryStore } from "./core";

beforeEach(() => {
  memoryStore.budgetLines = [];
});

describe("upsertMonthBudgetLines", () => {
  it("creates new lines for a month/type, including a custom free-text category", async () => {
    const result = await upsertMonthBudgetLines({
      year: 2026,
      month: 1,
      type: "despesa",
      lines: [
        { category: "agua", amount: "80.00" },
        { category: "Subsídio Pastoral", amount: "4000.00" },
      ],
    });
    expect(result).toHaveLength(2);
    const stored = await getBudgetLinesByYear(2026);
    expect(stored).toHaveLength(2);
  });

  it("removes a line that is renamed to a different category on a later save", async () => {
    await upsertMonthBudgetLines({
      year: 2026,
      month: 1,
      type: "despesa",
      lines: [
        { category: "agua", amount: "80.00" },
        { category: "Subsídio Pastoral", amount: "4000.00" },
      ],
    });

    await upsertMonthBudgetLines({
      year: 2026,
      month: 1,
      type: "despesa",
      lines: [
        { category: "agua", amount: "80.00" },
        { category: "Subsídio Pastoral 2", amount: "4200.00" },
      ],
    });

    const stored = await getBudgetLinesByYear(2026);
    const categories = stored.map((b) => b.category).sort();
    expect(categories).toEqual(["Subsídio Pastoral 2", "agua"]);
  });

  it("does not affect other months or types when replacing one month's lines, and never produces duplicate ids", async () => {
    await upsertMonthBudgetLines({
      year: 2026,
      month: 1,
      type: "despesa",
      lines: [{ category: "agua", amount: "80.00" }],
    });
    await upsertMonthBudgetLines({
      year: 2026,
      month: 2,
      type: "despesa",
      lines: [{ category: "energia", amount: "100.00" }],
    });
    await upsertMonthBudgetLines({
      year: 2026,
      month: 1,
      type: "entrada",
      lines: [{ category: "dizimo", amount: "9000.00" }],
    });

    // Replace month 1 despesa's only line with a brand new custom line.
    await upsertMonthBudgetLines({
      year: 2026,
      month: 1,
      type: "despesa",
      lines: [{ category: "Novo Item", amount: "50.00" }],
    });

    const stored = await getBudgetLinesByYear(2026);
    expect(stored).toHaveLength(3);
    expect(stored.find((b) => b.month === 1 && b.type === "despesa")?.category).toBe("Novo Item");
    expect(stored.find((b) => b.month === 2)?.category).toBe("energia");
    expect(stored.find((b) => b.type === "entrada")?.category).toBe("dizimo");

    const ids = stored.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("removes all lines for a month/type when saved with an empty array", async () => {
    await upsertMonthBudgetLines({
      year: 2026,
      month: 1,
      type: "despesa",
      lines: [{ category: "agua", amount: "80.00" }],
    });
    await upsertMonthBudgetLines({
      year: 2026,
      month: 1,
      type: "despesa",
      lines: [],
    });
    const stored = await getBudgetLinesByYear(2026);
    expect(stored).toHaveLength(0);
  });
});
