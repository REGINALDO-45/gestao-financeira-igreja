import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => {
  return {
    getAllExpenses: vi.fn().mockResolvedValue([]),
    createExpense: vi.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
  };
});

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@church.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

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
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("expenses procedures", () => {
  it("admin can list expenses", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.expenses.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("treasurer can list expenses", async () => {
    const ctx = createTreasurerContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.expenses.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can create expense", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.expenses.create({
      expenseDate: new Date(),
      category: "agua",
      amount: "500.00",
      paymentMethod: "pix",
      description: "Test expense",
      supplier: "Test Supplier",
      costCenterId: undefined,
      paymentStatus: "pendente",
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.category).toBe("agua");
    expect(result.amount).toBe("500.00");
  });

  it("treasurer can create expense", async () => {
    const ctx = createTreasurerContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.expenses.create({
      expenseDate: new Date(),
      category: "energia",
      amount: "250.00",
      paymentMethod: "transferencia",
      description: "Test expense",
      supplier: "Test Supplier",
      costCenterId: undefined,
      paymentStatus: "pago",
    });

    expect(result).toBeDefined();
    expect(result.category).toBe("energia");
  });
});
