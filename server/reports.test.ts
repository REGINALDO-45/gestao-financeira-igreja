import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

describe("reports procedures", () => {
  it("viewer can list entries for reports", async () => {
    const ctx = createViewerContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.entries.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("treasurer can list expenses for reports", async () => {
    const ctx = createTreasurerContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.expenses.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });


});
