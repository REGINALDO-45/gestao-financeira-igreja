import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => {
  return {
    getBudgetLinesByYear: vi.fn().mockResolvedValue([
      { id: 1, year: 2026, month: 1, type: "entrada", category: "dizimo", amount: "9000.00" },
    ]),
    upsertMonthBudgetLines: vi.fn().mockImplementation((input) =>
      Promise.resolve(
        input.lines.map((line: { category: string; amount: string }, i: number) => ({
          id: i + 1,
          year: input.year,
          month: input.month,
          type: input.type,
          category: line.category,
          amount: line.amount,
        }))
      )
    ),
  };
});

function createTreasurerContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "treasurer-user",
      email: "treasurer@church.com",
      name: "Treasurer User",
      loginMethod: "manus",
      role: "tesoureiro",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createViewerContext(): TrpcContext {
  return {
    user: {
      id: 3,
      openId: "viewer-user",
      email: "viewer@church.com",
      name: "Viewer User",
      loginMethod: "manus",
      role: "visualizador",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("budgetLines procedures", () => {
  it("any authenticated role can list budget lines by year", async () => {
    const caller = appRouter.createCaller(createViewerContext());
    const result = await caller.budgetLines.getByYear({ year: 2026 });
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("dizimo");
  });

  it("treasurer can upsert a month's budget lines", async () => {
    const caller = appRouter.createCaller(createTreasurerContext());
    const result = await caller.budgetLines.upsertMonth({
      year: 2026,
      month: 1,
      type: "entrada",
      lines: [{ category: "dizimo", amount: "9000.00" }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe("9000.00");
  });

  it("viewer cannot upsert budget lines", async () => {
    const caller = appRouter.createCaller(createViewerContext());
    await expect(
      caller.budgetLines.upsertMonth({
        year: 2026,
        month: 1,
        type: "entrada",
        lines: [{ category: "dizimo", amount: "9000.00" }],
      })
    ).rejects.toThrow();
  });
});
