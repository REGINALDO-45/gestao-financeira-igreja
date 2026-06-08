import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => {
  return {
    getAllEntries: vi.fn().mockResolvedValue([]),
    createEntry: vi.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    getEntriesByMember: vi.fn().mockResolvedValue([]),
  };
});

function createTreasurerContext(): TrpcContext {
  return {
    user: {
      id: 1,
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

function createViewerContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "viewer-user",
      email: "viewer@church.com",
      name: "Viewer User",
      loginMethod: "manus",
      role: "visualizador",
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

describe("entries procedures", () => {
  it("treasurer can list entries", async () => {
    const ctx = createTreasurerContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.entries.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("viewer can list entries", async () => {
    const ctx = createViewerContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.entries.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("treasurer can create entry", async () => {
    const ctx = createTreasurerContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.entries.create({
      entryDate: new Date(),
      category: "dizimo",
      amount: "100.00",
      paymentMethod: "pix",
      memberId: undefined,
      cultoSunday: "Domingo, 26 de Maio",
      description: "Test entry",
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.category).toBe("dizimo");
    expect(result.amount).toBe("100.00");
  });

  it("viewer cannot create entry", async () => {
    const ctx = createViewerContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.entries.create({
        entryDate: new Date(),
        category: "dizimo",
        amount: "100.00",
        paymentMethod: "pix",
        memberId: undefined,
        cultoSunday: "Domingo, 26 de Maio",
        description: "Test entry",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });
});
