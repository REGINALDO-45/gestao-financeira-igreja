# Despesas Customizadas no Orçamento Mensal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the treasurer add, edit, and remove free-text expense budget lines (e.g. "Subsídio Pastoral") in the monthly budget, alongside the 11 fixed expense categories, with no database schema change.

**Architecture:** `budget_lines.category` is already a plain `varchar(50)` with no DB-level enum constraint, so a custom expense line is just a row whose `category` is user-typed text instead of one of the 11 fixed slugs. `upsertMonth` changes from pure upsert to full-replace-per-month/type semantics (delete anything not resubmitted, then upsert what was submitted) so renaming/removing a custom line works without new endpoints. The client tracks custom lines as a separate array in local state, merges them into the same `lines[]` payload as the fixed categories on save, and derives them back out of the loaded data by excluding the known fixed category values.

**Tech Stack:** Drizzle ORM (Postgres), tRPC, React, Vitest.

## Global Constraints

- Scope is **despesas only** — Entradas keeps its current fixed-category-only behavior, no changes to `ENTRY_CATEGORIES` or the entradas save payload.
- No schema/migration change. `budget_lines.category` (`varchar(50)`) already accepts arbitrary text.
- A custom line's `category` (its free-text description) is capped at 50 characters (the column's limit) and must be unique within its `(year, month, type)` — enforced client-side before save, and the zod schema on `upsertMonth`'s `lines[].category` gets `.max(50)`.
- `upsertMonth` becomes full-replace: after a save, `budget_lines` for that `(year, month, type)` contains exactly the rows submitted in `lines[]` — nothing more, nothing less. The 11 fixed categories are always submitted in full on every save, so they're never accidentally deleted.
- Custom lines have no automatic "realizado" — their `category` text will never match a real `expenseCategoryEnum` value from actual Saídas entries, so they only contribute to the orçado side of `getMonthlyOrcadoTotals`. No change needed to that function.

---

## File Structure

| File | Responsibility |
|---|---|
| `server/db/budgetLines.ts` | Modify: `upsertMonthBudgetLines` deletes rows not in the submitted `lines[]` before upserting (both the memory-store and real-DB code paths). Fix id generation in the memory-store path so it doesn't collide after a delete shrinks the array. |
| `server/db/budgetLines.test.ts` | Create: direct unit tests for `upsertMonthBudgetLines`'s replace semantics (memory-store path, exercised because the test environment has no `DATABASE_URL`). |
| `server/routers/budgetLines.ts` | Modify: add `.max(50)` to the `category` zod field. |
| `client/src/lib/budgetMath.ts` | Modify: add `getCustomLines(amounts, fixedCategories)` pure function. |
| `client/src/lib/budgetMath.test.ts` | Modify: add tests for `getCustomLines`. |
| `client/src/pages/AnnualBudget.tsx` | Modify: add "Despesas Adicionais" section (state, add/edit/remove handlers, validation, save payload, total calculation). |

---

## Task 1: Backend — replace semantics for `upsertMonth`, `.max(50)` validation, unit tests

**Files:**
- Modify: `server/db/budgetLines.ts`
- Modify: `server/routers/budgetLines.ts`
- Create: `server/db/budgetLines.test.ts`

**Interfaces:**
- Consumes: `budgetLines` table, `BudgetLine` type from `../../drizzle/schema` (unchanged); `getDb`, `memoryStore` from `./core` (unchanged).
- Produces: `upsertMonthBudgetLines` keeps the exact same signature and return type as today (`Promise<BudgetLine[]>`) — only its internal behavior changes (delete-then-upsert instead of upsert-only). No caller (router, client) needs to change how it calls this function.

- [ ] **Step 1: Write the failing tests**

Create `server/db/budgetLines.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run server/db/budgetLines.test.ts`
Expected: FAIL — the "removes a line that is renamed" and "does not affect other months" tests fail because the current implementation never deletes anything (it only upserts), so the old category/line is still present and counts don't match.

- [ ] **Step 3: Update `server/db/budgetLines.ts`**

Replace the full contents of the file with:

```ts
import { and, eq, notInArray } from "drizzle-orm";
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
  const categories = lines.map((l) => l.category);

  if (!db) {
    memoryStore.budgetLines = memoryStore.budgetLines.filter(
      (b) => !(b.year === year && b.month === month && b.type === type && !categories.includes(b.category))
    );

    const results: BudgetLine[] = [];
    for (const line of lines) {
      const existing = memoryStore.budgetLines.find(
        (b) => b.year === year && b.month === month && b.type === type && b.category === line.category
      );
      if (existing) {
        Object.assign(existing, { amount: line.amount, updatedAt: new Date() });
        results.push(existing);
      } else {
        const nextId = memoryStore.budgetLines.reduce((max, b) => Math.max(max, b.id), 0) + 1;
        const newItem = {
          id: nextId,
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

  if (categories.length > 0) {
    await db
      .delete(budgetLines)
      .where(
        and(
          eq(budgetLines.year, year),
          eq(budgetLines.month, month),
          eq(budgetLines.type, type),
          notInArray(budgetLines.category, categories)
        )
      );
  } else {
    await db
      .delete(budgetLines)
      .where(and(eq(budgetLines.year, year), eq(budgetLines.month, month), eq(budgetLines.type, type)));
  }

  const results: BudgetLine[] = [];
  for (const line of lines) {
    await db
      .insert(budgetLines)
      .values({ year, month, type, category: line.category, amount: line.amount })
      .onConflictDoUpdate({
        target: [budgetLines.year, budgetLines.month, budgetLines.type, budgetLines.category],
        set: { amount: line.amount, updatedAt: new Date() },
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

Note the memory-store id fix: `nextId` is now computed as the current max id in the whole array plus one, instead of `array.length + 1`. This matters now that the array can shrink (via the filter above) — with the old `length + 1` scheme, deleting an item and then inserting a new one could reuse an id still held by a surviving item.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run server/db/budgetLines.test.ts`
Expected: 4 passing tests.

- [ ] **Step 5: Add `.max(50)` validation to the router**

In `server/routers/budgetLines.ts`, find:

```ts
const budgetLineInput = z.object({
  category: z.string(),
  amount: z.string(),
});
```

Replace with:

```ts
const budgetLineInput = z.object({
  category: z.string().max(50),
  amount: z.string(),
});
```

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass, including the existing `server/budgetLines.test.ts` (router-level tests, which mock `./db` entirely and are unaffected by this internal behavior change) and the new `server/db/budgetLines.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add server/db/budgetLines.ts server/db/budgetLines.test.ts server/routers/budgetLines.ts
git commit -m "feat: replace-semantics for upsertMonth so custom budget lines can be renamed/removed"
```

---

## Task 2: `client/src/lib/budgetMath.ts` — pure helper to extract custom lines

**Files:**
- Modify: `client/src/lib/budgetMath.ts`
- Modify: `client/src/lib/budgetMath.test.ts`

**Interfaces:**
- Consumes: nothing new (pure function, no dependency on Task 1).
- Produces: `getCustomLines(amounts: Record<string, string>, fixedCategories: string[]): { category: string; amount: string }[]` — given the full category→amount map for a month/type (as already returned by `getCategoryAmountsForMonth`) and the list of known fixed category values, returns only the entries whose category is NOT in `fixedCategories`, as an array of `{ category, amount }` pairs.

- [ ] **Step 1: Write the failing tests**

In `client/src/lib/budgetMath.test.ts`, find the existing import line:

```ts
import { getMonthlyOrcadoTotals, getCategoryAmountsForMonth } from "./budgetMath";
```

Replace it with:

```ts
import { getMonthlyOrcadoTotals, getCategoryAmountsForMonth, getCustomLines } from "./budgetMath";
```

Then append a new `describe` block at the end of the file (after the existing `describe("getCategoryAmountsForMonth", ...)` block):

```ts
describe("getCustomLines", () => {
  it("returns only categories not present in the fixed list", () => {
    const amounts = { agua: "80.00", "Subsídio Pastoral": "4000.00", energia: "100.00" };
    const result = getCustomLines(amounts, ["agua", "energia"]);
    expect(result).toEqual([{ category: "Subsídio Pastoral", amount: "4000.00" }]);
  });

  it("returns an empty array when every category is fixed", () => {
    const amounts = { agua: "80.00", energia: "100.00" };
    expect(getCustomLines(amounts, ["agua", "energia"])).toEqual([]);
  });

  it("returns an empty array for an empty amounts map", () => {
    expect(getCustomLines({}, ["agua"])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run client/src/lib/budgetMath.test.ts`
Expected: FAIL with "getCustomLines is not a function" / import error.

- [ ] **Step 3: Add the implementation to `client/src/lib/budgetMath.ts`**

Append to the end of the file:

```ts
export function getCustomLines(
  amounts: Record<string, string>,
  fixedCategories: string[]
): { category: string; amount: string }[] {
  return Object.entries(amounts)
    .filter(([category]) => !fixedCategories.includes(category))
    .map(([category, amount]) => ({ category, amount }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run client/src/lib/budgetMath.test.ts`
Expected: 5 passing tests (2 pre-existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/budgetMath.ts client/src/lib/budgetMath.test.ts
git commit -m "feat: add getCustomLines to extract non-fixed budget categories"
```

---

## Task 3: `client/src/pages/AnnualBudget.tsx` — custom expense lines UI

**Files:**
- Modify: `client/src/pages/AnnualBudget.tsx`

**Interfaces:**
- Consumes: `getCustomLines` from `@/lib/budgetMath` (Task 2); `upsertMonth` mutation with `.max(50)`-validated `category` (Task 1) — no client-side type change needed since it was already `string`.
- Produces: no new exports; this is a leaf page component.

- [ ] **Step 1: Update the import line for `budgetMath`**

Find:

```ts
import { getMonthlyOrcadoTotals, getCategoryAmountsForMonth, type BudgetLineLike } from "@/lib/budgetMath";
```

Replace with:

```ts
import { getMonthlyOrcadoTotals, getCategoryAmountsForMonth, getCustomLines, type BudgetLineLike } from "@/lib/budgetMath";
```

- [ ] **Step 2: Add the `Plus`/`Trash2` icons to the lucide-react import**

Find:

```ts
import { Loader2 } from "lucide-react";
```

Replace with:

```ts
import { Loader2, Plus, Trash2 } from "lucide-react";
```

- [ ] **Step 3: Add a `CustomExpenseLine` type and the `EXPENSE_CATEGORY_VALUES` constant**

Find (right after the `EXPENSE_CATEGORIES` array):

```ts
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
```

Add right after it:

```ts
const EXPENSE_CATEGORY_VALUES = EXPENSE_CATEGORIES.map((c) => c.value);

interface CustomExpenseLine {
  id: string;
  category: string;
  amount: string;
}
```

- [ ] **Step 4: Add `customExpenses` state**

Find:

```ts
  const [entryAmounts, setEntryAmounts] = useState<Record<string, string>>({});
  const [expenseAmounts, setExpenseAmounts] = useState<Record<string, string>>({});
```

Replace with:

```ts
  const [entryAmounts, setEntryAmounts] = useState<Record<string, string>>({});
  const [expenseAmounts, setExpenseAmounts] = useState<Record<string, string>>({});
  const [customExpenses, setCustomExpenses] = useState<CustomExpenseLine[]>([]);
```

- [ ] **Step 5: Load custom expenses whenever the month/lines change**

Find:

```ts
  useEffect(() => {
    setEntryAmounts(getCategoryAmountsForMonth(lines, selectedMonth, "entrada"));
    setExpenseAmounts(getCategoryAmountsForMonth(lines, selectedMonth, "despesa"));
  }, [lines, selectedMonth]);
```

Replace with:

```ts
  useEffect(() => {
    setEntryAmounts(getCategoryAmountsForMonth(lines, selectedMonth, "entrada"));
    const monthExpenseAmounts = getCategoryAmountsForMonth(lines, selectedMonth, "despesa");
    setExpenseAmounts(monthExpenseAmounts);
    setCustomExpenses(
      getCustomLines(monthExpenseAmounts, EXPENSE_CATEGORY_VALUES).map((c) => ({
        id: crypto.randomUUID(),
        ...c,
      }))
    );
  }, [lines, selectedMonth]);
```

- [ ] **Step 6: Fix `expenseTotal` to include custom lines without double-counting**

Find:

```ts
  const expenseTotal = useMemo(
    () => Object.values(expenseAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [expenseAmounts]
  );
```

Replace with:

```ts
  const fixedExpenseTotal = useMemo(
    () => EXPENSE_CATEGORIES.reduce((s, c) => s + (parseFloat(expenseAmounts[c.value]) || 0), 0),
    [expenseAmounts]
  );
  const customExpenseTotal = useMemo(
    () => customExpenses.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0),
    [customExpenses]
  );
  const expenseTotal = fixedExpenseTotal + customExpenseTotal;
```

(`expenseAmounts` itself still holds the originally-loaded values including custom ones, but `customExpenses` is the live-edited source of truth for custom lines going forward — computing the total from `EXPENSE_CATEGORIES` + `customExpenses` separately avoids counting a custom line twice or missing a live edit.)

- [ ] **Step 7: Add handlers for adding, editing, and removing custom lines**

Find:

```ts
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
```

Replace with:

```ts
  const handleAddCustomExpense = () => {
    setCustomExpenses(prev => [...prev, { id: crypto.randomUUID(), category: "", amount: "" }]);
  };

  const handleCustomExpenseChange = (id: string, field: "category" | "amount", value: string) => {
    setCustomExpenses(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleRemoveCustomExpense = (id: string) => {
    setCustomExpenses(prev => prev.filter(item => item.id !== id));
  };

  const handleSaveMonth = async () => {
    const trimmedCustoms = customExpenses
      .map(c => ({ category: c.category.trim(), amount: c.amount || "0" }))
      .filter(c => c.category.length > 0);

    for (const c of trimmedCustoms) {
      if (c.category.length > 50) {
        toast.error(`Descrição muito longa (máx. 50 caracteres): "${c.category}"`);
        return;
      }
    }

    const seen = new Set<string>();
    for (const c of trimmedCustoms) {
      if (seen.has(c.category)) {
        toast.error(`Descrição de despesa duplicada: "${c.category}"`);
        return;
      }
      seen.add(c.category);
    }

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
          lines: [
            ...EXPENSE_CATEGORIES.map(c => ({ category: c.value, amount: expenseAmounts[c.value] || "0" })),
            ...trimmedCustoms,
          ],
        }),
      ]);
      utils.budgetLines.getByYear.invalidate({ year });
      toast.success(`Orçamento de ${MONTH_NAMES[selectedMonth - 1]} salvo com sucesso!`);
    } catch {
      toast.error("Erro ao salvar o orçamento do mês");
    }
  };
```

- [ ] **Step 8: Render the "Despesas Adicionais" section**

Find:

```tsx
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
```

Replace with:

```tsx
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

                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">Despesas Adicionais</h4>
                      {canEdit && (
                        <Button type="button" size="sm" variant="outline" onClick={handleAddCustomExpense}>
                          <Plus className="w-4 h-4 mr-1" /> Adicionar despesa
                        </Button>
                      )}
                    </div>
                    {customExpenses.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <Input
                          placeholder="Descrição"
                          className="flex-1"
                          maxLength={50}
                          value={item.category}
                          onChange={(e) => handleCustomExpenseChange(item.id, "category", e.target.value)}
                          disabled={!canEdit}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          className="w-32"
                          value={item.amount}
                          onChange={(e) => handleCustomExpenseChange(item.id, "amount", e.target.value)}
                          disabled={!canEdit}
                        />
                        {canEdit && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveCustomExpense(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3 font-bold pt-2 border-t">
                    <span>Total Despesas</span>
                    <span>R$ {expenseTotal.toFixed(2)}</span>
                  </div>
                </div>
```

- [ ] **Step 9: Verify types**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 10: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass (this task adds no new automated tests — the page's behavior is covered by Task 4's manual browser verification, matching how the rest of this page was verified in the original per-month-budgeting feature).

- [ ] **Step 11: Commit**

```bash
git add client/src/pages/AnnualBudget.tsx
git commit -m "feat: add editable custom expense lines to the monthly budget"
```

---

## Task 4: Manual browser verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server against the feature branch with a blanked `DATABASE_URL`**

This app's preview tooling always launches the dev server from the main repository checkout directory, not from an isolated worktree. If working from a worktree, temporarily check out this feature branch in the main checkout directory instead (recording the branch/commit you're replacing so you can restore it afterward), and temporarily blank `DATABASE_URL` in that directory's `.env` (saving the original aside) so the server falls back to in-memory demo data — this avoids writing test data into the real production database. Start the dev server (`npm run dev` or the configured `.claude/launch.json` entry) and log in via the `/api/oauth/mock-login` demo endpoint, then navigate to `/annual-budget`.

- [ ] **Step 2: Add a custom expense line and verify the total**

Select a month, scroll to "Despesas Adicionais", click "+ Adicionar despesa", type a description (e.g. "Subsídio Pastoral") and an amount (e.g. `4000`). Confirm "Total Despesas" updates live to include it alongside the fixed categories.

- [ ] **Step 3: Save and verify persistence**

Click "Salvar Orçamento de {Mês}", confirm the success toast, then reload the page. Confirm the custom line reappears with the same description and amount, and that the "Realizado vs. Orçado" summary table's "Despesas Orçado" for that month includes the custom line's amount.

- [ ] **Step 4: Rename a custom line and verify the old name is gone**

Edit the description of the saved custom line to a different value (e.g. "Subsídio Pastoral 2") and save again. Reload the page and confirm only the new description appears — not both the old and new one.

- [ ] **Step 5: Remove a custom line and verify it disappears after save**

Click the trash icon next to a custom line, save, reload, and confirm it no longer appears and the total dropped accordingly. Confirm the 11 fixed categories and any other months' data were unaffected.

- [ ] **Step 6: Verify duplicate-description validation**

Add two custom lines with the identical description and click save; confirm a toast error appears and nothing is sent to the server (check the network tab shows no `upsertMonth` request, or that a subsequent reload still shows the pre-save state).

- [ ] **Step 7: Verify read-only role cannot edit**

Log in as (or switch context to) a `visualizador` user and confirm the "Adicionar despesa" button and the remove/trash icons are not rendered, and the custom line inputs are disabled.

- [ ] **Step 8: Clean up**

Stop the dev server, restore the original `.env` and git branch/commit in the main checkout directory exactly as they were before Step 1, and take a screenshot of the working feature for the record.
