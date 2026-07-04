# Redesign de UI (Dashboard, Lançamentos, Mobile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Dashboard, Entradas/Saídas and mobile navigation to match the approved reference layout, keeping the current navy + red color palette and making zero backend/schema changes.

**Architecture:** Extract pure calculation helpers (percentages, CSV building, search matching, recent-movement merging) into small testable modules under `client/src/lib/`, then build small presentational components that consume them. Wire the new components into the existing pages (`Dashboard.tsx`, `Entries.tsx`, `Expenses.tsx`, `DashboardLayout.tsx`) without touching `server/`, `shared/`, or `drizzle/`.

**Tech Stack:** React + TypeScript + Vite, Tailwind CSS v4, shadcn/ui (Radix), recharts, lucide-react, wouter, tRPC, vitest (node environment, no jsdom — component verification is manual via the dev server, not automated).

**Testing approach in this codebase:** There is no React component test harness (no jsdom, no @testing-library/react). vitest currently only scans `server/**/*.test.ts`. This plan:
- Writes real `vitest` unit tests for every **pure function** (percentages, CSV, search, movement merge) — these need no DOM.
- Verifies every **visual/component** change manually in the browser via the running dev server (per project convention for UI work), not with automated component tests. Don't invent a testing-library setup for this — it's out of scope (see spec's "Fora de escopo").

---

## Task 0: Let vitest also pick up client-side unit tests

**Files:**
- Modify: `vitest.config.ts:15`

- [ ] **Step 1: Update the test include glob**

In `vitest.config.ts`, change:

```ts
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
  },
```

to:

```ts
  test: {
    environment: "node",
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "client/src/lib/**/*.test.ts",
    ],
  },
```

- [ ] **Step 2: Run the suite to confirm nothing broke**

Run: `npx vitest run`
Expected: same tests as before pass (no `client/src/lib/*.test.ts` files exist yet, so no new tests run).

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "chore: let vitest pick up client/src/lib unit tests"
```

---

## Task 1: Dashboard math helpers — expense share, recent movements, goal card

**Files:**
- Create: `client/src/lib/dashboardMath.ts`
- Test: `client/src/lib/dashboardMath.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `client/src/lib/dashboardMath.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run client/src/lib/dashboardMath.test.ts`
Expected: FAIL with `Cannot find module './dashboardMath'`

- [ ] **Step 3: Implement the helpers**

Create `client/src/lib/dashboardMath.ts`:

```ts
export interface CategoryAmount {
  name: string;
  value: number;
}

export interface ExpenseShareItem {
  name: string;
  value: number;
  pct: number;
}

export interface ExpenseShareResult {
  items: ExpenseShareItem[];
  totalExpenses: number;
  totalPct: number;
}

export function calculateExpenseSharePct(
  expenseCategoryData: CategoryAmount[],
  totalEntries: number
): ExpenseShareResult {
  if (totalEntries <= 0) {
    return { items: [], totalExpenses: 0, totalPct: 0 };
  }

  const items = expenseCategoryData
    .map((category) => ({
      name: category.name,
      value: category.value,
      pct: (category.value / totalEntries) * 100,
    }))
    .sort((a, b) => b.value - a.value);

  const totalExpenses = expenseCategoryData.reduce((sum, category) => sum + category.value, 0);
  const totalPct = (totalExpenses / totalEntries) * 100;

  return { items, totalExpenses, totalPct };
}

export interface Movement {
  id: string;
  description: string;
  date: Date;
  amount: number;
  type: "entrada" | "saida";
}

interface EntryLike {
  id: number;
  description?: string | null;
  category: string;
  entryDate: string | Date;
  amount: string;
}

interface ExpenseLike {
  id: number;
  description?: string | null;
  category: string;
  expenseDate: string | Date;
  amount: string;
}

export function buildRecentMovements(
  entries: EntryLike[],
  expenses: ExpenseLike[],
  limit: number
): Movement[] {
  const fromEntries: Movement[] = entries.map((entry) => ({
    id: `entry-${entry.id}`,
    description: entry.description?.trim() || entry.category.replace(/_/g, " "),
    date: new Date(entry.entryDate),
    amount: parseFloat(entry.amount),
    type: "entrada",
  }));

  const fromExpenses: Movement[] = expenses.map((expense) => ({
    id: `expense-${expense.id}`,
    description: expense.description?.trim() || expense.category.replace(/_/g, " "),
    date: new Date(expense.expenseDate),
    amount: parseFloat(expense.amount),
    type: "saida",
  }));

  return [...fromEntries, ...fromExpenses]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit);
}

export type GoalCardData =
  | {
      kind: "goal";
      label: string;
      currentValue: number;
      goalValue: number;
      pct: number;
    }
  | {
      kind: "count";
      entriesCount: number;
      expensesCount: number;
    };

export function getGoalCardData(
  monthlyEntriesGoal: number,
  totalEntries: number,
  entriesCount: number,
  expensesCount: number
): GoalCardData {
  if (monthlyEntriesGoal > 0) {
    return {
      kind: "goal",
      label: "Meta de Entradas",
      currentValue: totalEntries,
      goalValue: monthlyEntriesGoal,
      pct: (totalEntries / monthlyEntriesGoal) * 100,
    };
  }
  return { kind: "count", entriesCount, expensesCount };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run client/src/lib/dashboardMath.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/dashboardMath.ts client/src/lib/dashboardMath.test.ts
git commit -m "feat: add dashboard math helpers for expense share, recent movements, goal card"
```

---

## Task 2: `CategoryLegend` component (donut side legend)

**Files:**
- Create: `client/src/components/dashboard/CategoryLegend.tsx`

- [ ] **Step 1: Implement the component**

```tsx
interface CategoryLegendItem {
  name: string;
  value: number;
  color: string;
}

interface CategoryLegendProps {
  items: CategoryLegendItem[];
  formatValue: (n: number) => string;
}

export function CategoryLegend({ items, formatValue }: CategoryLegendProps) {
  if (items.length === 0) {
    return <div className="text-center py-6 text-sm text-muted-foreground">Nenhum dado disponível</div>;
  }

  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.name} className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 min-w-0">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="capitalize text-muted-foreground truncate">{item.name.toLowerCase()}</span>
          </span>
          <span className="font-medium shrink-0">{formatValue(item.value)}</span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/dashboard/CategoryLegend.tsx
git commit -m "feat: add CategoryLegend component for donut side legend"
```

---

## Task 3: `ExpensesByCategoryBars` component (new chart)

**Files:**
- Create: `client/src/components/dashboard/ExpensesByCategoryBars.tsx`

- [ ] **Step 1: Implement the component**

```tsx
import type { ExpenseShareItem } from "@/lib/dashboardMath";

interface ExpensesByCategoryBarsProps {
  items: ExpenseShareItem[];
  totalExpenses: number;
  totalPct: number;
  colors: string[];
  formatValue: (n: number) => string;
}

export function ExpensesByCategoryBars({
  items,
  totalExpenses,
  totalPct,
  colors,
  formatValue,
}: ExpensesByCategoryBarsProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        Nenhum dado disponível
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.name}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="capitalize">{item.name.toLowerCase()}</span>
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{formatValue(item.value)}</span>
              {" · "}
              {item.pct.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(item.pct, 100)}%`,
                backgroundColor: colors[index % colors.length],
              }}
            />
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between text-xs pt-2 mt-1 border-t">
        <span className="text-muted-foreground">Total de saídas</span>
        <span>
          <span className="font-semibold text-red-600 dark:text-red-400">{formatValue(totalExpenses)}</span>
          {" · "}
          {totalPct.toFixed(1)}% das entradas
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/dashboard/ExpensesByCategoryBars.tsx
git commit -m "feat: add ExpensesByCategoryBars dashboard chart"
```

---

## Task 4: `RecentMovements` component

**Files:**
- Create: `client/src/components/dashboard/RecentMovements.tsx`

- [ ] **Step 1: Implement the component**

```tsx
import { useLocation } from "wouter";
import type { Movement } from "@/lib/dashboardMath";

interface RecentMovementsProps {
  movements: Movement[];
  formatValue: (n: number) => string;
}

export function RecentMovements({ movements, formatValue }: RecentMovementsProps) {
  const [, setLocation] = useLocation();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">Movimentação recente</span>
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => setLocation("/entries")}
        >
          Ver todos
        </button>
      </div>
      {movements.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">Nenhuma movimentação recente</div>
      ) : (
        <div className="space-y-0.5">
          {movements.map((movement) => (
            <div
              key={movement.id}
              className="flex items-center justify-between py-2 text-sm border-b last:border-0"
            >
              <span className="capitalize text-muted-foreground truncate pr-2">{movement.description}</span>
              <span
                className={`font-semibold shrink-0 ${
                  movement.type === "entrada" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                }`}
              >
                {movement.type === "entrada" ? "+" : "−"}
                {formatValue(movement.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/dashboard/RecentMovements.tsx
git commit -m "feat: add RecentMovements dashboard component"
```

---

## Task 5: Wire the new components into `Dashboard.tsx`

**Files:**
- Modify: `client/src/pages/Dashboard.tsx`

- [ ] **Step 1: Add the new imports**

At the top of `client/src/pages/Dashboard.tsx`, replace the `AreaChart`/`Area` recharts import with `BarChart`/`Bar`, and add the new local component imports:

```ts
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CategoryLegend } from "@/components/dashboard/CategoryLegend";
import { ExpensesByCategoryBars } from "@/components/dashboard/ExpensesByCategoryBars";
import { RecentMovements } from "@/components/dashboard/RecentMovements";
import { calculateExpenseSharePct, buildRecentMovements, getGoalCardData } from "@/lib/dashboardMath";
```

- [ ] **Step 2: Compute the new derived data**

Right after the existing `expenseCategoryData` memo (around line 207 in the original file), add:

```ts
  const expenseShare = useMemo(
    () => calculateExpenseSharePct(expenseCategoryData, stats?.totalEntries ?? 0),
    [expenseCategoryData, stats?.totalEntries]
  );

  const recentMovements = useMemo(
    () => buildRecentMovements(entries ?? [], expenses ?? [], 5),
    [entries, expenses]
  );

  const goalCardData = useMemo(
    () => getGoalCardData(monthlyEntriesGoal, stats?.totalEntries ?? 0, entries?.length ?? 0, expenses?.length ?? 0),
    [monthlyEntriesGoal, stats?.totalEntries, entries?.length, expenses?.length]
  );
```

`monthlyEntriesGoal` already exists a few lines above (`const monthlyEntriesGoal = parseFloat(annualBudget?.monthlyEntriesGoal ?? "0") || 0;`) — no change needed there.

- [ ] **Step 3: Replace the 4th KPI ("Lançamentos") with the goal/count card**

Replace the last object in the `kpis` array (the one with `label: "Lançamentos"`) with:

```ts
    goalCardData.kind === "goal"
      ? {
          label: goalCardData.label,
          value: brl(goalCardData.currentValue),
          hint: `${goalCardData.pct.toFixed(0)}% de ${brl(goalCardData.goalValue)}`,
          icon: Target,
          iconClass: "text-blue-600 dark:text-blue-400",
          badgeClass: "bg-blue-500/10",
          accent: "from-blue-500/15",
          valueClass: "text-foreground",
          progressPct: Math.min(goalCardData.pct, 100),
        }
      : {
          label: "Lançamentos",
          value: String(goalCardData.entriesCount + goalCardData.expensesCount),
          hint: `${goalCardData.entriesCount} entradas · ${goalCardData.expensesCount} saídas`,
          icon: ListChecks,
          iconClass: "text-amber-600 dark:text-amber-400",
          badgeClass: "bg-amber-500/10",
          accent: "from-amber-500/15",
          valueClass: "text-foreground",
        },
```

Add `Target` to the `lucide-react` import list at the top of the file (it already imports `TrendingUp, TrendingDown, Wallet, ListChecks, ArrowUpRight, ArrowDownRight` — append `Target`).

- [ ] **Step 4: Render the progress bar for the goal card**

In the KPI card render loop, after the existing `goalPct` badge block, add a progress bar for cards that carry `progressPct`:

```tsx
                  {"progressPct" in kpi && kpi.progressPct !== undefined && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${kpi.progressPct}%` }}
                      />
                    </div>
                  )}
```

- [ ] **Step 5: Swap the area chart for a grouped bar chart**

Replace the `<AreaChart>...</AreaChart>` block (inside the "Gráfico de Área - Evolução Mensal" `CardContent`) with:

```tsx
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={chartView === "mensal" ? monthlyData : weeklyData}
                    margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey={chartView === "mensal" ? "month" : "week"}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                      width={56}
                      tickFormatter={(v) => brlCompact(Number(v))}
                    />
                    <Tooltip
                      formatter={(value: any) => brl(Number(value))}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid hsl(var(--border))",
                        fontSize: 13,
                      }}
                    />
                    <Legend />
                    <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
```

(Delete the now-unused `<defs>` gradient block that was inside the old `AreaChart`.)

- [ ] **Step 6: Replace the donut's inline labels with the side legend**

In the "Distribuição por Categoria" card, remove the `label={({ name, value }) => ...}` prop from `<Pie>` and shrink the chart to make room, then render `CategoryLegend` beside it. Replace the whole `CardContent` of that card with:

```tsx
            <CardContent>
              {categoryData.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <ResponsiveContainer width="100%" height={220} className="sm:max-w-[220px]">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {(() => {
                          let otherIndex = 0;
                          return categoryData.map((entry, index) => {
                            const color = getCategoryColor(entry.name, entry.name === "DIZIMO" ? 0 : otherIndex);
                            if (entry.name !== "DIZIMO") otherIndex++;
                            return <Cell key={`cell-${index}`} fill={color} />;
                          });
                        })()}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => brl(Number(value))}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid hsl(var(--border))",
                          fontSize: 13,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-full sm:flex-1">
                    <CategoryLegend
                      items={(() => {
                        let otherIndex = 0;
                        return categoryData.map((entry) => {
                          const color = getCategoryColor(entry.name, entry.name === "DIZIMO" ? 0 : otherIndex);
                          if (entry.name !== "DIZIMO") otherIndex++;
                          return { name: entry.name, value: entry.value, color };
                        });
                      })()}
                      formatValue={brl}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
```

- [ ] **Step 7: Add the "Saídas por categoria" card and "Movimentação recente" card**

After the existing "Distribuição de Saídas por Categoria" card (the pie chart one — leave it as-is), add two new `Card`s at the end of the charts grid, still inside the same `<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">` wrapper (make it a 3rd/4th cell):

```tsx
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Saídas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ExpensesByCategoryBars
                items={expenseShare.items}
                totalExpenses={expenseShare.totalExpenses}
                totalPct={expenseShare.totalPct}
                colors={EXPENSE_COLORS}
                formatValue={brl}
              />
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardContent className="pt-6">
              <RecentMovements movements={recentMovements} formatValue={brl} />
            </CardContent>
          </Card>
```

- [ ] **Step 8: Manually verify in the browser**

Run: `npm run dev`
Open the dashboard in the browser. Confirm:
- The 4th KPI card shows the goal/progress bar when an annual budget exists for the selected year, and falls back to the "Lançamentos" count card otherwise.
- The monthly/weekly toggle still works and now renders grouped bars.
- The donut shows a side legend with category name + R$ value.
- "Saídas por Categoria" renders horizontal bars with `%` of total entries.
- "Movimentação recente" lists the latest entries/expenses and "Ver todos" navigates to `/entries`.

- [ ] **Step 9: Commit**

```bash
git add client/src/pages/Dashboard.tsx
git commit -m "feat: restructure Dashboard with bar chart, side legend, expense share and recent movements"
```

---

## Task 6: `CategoryIcon` shared component

**Files:**
- Create: `client/src/components/transactions/CategoryIcon.tsx`

- [ ] **Step 1: Implement the component**

```tsx
import {
  HandCoins,
  Gift,
  Star,
  Megaphone,
  Globe,
  HardHat,
  ShoppingBag,
  UtensilsCrossed,
  Coffee,
  HeartHandshake,
  CircleDollarSign,
  Droplet,
  Zap,
  Wifi,
  Home,
  SprayCan,
  BookOpen,
  Wrench,
  Settings2,
  Receipt,
  type LucideIcon,
} from "lucide-react";

const ENTRY_ICONS: Record<string, LucideIcon> = {
  dizimo: HandCoins,
  oferta: Gift,
  oferta_especial: Star,
  campanha: Megaphone,
  missoes: Globe,
  construcao: HardHat,
  bazar: ShoppingBag,
  almoco_beneficente: UtensilsCrossed,
  cantina: Coffee,
  doacao: HeartHandshake,
  outras_receitas: CircleDollarSign,
};

const EXPENSE_ICONS: Record<string, LucideIcon> = {
  agua: Droplet,
  energia: Zap,
  internet: Wifi,
  aluguel: Home,
  material_limpeza: SprayCan,
  evangelismo: BookOpen,
  missoes: Globe,
  construcao: HardHat,
  equipamentos: Wrench,
  manutencao: Settings2,
  outras_despesas: Receipt,
};

interface CategoryIconProps {
  category: string;
  type: "entrada" | "saida";
}

export function CategoryIcon({ category, type }: CategoryIconProps) {
  const Icon = (type === "entrada" ? ENTRY_ICONS[category] : EXPENSE_ICONS[category]) ?? CircleDollarSign;
  const color = type === "entrada" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
  const bg = type === "entrada" ? "bg-emerald-500/10" : "bg-red-500/10";

  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>
      <Icon className={`h-4 w-4 ${color}`} />
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/transactions/CategoryIcon.tsx
git commit -m "feat: add shared CategoryIcon component"
```

---

## Task 7: CSV export helper

**Files:**
- Create: `client/src/lib/exportCsv.ts`
- Test: `client/src/lib/exportCsv.test.ts`

- [ ] **Step 1: Write the failing test**

Create `client/src/lib/exportCsv.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildCsv } from "./exportCsv";

describe("buildCsv", () => {
  it("builds a header row plus one row per item", () => {
    const rows = [
      { name: "João", amount: 500 },
      { name: "Maria", amount: 1240 },
    ];
    const csv = buildCsv(rows, [
      { header: "Nome", value: (r) => r.name },
      { header: "Valor", value: (r) => r.amount.toFixed(2) },
    ]);
    expect(csv).toBe("Nome,Valor\nJoão,500.00\nMaria,1240.00");
  });

  it("quotes and escapes values containing commas, quotes, or newlines", () => {
    const rows = [{ text: 'Contém "aspas", vírgula e\nquebra' }];
    const csv = buildCsv(rows, [{ header: "Texto", value: (r) => r.text }]);
    expect(csv).toBe('Texto\n"Contém ""aspas"", vírgula e\nquebra"');
  });

  it("returns just the header when there are no rows", () => {
    const csv = buildCsv([], [{ header: "Nome", value: () => "" }]);
    expect(csv).toBe("Nome");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run client/src/lib/exportCsv.test.ts`
Expected: FAIL with `Cannot find module './exportCsv'`

- [ ] **Step 3: Implement `buildCsv` and `downloadCsv`**

Create `client/src/lib/exportCsv.ts`:

```ts
export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string;
}

function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((column) => escapeCsvValue(column.header)).join(",");
  const lines = rows.map((row) => columns.map((column) => escapeCsvValue(column.value(row))).join(","));
  return [header, ...lines].join("\n");
}

export function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

`downloadCsv` touches the DOM/Blob APIs and is intentionally not unit tested here — it's verified manually in Task 9/10's browser check.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run client/src/lib/exportCsv.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/exportCsv.ts client/src/lib/exportCsv.test.ts
git commit -m "feat: add buildCsv/downloadCsv export helpers"
```

---

## Task 8: Search-matching helper

**Files:**
- Create: `client/src/lib/searchTransactions.ts`
- Test: `client/src/lib/searchTransactions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `client/src/lib/searchTransactions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { matchesSearch } from "./searchTransactions";

describe("matchesSearch", () => {
  it("matches when any field contains the query, case-insensitively", () => {
    expect(matchesSearch("joão", ["Dízimo mensal", "João Silva"])).toBe(true);
    expect(matchesSearch("JOÃO", ["Dízimo mensal", "João Silva"])).toBe(true);
  });

  it("returns false when no field contains the query", () => {
    expect(matchesSearch("maria", ["Dízimo mensal", "João Silva"])).toBe(false);
  });

  it("treats an empty or whitespace-only query as matching everything", () => {
    expect(matchesSearch("", ["qualquer coisa"])).toBe(true);
    expect(matchesSearch("   ", ["qualquer coisa"])).toBe(true);
  });

  it("tolerates null/undefined fields", () => {
    expect(matchesSearch("silva", [null, undefined, "João Silva"])).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run client/src/lib/searchTransactions.test.ts`
Expected: FAIL with `Cannot find module './searchTransactions'`

- [ ] **Step 3: Implement `matchesSearch`**

Create `client/src/lib/searchTransactions.ts`:

```ts
export function matchesSearch(query: string, fields: Array<string | null | undefined>): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return fields.some((field) => (field ?? "").toLowerCase().includes(normalizedQuery));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run client/src/lib/searchTransactions.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/searchTransactions.ts client/src/lib/searchTransactions.test.ts
git commit -m "feat: add matchesSearch helper for transaction search"
```

---

## Task 9: Restyle `Entries.tsx` — icons, colored values, search, export

**Files:**
- Modify: `client/src/pages/Entries.tsx`

- [ ] **Step 1: Add the new imports**

```ts
import { Loader2, Plus, X, Pencil, Search, Download } from "lucide-react";
import { CategoryIcon } from "@/components/transactions/CategoryIcon";
import { matchesSearch } from "@/lib/searchTransactions";
import { buildCsv, downloadCsv } from "@/lib/exportCsv";
```

(This replaces the existing `import { Loader2, Plus, X, Pencil } from "lucide-react";` line.)

- [ ] **Step 2: Add search state and extend the filter memo**

Add next to the other filter state declarations:

```ts
  const [searchQuery, setSearchQuery] = useState("");
```

Update the `filteredEntries` memo body to also check the search query — add this as the first check inside the `.filter((entry) => {` callback:

```ts
      const memberName = entry.memberId ? members?.find((m) => m.id === entry.memberId)?.name : undefined;
      if (!matchesSearch(searchQuery, [entry.description, memberName, entry.category])) return false;
```

Add `searchQuery` and `members` to the memo's dependency array: `[entries, members, filterCategory, filterPaymentMethod, filterMemberId, filterDateFrom, filterDateTo, searchQuery]`.

- [ ] **Step 3: Add the export handler**

Add this function near `clearFilters`:

```ts
  const handleExport = () => {
    const csv = buildCsv(filteredEntries, [
      { header: "Data", value: (e) => new Date(e.entryDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) },
      { header: "Categoria", value: (e) => e.category.replace(/_/g, " ") },
      { header: "Membro", value: (e) => (e.memberId ? members?.find((m) => m.id === e.memberId)?.name ?? "" : "") },
      { header: "Valor", value: (e) => parseFloat(e.amount).toFixed(2) },
      { header: "Forma de Pagamento", value: (e) => e.paymentMethod },
    ]);
    downloadCsv(`entradas-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };
```

- [ ] **Step 4: Add the search input and export button to the header**

Replace the header `<div className="flex items-start justify-between gap-3">...</div>` block's contents so it also renders a search input and an export button alongside the existing "Nova Entrada" button:

```tsx
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Entradas</h1>
            <p className="text-sm text-muted-foreground">Dízimos, ofertas e outras receitas</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição ou membro…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 w-full sm:w-56"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredEntries.length === 0}>
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            {isTreasurer(user?.role) && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size={isMobile ? "sm" : "default"} id="new-entry-btn">
                    <Plus className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Nova Entrada</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Registrar Nova Entrada</DialogTitle>
                  </DialogHeader>
                  <EntryForm onSuccess={() => setOpen(false)} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
```

- [ ] **Step 5: Add the category icon and colored value to each table row**

In the table body, change the `Categoria` cell and `Valor` cell of each `<TableRow>`:

```tsx
                        <TableCell className="capitalize">
                          <span className="flex items-center gap-2">
                            <CategoryIcon category={entry.category} type="entrada" />
                            {entry.category.replace(/_/g, " ")}
                          </span>
                        </TableCell>
                        <TableCell>{entry.memberId ? "Membro ID: " + entry.memberId : "-"}</TableCell>
                        <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">
                          +R$ {parseFloat(entry.amount).toFixed(2)}
                        </TableCell>
```

- [ ] **Step 6: Restyle the active-filters summary as pill badges**

Replace the existing `{hasActiveFilters && ( ... )}` block (which shows plain text + a "Limpar" button) with pill-styled `Badge`s, one per active filter:

```tsx
            {hasActiveFilters && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {filterCategory !== "all" && (
                  <Badge variant="secondary" className="rounded-full capitalize">{filterCategory.replace(/_/g, " ")}</Badge>
                )}
                {filterPaymentMethod !== "all" && (
                  <Badge variant="secondary" className="rounded-full capitalize">{filterPaymentMethod}</Badge>
                )}
                {filterMemberId !== "all" && filterMemberId !== "" && (
                  <Badge variant="secondary" className="rounded-full">
                    {members?.find((m) => m.id.toString() === filterMemberId)?.name ?? "Membro"}
                  </Badge>
                )}
                {(filterDateFrom || filterDateTo) && (
                  <Badge variant="secondary" className="rounded-full">Período filtrado</Badge>
                )}
                <span className="text-xs text-muted-foreground">{filteredEntries.length} resultado(s)</span>
                <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2 text-xs sm:text-sm">
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                  Limpar
                </Button>
              </div>
            )}
```

- [ ] **Step 7: Manually verify in the browser**

Run: `npm run dev`
Open `/entries`. Confirm:
- Each row shows a colored icon next to the category.
- Values render in green with a `+` prefix.
- Typing in the search box filters by description/member/category.
- "Exportar" downloads a CSV with the currently filtered rows and is disabled when the list is empty.
- Active filters render as pill badges above the result count.

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/Entries.tsx
git commit -m "feat: add search, CSV export, category icons and pill filters to Entradas"
```

---

## Task 10: Restyle `Expenses.tsx` — icons, colored values, search, export

**Files:**
- Modify: `client/src/pages/Expenses.tsx`

- [ ] **Step 1: Add the new imports**

Replace `import { Loader2, Plus, X, Pencil } from "lucide-react";` with:

```ts
import { Loader2, Plus, X, Pencil, Search, Download } from "lucide-react";
import { CategoryIcon } from "@/components/transactions/CategoryIcon";
import { matchesSearch } from "@/lib/searchTransactions";
import { buildCsv, downloadCsv } from "@/lib/exportCsv";
```

- [ ] **Step 2: Add search state and extend the filter memo**

```ts
  const [searchQuery, setSearchQuery] = useState("");
```

In `filteredExpenses`, add as the first check inside the filter callback:

```ts
      if (!matchesSearch(searchQuery, [expense.description, expense.supplier, expense.category])) return false;
```

Add `searchQuery` to the memo's dependency array: `[expenses, filterCategory, filterStatus, filterCostCenter, filterDateFrom, filterDateTo, searchQuery]`.

- [ ] **Step 3: Add the export handler**

```ts
  const handleExport = () => {
    const csv = buildCsv(filteredExpenses, [
      { header: "Data", value: (e) => new Date(e.expenseDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) },
      { header: "Categoria", value: (e) => e.category.replace(/_/g, " ") },
      { header: "Fornecedor", value: (e) => e.supplier ?? "" },
      { header: "Valor", value: (e) => parseFloat(e.amount).toFixed(2) },
      { header: "Status", value: (e) => e.paymentStatus },
    ]);
    downloadCsv(`saidas-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };
```

- [ ] **Step 4: Add the search input and export button to the header**

Mirror Task 9 Step 4's layout, swapping "Nova Entrada" for the existing "Nova Despesa" dialog trigger:

```tsx
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Saídas</h1>
            <p className="text-sm text-muted-foreground">Despesas e saídas financeiras</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição ou fornecedor…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 w-full sm:w-56"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredExpenses.length === 0}>
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            {isTreasurer(user?.role) && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size={isMobile ? "sm" : "default"} id="new-expense-btn">
                    <Plus className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Nova Despesa</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Registrar Nova Despesa</DialogTitle>
                  </DialogHeader>
                  <ExpenseForm onSuccess={() => setOpen(false)} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
```

- [ ] **Step 5: Add the category icon and colored value to each table row**

```tsx
                        <TableCell className="capitalize">
                          <span className="flex items-center gap-2">
                            <CategoryIcon category={expense.category} type="saida" />
                            {expense.category.replace(/_/g, " ")}
                          </span>
                        </TableCell>
                        <TableCell>{expense.supplier || "-"}</TableCell>
                        <TableCell className="font-semibold text-red-600 dark:text-red-400">
                          −R$ {parseFloat(expense.amount).toFixed(2)}
                        </TableCell>
```

- [ ] **Step 6: Restyle the active-filters summary as pill badges**

Replace the existing `{hasActiveFilters && ( ... )}` block with pill-styled `Badge`s, mirroring Task 9 Step 6:

```tsx
            {hasActiveFilters && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {filterCategory !== "all" && (
                  <Badge variant="secondary" className="rounded-full capitalize">{filterCategory.replace(/_/g, " ")}</Badge>
                )}
                {filterStatus !== "all" && (
                  <Badge variant="secondary" className="rounded-full capitalize">{filterStatus}</Badge>
                )}
                {filterCostCenter !== "all" && (
                  <Badge variant="secondary" className="rounded-full">
                    {costCenters?.find((cc) => cc.id.toString() === filterCostCenter)?.name ?? "Centro de custo"}
                  </Badge>
                )}
                {(filterDateFrom || filterDateTo) && (
                  <Badge variant="secondary" className="rounded-full">Período filtrado</Badge>
                )}
                <span className="text-xs text-muted-foreground">{filteredExpenses.length} resultado(s)</span>
                <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2 text-xs sm:text-sm">
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                  Limpar
                </Button>
              </div>
            )}
```

- [ ] **Step 7: Manually verify in the browser**

Run: `npm run dev`
Open `/expenses`. Confirm the same behaviors as Task 9 (icons, colored `−` values, search, export, disabled state, pill-styled active filters).

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/Expenses.tsx
git commit -m "feat: add search, CSV export, category icons and pill filters to Saídas"
```

---

## Task 11: `BottomNav` component (mobile tab bar + FAB action sheet)

**Files:**
- Create: `client/src/components/BottomNav.tsx`

- [ ] **Step 1: Implement the component**

```tsx
import { useState } from "react";
import { useLocation } from "wouter";
import {
  Home,
  ListChecks,
  Plus,
  FileText,
  Menu,
  Users,
  Banknote,
  Target,
  Receipt,
  Settings,
  LogOut,
} from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";

interface BottomNavProps {
  onSelectEntry: () => void;
  onSelectExpense: () => void;
}

const TABS = [
  { icon: Home, label: "Início", path: "/dashboard" },
  { icon: ListChecks, label: "Lançamentos", path: "/entries" },
] as const;

const MORE_LINKS = [
  { icon: Users, label: "Membros", path: "/members" },
  { icon: Banknote, label: "Centros de Custo", path: "/cost-centers" },
  { icon: Target, label: "Orçamento Anual", path: "/annual-budget" },
  { icon: FileText, label: "Relatórios", path: "/reports" },
  { icon: Receipt, label: "Recibos", path: "/receipts" },
  { icon: Settings, label: "Configurações", path: "/settings" },
] as const;

export function BottomNav({ onSelectEntry, onSelectExpense }: BottomNavProps) {
  const [location, setLocation] = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { logout } = useAuth();

  const renderTab = (tab: { icon: typeof Home; label: string; path: string }) => {
    const isActive = location === tab.path;
    const Icon = tab.icon;
    return (
      <button
        key={tab.path}
        type="button"
        onClick={() => setLocation(tab.path)}
        className={`flex flex-col items-center gap-1 px-3 py-1.5 text-[10px] ${
          isActive ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <Icon className="h-5 w-5" />
        {tab.label}
      </button>
    );
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:backdrop-blur">
        {TABS.map(renderTab)}
        <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
          <Button
            type="button"
            size="icon"
            className="-mt-6 h-12 w-12 rounded-full shadow-lg"
            onClick={() => setSheetOpen(true)}
            id="mobile-fab"
          >
            <Plus className="h-6 w-6" />
          </Button>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Novo lançamento</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-2 px-4 pb-6">
              <DrawerClose asChild>
                <Button
                  className="justify-start bg-emerald-600 hover:bg-emerald-700"
                  onClick={onSelectEntry}
                >
                  Nova Entrada
                </Button>
              </DrawerClose>
              <DrawerClose asChild>
                <Button
                  className="justify-start bg-red-600 hover:bg-red-700"
                  onClick={onSelectExpense}
                >
                  Nova Saída
                </Button>
              </DrawerClose>
            </div>
          </DrawerContent>
        </Drawer>
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 text-[10px] ${
            moreOpen ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Menu className="h-5 w-5" />
          Mais
        </button>
      </nav>
      <div className="h-16" aria-hidden="true" />

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Mais opções</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-1 px-4 pb-6">
            {MORE_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <DrawerClose asChild key={link.path}>
                  <button
                    type="button"
                    onClick={() => setLocation(link.path)}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-muted"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {link.label}
                  </button>
                </DrawerClose>
              );
            })}
            <DrawerClose asChild>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
```

`onSelectEntry`/`onSelectExpense` are provided by `DashboardLayout` (Task 13) so `BottomNav` stays presentational and doesn't own the form dialogs itself. The "Mais" tab opens a drawer linking to every secondary page (Membros, Centros de Custo, Orçamento Anual, Recibos, Configurações) plus Sair, matching spec section 3.1 — no new route/page needed, and it reuses the same `Drawer` primitive as the FAB sheet.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/BottomNav.tsx
git commit -m "feat: add mobile BottomNav with FAB action sheet"
```

---

## Task 12: `FullScreenFormSheet` wrapper (mobile full-screen form)

**Files:**
- Create: `client/src/components/FullScreenFormSheet.tsx`

- [ ] **Step 1: Implement the component**

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface FullScreenFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}

export function FullScreenFormSheet({ open, onOpenChange, title, children }: FullScreenFormSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] w-screen max-w-none rounded-none sm:rounded-lg sm:h-auto sm:max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
```

This reuses the existing `Dialog` primitive (so `EntryForm`/`ExpenseForm` need zero changes) but forces it to fill the viewport below the `sm:` breakpoint, and behaves like today's compact dialog on desktop.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/FullScreenFormSheet.tsx
git commit -m "feat: add FullScreenFormSheet wrapper for mobile forms"
```

---

## Task 13: Wire `BottomNav` + full-screen forms into `DashboardLayout.tsx`

**Files:**
- Modify: `client/src/components/DashboardLayout.tsx`

- [ ] **Step 1: Add the new imports**

```ts
import { BottomNav } from "./BottomNav";
import { FullScreenFormSheet } from "./FullScreenFormSheet";
import { EntryForm } from "./forms/EntryForm";
import { ExpenseForm } from "./forms/ExpenseForm";
```

- [ ] **Step 2: Add local state for the two mobile form sheets**

Inside `DashboardLayoutContent`, alongside the existing `useState` calls:

```ts
  const [mobileEntryOpen, setMobileEntryOpen] = useState(false);
  const [mobileExpenseOpen, setMobileExpenseOpen] = useState(false);
```

- [ ] **Step 3: Hide the `Sidebar` on mobile and render `BottomNav` + the sheets instead**

Wrap the existing `<Sidebar>` element (and its resize handle sibling) so it only renders when `!isMobile`:

```tsx
      <div className="relative" ref={sidebarRef}>
        {!isMobile && (
          <Sidebar
            collapsible="icon"
            className="border-r-0 bg-sidebar text-sidebar-foreground"
            disableTransition={isResizing}
          >
            {/* ...unchanged SidebarHeader/SidebarContent/SidebarFooter... */}
          </Sidebar>
        )}

        {/* Desktop resize handle */}
        {!isMobile && (
          <div
            className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
            onMouseDown={() => {
              if (isCollapsed) return;
              setIsResizing(true);
            }}
            style={{ zIndex: 50 }}
          />
        )}
      </div>
```

(The `collapsible={isMobile ? "offcanvas" : "icon"}` prop simplifies to `"icon"` since this element no longer renders at all on mobile.)

Then, right before the closing `</>` of `DashboardLayoutContent`'s returned fragment, add:

```tsx
      {isMobile && (
        <>
          <BottomNav
            onSelectEntry={() => setMobileEntryOpen(true)}
            onSelectExpense={() => setMobileExpenseOpen(true)}
          />
          <FullScreenFormSheet open={mobileEntryOpen} onOpenChange={setMobileEntryOpen} title="Nova Entrada">
            <EntryForm onSuccess={() => setMobileEntryOpen(false)} />
          </FullScreenFormSheet>
          <FullScreenFormSheet open={mobileExpenseOpen} onOpenChange={setMobileExpenseOpen} title="Nova Saída">
            <ExpenseForm onSuccess={() => setMobileExpenseOpen(false)} />
          </FullScreenFormSheet>
        </>
      )}
```

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev`
Resize the browser to a mobile width (< 768px, matching `MOBILE_BREAKPOINT` in `useMobile.tsx`). Confirm:
- The side `Sidebar` is gone; the bottom tab bar with a centered "+" FAB appears instead.
- Tapping "Início"/"Lançamentos" navigates correctly and highlights the active tab.
- Tapping "+" opens a drawer with "Nova Entrada"/"Nova Saída".
- Choosing either opens a full-screen form; submitting it closes the sheet and the new record appears in the relevant list.
- Tapping "Mais" opens a drawer linking to Membros, Centros de Custo, Orçamento Anual, Relatórios, Recibos, Configurações, and Sair.
- Resize back above 768px — the classic left `Sidebar` reappears and the bottom nav disappears.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/DashboardLayout.tsx
git commit -m "feat: swap sidebar for BottomNav + full-screen forms on mobile"
```

---

## Task 14: `MobileBalanceCard` component

**Files:**
- Create: `client/src/components/dashboard/MobileBalanceCard.tsx`

- [ ] **Step 1: Implement the component**

```tsx
interface MobileBalanceCardProps {
  balance: number;
  totalEntries: number;
  totalExpenses: number;
  formatValue: (n: number) => string;
}

export function MobileBalanceCard({ balance, totalEntries, totalExpenses, formatValue }: MobileBalanceCardProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[color:var(--sidebar-primary)] to-[color:var(--accent)] p-4 text-white">
      <div className="text-xs opacity-80">Saldo em caixa</div>
      <div className="mt-0.5 text-2xl font-bold">{formatValue(balance)}</div>
      <div className="mt-3 flex gap-2">
        <div className="flex-1 rounded-xl bg-white/15 p-2.5">
          <div className="text-[10px] opacity-85">↓ Entradas</div>
          <div className="text-sm font-semibold">{formatValue(totalEntries)}</div>
        </div>
        <div className="flex-1 rounded-xl bg-white/15 p-2.5">
          <div className="text-[10px] opacity-85">↑ Saídas</div>
          <div className="text-sm font-semibold">{formatValue(totalExpenses)}</div>
        </div>
      </div>
    </div>
  );
}
```

Uses the existing `--sidebar-primary` (dark navy) and `--accent` (Methodist red) CSS variables from `index.css`, so no new colors are introduced.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/dashboard/MobileBalanceCard.tsx
git commit -m "feat: add MobileBalanceCard gradient component"
```

---

## Task 15: Render `MobileBalanceCard` at the top of the mobile dashboard

**Files:**
- Modify: `client/src/pages/Dashboard.tsx`

- [ ] **Step 1: Add the imports**

```ts
import { MobileBalanceCard } from "@/components/dashboard/MobileBalanceCard";
import { useIsMobile } from "@/hooks/useMobile";
```

- [ ] **Step 2: Read the mobile flag**

At the top of the `Dashboard` component function, alongside `const { user } = useAuthGuard();`:

```ts
  const isMobile = useIsMobile();
```

- [ ] **Step 3: Render the card above the KPI grid on mobile**

Right after the header `<div className="flex flex-col gap-3 sm:flex-row ...">...</div>` block (the one with the title + month `Select`), add:

```tsx
        {isMobile && (
          <MobileBalanceCard
            balance={stats?.balance || 0}
            totalEntries={stats?.totalEntries || 0}
            totalExpenses={stats?.totalExpenses || 0}
            formatValue={brl}
          />
        )}
```

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev`
Resize to mobile width and open `/dashboard`. Confirm the gradient balance card renders above the KPI cards with correct values, and disappears at desktop width.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Dashboard.tsx
git commit -m "feat: show gradient balance card on mobile dashboard"
```

---

## Task 16: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `npx vitest run`
Expected: all tests pass, including the new `client/src/lib/*.test.ts` files.

- [ ] **Step 2: Run typecheck**

Run: `npm run check`
Expected: no TypeScript errors.

- [ ] **Step 3: Manual browser regression**

Run: `npm run dev` and walk through, at both desktop and mobile widths:
- `/dashboard` — KPI cards (incl. goal/count fallback), bar chart + Mensal/Semanal toggle, donut + legend, Saídas por Categoria, Movimentação recente, mobile balance card.
- `/entries` and `/expenses` — icons, colored values, search, export, create/edit dialogs still work.
- Mobile nav — bottom bar, FAB drawer, "Mais" drawer (with Sair), full-screen forms, and that desktop still shows the original sidebar.

- [ ] **Step 4: Commit any final fixups**

```bash
git add -A
git commit -m "fix: address issues found in redesign regression pass"
```

(Only if fixes were needed — skip if the pass was clean.)
