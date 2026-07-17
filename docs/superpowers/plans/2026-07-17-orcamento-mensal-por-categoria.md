# Orçamento Mensal por Categoria — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat, single monthly goal (repeated across all 12 months) on the "Orçamento Anual" page with a per-month, per-category budget, so each month has its own budgeted amount for each entry/expense category — mirroring the church's Excel budget spreadsheet.

**Architecture:** A new `budget_lines` table stores one row per `(year, month, type, category)`. The monthly "orçado" total is derived (summed) from these rows rather than stored separately. The UI lets the treasurer pick a month and fill in budgeted amounts per category; a summary table still shows all 12 months with orçado (now derived) vs. realizado. The old `annual_budgets` table and its router/db module are removed, after a one-time data migration that seeds the old flat goal into `outras_receitas`/`outras_despesas` for every month, per year.

**Tech Stack:** Drizzle ORM (Postgres), tRPC, React + TanStack Query (via `trpc` client hooks), Vitest for tests.

## Global Constraints

- Categories for budget lines MUST reuse the existing `entryCategoryEnum` / `expenseCategoryEnum` values verbatim (no new/free-text categories) — per the approved spec.
- Only `tesoureiro`/`admin` roles can write budget data (`treasurerProcedure`), same as today; all roles can read (`protectedProcedure`).
- Schema changes must go through a generated Drizzle migration file (`drizzle-kit generate`), never hand-applied ad hoc. Applying the migration against the real database is a separate, explicitly confirmed step (Task 8) — do not run it automatically as part of earlier tasks.
- Follow the existing `memoryStore` dev/test fallback pattern in every new `server/db/*.ts` function (see `server/db/annualBudgets.ts` and `server/db/goals.ts` for the pattern).
- Money values are strings with 2 decimals (`"1234.56"`) at the API boundary, matching every other `decimal` column in this codebase (e.g. `entries.amount`, `expenses.amount`).

---

## File Structure

| File | Responsibility |
|---|---|
| `drizzle/schema.ts` | Modify: remove `annualBudgets` table/types, add `budgetLines` table/types. |
| `drizzle/0006_<generated>.sql` | Create: generated migration (schema) + hand-added data migration + `DROP TABLE annual_budgets`. |
| `server/db/core.ts` | Modify: `memoryStore.budgetLines` replaces `memoryStore.annualBudgets`. |
| `server/db/annualBudgets.ts` | Delete. |
| `server/db/budgetLines.ts` | Create: `getBudgetLinesByYear`, `upsertMonthBudgetLines`. |
| `server/db.ts` | Modify: swap the re-export. |
| `server/routers/annualBudgets.ts` | Delete. |
| `server/routers/budgetLines.ts` | Create: `budgetLinesRouter` (`getByYear`, `upsertMonth`). |
| `server/routers.ts` | Modify: swap `annualBudgets` router registration for `budgetLines`. |
| `server/budgetLines.test.ts` | Create: tRPC procedure tests (mirrors `server/expenses.test.ts`). |
| `client/src/lib/budgetMath.ts` | Create: pure functions to derive monthly totals and per-category maps from `budget_lines` rows. |
| `client/src/lib/budgetMath.test.ts` | Create: unit tests for the above. |
| `client/src/pages/AnnualBudget.tsx` | Modify: month selector + per-category form + summary table wired to `budgetLines` router. |

---

## Task 1: Schema — add `budget_lines`, remove `annual_budgets`

**Files:**
- Modify: `drizzle/schema.ts:193-207` (the `annualBudgets` block)

**Interfaces:**
- Produces: `budgetLines` table, `BudgetLine` type (`{ id: number; year: number; month: number; type: "entrada" | "despesa"; category: string; amount: string; createdAt: Date; updatedAt: Date }`), `InsertBudgetLine` type.

- [ ] **Step 1: Replace the `annualBudgets` block in `drizzle/schema.ts`**

Find this block (lines 193-207):

```ts
/**
 * Orçamento Anual - metas mensais de entradas e despesas por ano, usadas para
 * acompanhar o percentual realizado em relação ao orçado.
 */
export const annualBudgets = pgTable("annual_budgets", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull().unique(),
  monthlyEntriesGoal: decimal("monthlyEntriesGoal", { precision: 10, scale: 2 }).notNull(),
  monthlyExpensesGoal: decimal("monthlyExpensesGoal", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type AnnualBudget = typeof annualBudgets.$inferSelect;
export type InsertAnnualBudget = typeof annualBudgets.$inferInsert;
```

Replace it with:

```ts
/**
 * Orçamento Mensal por Categoria - valor orçado de cada categoria de entrada/despesa,
 * por mês e ano. O total orçado de um mês é a soma das linhas daquele (year, month, type).
 */
export const budgetLineTypeEnum = pgEnum("budget_line_type", ["entrada", "despesa"]);

export const budgetLines = pgTable("budget_lines", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  type: budgetLineTypeEnum("type").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  yearMonthTypeCategoryUnique: uniqueIndex("budget_lines_year_month_type_category_unique").on(
    table.year,
    table.month,
    table.type,
    table.category
  ),
}));

export type BudgetLine = typeof budgetLines.$inferSelect;
export type InsertBudgetLine = typeof budgetLines.$inferInsert;
```

- [ ] **Step 2: Add `uniqueIndex` to the import list**

At the top of `drizzle/schema.ts`, the import currently reads:

```ts
import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  timestamp,
  varchar,
  decimal,
  date,
  boolean,
} from "drizzle-orm/pg-core";
```

Add `uniqueIndex`:

```ts
import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  timestamp,
  varchar,
  decimal,
  date,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
```

- [ ] **Step 3: Verify the file still type-checks**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors from `drizzle/schema.ts` (errors referencing `annualBudgets` in other files are expected here — they get fixed in later tasks).

- [ ] **Step 4: Commit**

```bash
git add drizzle/schema.ts
git commit -m "feat: replace annual_budgets with per-month per-category budget_lines schema"
```

---

## Task 2: Generate the Drizzle migration and hand-edit the data migration

**Files:**
- Create: `drizzle/00XX_<generated_name>.sql` (exact name decided by `drizzle-kit generate`)
- Modify: `drizzle/meta/_journal.json` (auto-updated by the generate command)
- Create: `drizzle/meta/00XX_snapshot.json` (auto-generated)

**Interfaces:**
- Consumes: `budgetLines` table from Task 1.
- Produces: a migration file that (a) creates `budget_lines`, (b) migrates any existing `annual_budgets` rows into it, (c) drops `annual_budgets`. This file is NOT applied to the real database in this task — see Task 8.

- [ ] **Step 1: Generate the migration**

Run: `npx drizzle-kit generate`
Expected: output naming a new file like `drizzle/0006_<two_word_name>.sql`, and it should contain a `CREATE TABLE "budget_lines" (...)` statement and a `DROP TABLE "annual_budgets";` statement (drizzle-kit diffs the old and new schema). If it does NOT contain the drop statement, add it by hand in Step 2.

- [ ] **Step 2: Insert the data migration between the CREATE and DROP statements**

Open the generated file. It will look roughly like:

```sql
CREATE TABLE "budget_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"type" "budget_line_type" NOT NULL,
	"category" varchar(50) NOT NULL,
	"amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "budget_lines_year_month_type_category_unique" UNIQUE("year","month","type","category")
);
--> statement-breakpoint
DROP TABLE "annual_budgets";
```

Edit it to insert the data migration between the two statements, so the final file reads:

```sql
CREATE TABLE "budget_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"type" "budget_line_type" NOT NULL,
	"category" varchar(50) NOT NULL,
	"amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "budget_lines_year_month_type_category_unique" UNIQUE("year","month","type","category")
);
--> statement-breakpoint
INSERT INTO "budget_lines" ("year", "month", "type", "category", "amount")
SELECT ab.year, m.month, 'entrada', 'outras_receitas', ab."monthlyEntriesGoal"
FROM "annual_budgets" ab
CROSS JOIN generate_series(1, 12) AS m(month);
--> statement-breakpoint
INSERT INTO "budget_lines" ("year", "month", "type", "category", "amount")
SELECT ab.year, m.month, 'despesa', 'outras_despesas', ab."monthlyExpensesGoal"
FROM "annual_budgets" ab
CROSS JOIN generate_series(1, 12) AS m(month);
--> statement-breakpoint
DROP TABLE "annual_budgets";
```

If `drizzle-kit generate` produced the `CREATE TYPE "budget_line_type"` statement separately before the `CREATE TABLE`, leave that untouched — just insert the two `INSERT` statements (each followed by `--> statement-breakpoint`) between the `CREATE TABLE "budget_lines"` block and the `DROP TABLE "annual_budgets";` line.

- [ ] **Step 3: Sanity-check the SQL syntax**

Run: `npx drizzle-kit check`
Expected: no errors reported about the migration history/snapshot being inconsistent.

- [ ] **Step 4: Commit**

```bash
git add drizzle/
git commit -m "feat: add migration for budget_lines with annual_budgets data migration"
```

---

## Task 3: `server/db/core.ts` — swap the memory store entry

**Files:**
- Modify: `server/db/core.ts:22-33`

**Interfaces:**
- Produces: `memoryStore.budgetLines: any[]` (replaces `memoryStore.annualBudgets`).

- [ ] **Step 1: Replace the memory store field**

In `server/db/core.ts`, find:

```ts
  recurringExpenses: [] as any[],
  annualBudgets: [] as any[],
  goals: [] as any[],
```

Replace with:

```ts
  recurringExpenses: [] as any[],
  budgetLines: [] as any[],
  goals: [] as any[],
```

- [ ] **Step 2: Commit**

```bash
git add server/db/core.ts
git commit -m "feat: swap memoryStore.annualBudgets for memoryStore.budgetLines"
```

(This intentionally breaks the build until Task 4/5 land — that's expected mid-refactor within this plan; each task's `tsc` check tolerates known-pending files as noted.)

---

## Task 4: `server/db/budgetLines.ts` — data access functions

**Files:**
- Create: `server/db/budgetLines.ts`
- Delete: `server/db/annualBudgets.ts`
- Modify: `server/db.ts:9`

**Interfaces:**
- Consumes: `budgetLines`, `BudgetLine` from `drizzle/schema.ts` (Task 1); `getDb`, `memoryStore` from `./core` (Task 3); `ensureInitialized` from `./seed`.
- Produces:
  - `getBudgetLinesByYear(year: number): Promise<BudgetLine[]>`
  - `upsertMonthBudgetLines(input: { year: number; month: number; type: "entrada" | "despesa"; lines: { category: string; amount: string }[] }): Promise<BudgetLine[]>`

- [ ] **Step 1: Delete the old file**

```bash
git rm server/db/annualBudgets.ts
```

- [ ] **Step 2: Create `server/db/budgetLines.ts`**

```ts
import { and, eq } from "drizzle-orm";
import { budgetLines, type BudgetLine } from "../../drizzle/schema";
import { getDb, memoryStore } from "./core";
import { ensureInitialized } from "./seed";

export async function getBudgetLinesByYear(year: number): Promise<BudgetLine[]> {
  await ensureInitialized();
  const db = await getDb();
  if (!db) {
    return memoryStore.budgetLines.filter((b) => b.year === year);
  }

  return await db.select().from(budgetLines).where(eq(budgetLines.year, year));
}

export async function upsertMonthBudgetLines(input: {
  year: number;
  month: number;
  type: "entrada" | "despesa";
  lines: { category: string; amount: string }[];
}): Promise<BudgetLine[]> {
  await ensureInitialized();
  const db = await getDb();
  const { year, month, type, lines } = input;

  if (!db) {
    const results: BudgetLine[] = [];
    for (const line of lines) {
      const existing = memoryStore.budgetLines.find(
        (b) => b.year === year && b.month === month && b.type === type && b.category === line.category
      );
      if (existing) {
        Object.assign(existing, { amount: line.amount, updatedAt: new Date() });
        results.push(existing);
      } else {
        const newItem = {
          id: memoryStore.budgetLines.length + 1,
          year,
          month,
          type,
          category: line.category,
          amount: line.amount,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        memoryStore.budgetLines.push(newItem);
        results.push(newItem);
      }
    }
    return results;
  }

  const results: BudgetLine[] = [];
  for (const line of lines) {
    await db
      .insert(budgetLines)
      .values({ year, month, type, category: line.category, amount: line.amount })
      .onConflictDoUpdate({
        target: [budgetLines.year, budgetLines.month, budgetLines.type, budgetLines.category],
        set: { amount: line.amount },
      });
  }
  const saved = await db
    .select()
    .from(budgetLines)
    .where(and(eq(budgetLines.year, year), eq(budgetLines.month, month), eq(budgetLines.type, type)));
  results.push(...saved);
  return results;
}
```

- [ ] **Step 3: Update `server/db.ts`**

Find:

```ts
export * from "./db/annualBudgets";
```

Replace with:

```ts
export * from "./db/budgetLines";
```

- [ ] **Step 4: Verify types**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors from `server/db/budgetLines.ts` or `server/db.ts`. Errors from `server/routers/annualBudgets.ts` are expected here — fixed in Task 5.

- [ ] **Step 5: Commit**

```bash
git add server/db/budgetLines.ts server/db.ts
git commit -m "feat: add budgetLines db access functions, remove annualBudgets"
```

---

## Task 5: `server/routers/budgetLines.ts` — tRPC router

**Files:**
- Create: `server/routers/budgetLines.ts`
- Delete: `server/routers/annualBudgets.ts`
- Modify: `server/routers.ts:11,34`

**Interfaces:**
- Consumes: `getBudgetLinesByYear`, `upsertMonthBudgetLines` from `../db` (Task 4); `protectedProcedure`, `treasurerProcedure`, `router` from `../_core/trpc`.
- Produces: `budgetLinesRouter` with procedures `getByYear` and `upsertMonth`, registered on `appRouter` as `budgetLines`.

- [ ] **Step 1: Delete the old router file**

```bash
git rm server/routers/annualBudgets.ts
```

- [ ] **Step 2: Create `server/routers/budgetLines.ts`**

```ts
import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, router, treasurerProcedure } from "../_core/trpc";

const budgetLineInput = z.object({
  category: z.string(),
  amount: z.string(),
});

export const budgetLinesRouter = router({
  getByYear: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ input }) => {
      return await db.getBudgetLinesByYear(input.year);
    }),
  upsertMonth: treasurerProcedure
    .input(
      z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
        type: z.enum(["entrada", "despesa"]),
        lines: z.array(budgetLineInput),
      })
    )
    .mutation(async ({ input }) => {
      return await db.upsertMonthBudgetLines(input);
    }),
});
```

- [ ] **Step 3: Update `server/routers.ts`**

Find:

```ts
import { annualBudgetsRouter } from "./routers/annualBudgets";
```

Replace with:

```ts
import { budgetLinesRouter } from "./routers/budgetLines";
```

Find:

```ts
  annualBudgets: annualBudgetsRouter,
```

Replace with:

```ts
  budgetLines: budgetLinesRouter,
```

- [ ] **Step 4: Verify types**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors from `server/routers.ts` or `server/routers/budgetLines.ts`. Errors from `client/src/pages/AnnualBudget.tsx` are expected here — fixed in Task 7.

- [ ] **Step 5: Commit**

```bash
git add server/routers.ts server/routers/budgetLines.ts
git commit -m "feat: add budgetLines tRPC router, remove annualBudgets router"
```

---

## Task 6: Server tests for `budgetLines`

**Files:**
- Create: `server/budgetLines.test.ts`

**Interfaces:**
- Consumes: `appRouter` from `./routers`; `TrpcContext` from `./_core/context`.

- [ ] **Step 1: Write the test file**

```ts
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
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run server/budgetLines.test.ts`
Expected: 3 passing tests.

- [ ] **Step 3: Commit**

```bash
git add server/budgetLines.test.ts
git commit -m "test: add budgetLines tRPC procedure tests"
```

---

## Task 7: `client/src/lib/budgetMath.ts` — pure aggregation functions

**Files:**
- Create: `client/src/lib/budgetMath.ts`
- Create: `client/src/lib/budgetMath.test.ts`

**Interfaces:**
- Produces:
  - `interface BudgetLineLike { month: number; type: "entrada" | "despesa"; category: string; amount: string }`
  - `getMonthlyOrcadoTotals(lines: BudgetLineLike[]): Record<number, { entrada: number; despesa: number }>` — keyed by month (1-12); months with no lines get `{ entrada: 0, despesa: 0 }`.
  - `getCategoryAmountsForMonth(lines: BudgetLineLike[], month: number, type: "entrada" | "despesa"): Record<string, string>` — maps `category -> amount` for the given month/type (only categories with a saved line are present).

- [ ] **Step 1: Write the failing tests**

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run client/src/lib/budgetMath.test.ts`
Expected: FAIL with "Cannot find module './budgetMath'" (file doesn't exist yet).

- [ ] **Step 3: Write `client/src/lib/budgetMath.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run client/src/lib/budgetMath.test.ts`
Expected: 2 passing tests.

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/budgetMath.ts client/src/lib/budgetMath.test.ts
git commit -m "feat: add pure functions to aggregate budget lines by month/category"
```

---

## Task 8: Rewrite `client/src/pages/AnnualBudget.tsx`

**Files:**
- Modify: `client/src/pages/AnnualBudget.tsx` (full rewrite)

**Interfaces:**
- Consumes:
  - `trpc.budgetLines.getByYear.useQuery({ year })` → `BudgetLine[]` (from Task 5)
  - `trpc.budgetLines.upsertMonth.useMutation()` (from Task 5)
  - `getMonthlyOrcadoTotals`, `getCategoryAmountsForMonth`, `BudgetLineLike` from `@/lib/budgetMath` (Task 7)
  - `trpc.entries.listByDateRange.useQuery`, `trpc.expenses.listByDateRange.useQuery` (unchanged, existing)
  - `useAuthGuard`, `isTreasurer` from `@/hooks/useAuthGuard` (unchanged, existing)
  - `yearRangeUTC` from `@/lib/dateRange` (unchanged, existing)

- [ ] **Step 1: Replace the full contents of `client/src/pages/AnnualBudget.tsx`**

```tsx
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthGuard, isTreasurer } from "@/hooks/useAuthGuard";
import { yearRangeUTC } from "@/lib/dateRange";
import { getMonthlyOrcadoTotals, getCategoryAmountsForMonth, type BudgetLineLike } from "@/lib/budgetMath";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const ENTRY_CATEGORIES: { value: string; label: string }[] = [
  { value: "dizimo", label: "Dízimo" },
  { value: "oferta", label: "Oferta" },
  { value: "oferta_especial", label: "Oferta Especial" },
  { value: "campanha", label: "Campanha" },
  { value: "missoes", label: "Missões" },
  { value: "construcao", label: "Construção" },
  { value: "bazar", label: "Bazar" },
  { value: "almoco_beneficente", label: "Almoço Beneficente" },
  { value: "cantina", label: "Cantina" },
  { value: "doacao", label: "Doação" },
  { value: "outras_receitas", label: "Outras Receitas" },
];

const EXPENSE_CATEGORIES: { value: string; label: string }[] = [
  { value: "agua", label: "Água" },
  { value: "energia", label: "Energia" },
  { value: "internet", label: "Internet" },
  { value: "aluguel", label: "Aluguel" },
  { value: "material_limpeza", label: "Material de Limpeza" },
  { value: "evangelismo", label: "Evangelismo" },
  { value: "missoes", label: "Missões" },
  { value: "construcao", label: "Construção" },
  { value: "equipamentos", label: "Equipamentos" },
  { value: "manutencao", label: "Manutenção" },
  { value: "outras_despesas", label: "Outras Despesas" },
];

const sumAmounts = (items: { amount: string }[]) =>
  Math.round(items.reduce((s, e) => s + parseFloat(e.amount) * 100, 0)) / 100;

export default function AnnualBudget() {
  const { user } = useAuthGuard();
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [entryAmounts, setEntryAmounts] = useState<Record<string, string>>({});
  const [expenseAmounts, setExpenseAmounts] = useState<Record<string, string>>({});

  const yearRange = useMemo(() => yearRangeUTC(year), [year]);

  const { data: budgetLines, isLoading: isLoadingBudget } = trpc.budgetLines.getByYear.useQuery({ year });
  const { data: entries, isLoading: isLoadingEntries } = trpc.entries.listByDateRange.useQuery(yearRange);
  const { data: expenses, isLoading: isLoadingExpenses } = trpc.expenses.listByDateRange.useQuery(yearRange);
  const upsertMonth = trpc.budgetLines.upsertMonth.useMutation();
  const utils = trpc.useUtils();

  const lines: BudgetLineLike[] = useMemo(() => budgetLines ?? [], [budgetLines]);

  useEffect(() => {
    setEntryAmounts(getCategoryAmountsForMonth(lines, selectedMonth, "entrada"));
    setExpenseAmounts(getCategoryAmountsForMonth(lines, selectedMonth, "despesa"));
  }, [lines, selectedMonth]);

  const monthlyOrcado = useMemo(() => getMonthlyOrcadoTotals(lines), [lines]);

  const monthlyData = useMemo(() => {
    return MONTH_NAMES.map((name, i) => {
      const monthIndex = i + 1;
      const entriesRealized = sumAmounts((entries ?? []).filter(e => new Date(e.entryDate).getUTCMonth() === i));
      const expensesRealized = sumAmounts((expenses ?? []).filter(e => new Date(e.expenseDate).getUTCMonth() === i));
      const entriesOrcado = monthlyOrcado[monthIndex]?.entrada ?? 0;
      const expensesOrcado = monthlyOrcado[monthIndex]?.despesa ?? 0;
      return {
        name,
        entriesRealized,
        expensesRealized,
        entriesOrcado,
        expensesOrcado,
        entriesPct: entriesOrcado > 0 ? (entriesRealized / entriesOrcado) * 100 : 0,
        expensesPct: expensesOrcado > 0 ? (expensesRealized / expensesOrcado) * 100 : 0,
      };
    });
  }, [entries, expenses, monthlyOrcado]);

  const totals = useMemo(() => ({
    entriesRealized: monthlyData.reduce((s, m) => s + m.entriesRealized, 0),
    expensesRealized: monthlyData.reduce((s, m) => s + m.expensesRealized, 0),
    entriesOrcado: monthlyData.reduce((s, m) => s + m.entriesOrcado, 0),
    expensesOrcado: monthlyData.reduce((s, m) => s + m.expensesOrcado, 0),
  }), [monthlyData]);

  const entryTotal = useMemo(
    () => Object.values(entryAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [entryAmounts]
  );
  const expenseTotal = useMemo(
    () => Object.values(expenseAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [expenseAmounts]
  );

  const handleSaveMonth = async () => {
    try {
      await Promise.all([
        upsertMonth.mutateAsync({
          year,
          month: selectedMonth,
          type: "entrada",
          lines: ENTRY_CATEGORIES.map(c => ({ category: c.value, amount: entryAmounts[c.value] || "0" })),
        }),
        upsertMonth.mutateAsync({
          year,
          month: selectedMonth,
          type: "despesa",
          lines: EXPENSE_CATEGORIES.map(c => ({ category: c.value, amount: expenseAmounts[c.value] || "0" })),
        }),
      ]);
      utils.budgetLines.getByYear.invalidate({ year });
      toast.success(`Orçamento de ${MONTH_NAMES[selectedMonth - 1]} salvo com sucesso!`);
    } catch {
      toast.error("Erro ao salvar o orçamento do mês");
    }
  };

  const pctBadge = (pct: number, isExpense: boolean) => {
    const good = isExpense ? pct <= 100 : pct >= 100;
    return (
      <Badge className={good ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
        {pct.toFixed(0)}%
      </Badge>
    );
  };

  const isLoading = isLoadingBudget || isLoadingEntries || isLoadingExpenses;
  const canEdit = isTreasurer(user?.role);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Orçamento Anual</h1>
          <p className="text-muted-foreground">Orçamento por categoria em cada mês e o percentual realizado</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-[160px]">
              <Label htmlFor="year">Ano</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Orçamento do Mês</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {MONTH_SHORT.map((label, i) => (
                <Button
                  key={label}
                  type="button"
                  size="sm"
                  variant={selectedMonth === i + 1 ? "default" : "outline"}
                  onClick={() => setSelectedMonth(i + 1)}
                >
                  {label}
                </Button>
              ))}
            </div>

            {isLoadingBudget ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold">Entradas — {MONTH_NAMES[selectedMonth - 1]}</h3>
                  {ENTRY_CATEGORIES.map((c) => (
                    <div key={c.value} className="flex items-center justify-between gap-3">
                      <Label htmlFor={`entrada-${c.value}`} className="flex-1">{c.label}</Label>
                      <Input
                        id={`entrada-${c.value}`}
                        type="number"
                        step="0.01"
                        className="w-32"
                        value={entryAmounts[c.value] ?? ""}
                        onChange={(e) => setEntryAmounts(prev => ({ ...prev, [c.value]: e.target.value }))}
                        disabled={!canEdit}
                      />
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3 font-bold pt-2 border-t">
                    <span>Total Entradas</span>
                    <span>R$ {entryTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">Despesas — {MONTH_NAMES[selectedMonth - 1]}</h3>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <div key={c.value} className="flex items-center justify-between gap-3">
                      <Label htmlFor={`despesa-${c.value}`} className="flex-1">{c.label}</Label>
                      <Input
                        id={`despesa-${c.value}`}
                        type="number"
                        step="0.01"
                        className="w-32"
                        value={expenseAmounts[c.value] ?? ""}
                        onChange={(e) => setExpenseAmounts(prev => ({ ...prev, [c.value]: e.target.value }))}
                        disabled={!canEdit}
                      />
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3 font-bold pt-2 border-t">
                    <span>Total Despesas</span>
                    <span>R$ {expenseTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {canEdit && (
              <Button onClick={handleSaveMonth} disabled={upsertMonth.isPending}>
                {upsertMonth.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Orçamento de {MONTH_NAMES[selectedMonth - 1]}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Realizado vs. Orçado — {year}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead className="text-right">Entradas Realizado</TableHead>
                      <TableHead className="text-right">Entradas Orçado</TableHead>
                      <TableHead className="text-right">% Entradas</TableHead>
                      <TableHead className="text-right">Despesas Realizado</TableHead>
                      <TableHead className="text-right">Despesas Orçado</TableHead>
                      <TableHead className="text-right">% Despesas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyData.map((m) => (
                      <TableRow key={m.name}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell className="text-right">R$ {m.entriesRealized.toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {m.entriesOrcado.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{pctBadge(m.entriesPct, false)}</TableCell>
                        <TableCell className="text-right">R$ {m.expensesRealized.toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {m.expensesOrcado.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{pctBadge(m.expensesPct, true)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell>TOTAL {year}</TableCell>
                      <TableCell className="text-right">R$ {totals.entriesRealized.toFixed(2)}</TableCell>
                      <TableCell className="text-right">R$ {totals.entriesOrcado.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {totals.entriesOrcado > 0 ? `${((totals.entriesRealized / totals.entriesOrcado) * 100).toFixed(0)}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right">R$ {totals.expensesRealized.toFixed(2)}</TableCell>
                      <TableCell className="text-right">R$ {totals.expensesOrcado.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {totals.expensesOrcado > 0 ? `${((totals.expensesRealized / totals.expensesOrcado) * 100).toFixed(0)}%` : "—"}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors anywhere in the project (this was the last file referencing the old `annualBudgets` API).

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass, including `server/budgetLines.test.ts` and `client/src/lib/budgetMath.test.ts` from earlier tasks.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/AnnualBudget.tsx
git commit -m "feat: rewrite Orçamento Anual page for per-month per-category budgeting"
```

---

## Task 9: Manual browser verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server and open the page**

Use the project's dev server (`npm run dev` or the configured `.claude/launch.json` entry) and navigate to `/annual-budget`, logged in as a `tesoureiro` or `admin` user.

- [ ] **Step 2: Verify month switching preserves unsaved state correctly**

Click through a few months in the selector row. Confirm the category inputs reset to that month's saved values (or blank/zero if never saved), and the "Total Entradas"/"Total Despesas" figures update live as you type.

- [ ] **Step 3: Save a month and confirm the summary table updates**

Fill in a few category values for the selected month, click "Salvar Orçamento de <Mês>", confirm the success toast appears, then check the "Realizado vs. Orçado" table below — the "Entradas Orçado"/"Despesas Orçado" column for that month should reflect the new sum.

- [ ] **Step 4: Verify read-only role cannot edit**

Log in (or switch context) as a `visualizador` user and confirm the category inputs are disabled and the "Salvar" button is not rendered, while the summary table still loads and displays data.

- [ ] **Step 5: Take a screenshot for the record**

Use the browser tool's screenshot action on the populated page and share it as confirmation the feature renders correctly end-to-end.

---

## Task 10: Apply the migration to the real database (requires explicit user confirmation)

**This is a schema change to shared, production data. Do not run automatically — present the plan to the user and wait for an explicit go-ahead before executing anything in this task.**

**Files:** none (infrastructure step)

- [ ] **Step 1: Confirm with the user before proceeding**

Ask the user to confirm they want to apply `drizzle/00XX_<name>.sql` (from Task 2) to the production database now, and that they understand it will migrate their currently-saved 2026 monthly goal into `budget_lines` under `outras_receitas`/`outras_despesas` for every month, then drop `annual_budgets`.

- [ ] **Step 2: Determine how to apply it**

Per project memory, the app's `DATABASE_URL` role lacks DDL permission. Two options, in order of preference:
1. If a Supabase MCP project matching this app's database is available and connected, use `apply_migration` with the exact contents of the generated `.sql` file.
2. Otherwise, give the user the migration file path and ask them to run it via the Supabase SQL editor (or `psql` with a role that has DDL/DROP permission), then confirm back once done.

- [ ] **Step 3: Verify post-migration**

After the user confirms the migration ran, query `budget_lines` for the current year (via Supabase MCP `execute_sql` or asking the user to check the app) and confirm rows exist for all 12 months, and that `/annual-budget` in the running app now shows the migrated totals under "Outras Receitas"/"Outras Despesas" for the current year.
