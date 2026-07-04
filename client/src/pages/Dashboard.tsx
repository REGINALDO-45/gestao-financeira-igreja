import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { trpc } from "@/lib/trpc";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  ListChecks,
  ArrowUpRight,
  ArrowDownRight,
  Target,
} from "lucide-react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { monthRangeUTC } from "@/lib/dateRange";
import { CategoryLegend } from "@/components/dashboard/CategoryLegend";
import { ExpensesByCategoryBars } from "@/components/dashboard/ExpensesByCategoryBars";
import { RecentMovements } from "@/components/dashboard/RecentMovements";
import { calculateExpenseSharePct, buildRecentMovements, getGoalCardData } from "@/lib/dashboardMath";

const COLORS = ["#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#ef4444"];
const EXPENSE_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f43f5e", "#0ea5e9", "#a855f7", "#facc15"];

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  agua: "Água",
  energia: "Energia",
  internet: "Internet",
  aluguel: "Aluguel",
  material_limpeza: "Material de Limpeza",
  evangelismo: "Evangelismo",
  missoes: "Missões",
  construcao: "Construção",
  equipamentos: "Equipamentos",
  manutencao: "Manutenção",
  outras_despesas: "Outras Despesas",
};
const DIZIMO_COLOR = "#10b981";

const getCategoryColor = (name: string, otherIndex: number) =>
  name === "DIZIMO" ? DIZIMO_COLOR : COLORS[otherIndex % COLORS.length];

const sumAmounts = (items: { amount: string }[]) =>
  Math.round(items.reduce((s, e) => s + parseFloat(e.amount) * 100, 0)) / 100;

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const brlCompact = (n: number) =>
  "R$ " +
  n.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

const buildMonthOptions = () => {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options;
};

const monthOptions = buildMonthOptions();

export default function Dashboard() {
  const { user } = useAuthGuard();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [chartView, setChartView] = useState<"mensal" | "semanal">("mensal");

  const dateRange = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return monthRangeUTC(y, m - 1);
  }, [selectedMonth]);

  const { data: entries, isLoading: entriesLoading } = trpc.entries.listByDateRange.useQuery(dateRange);
  const { data: expenses, isLoading: expensesLoading } = trpc.expenses.listByDateRange.useQuery(dateRange);
  const selectedYear = parseInt(selectedMonth.split("-")[0], 10);
  const { data: annualBudget } = trpc.annualBudgets.getByYear.useQuery({ year: selectedYear });

  const stats = useMemo(() => {
    if (!entries || !expenses) return null;

    const totalEntries = sumAmounts(entries);
    const totalExpenses = sumAmounts(expenses);
    const balance = Math.round((totalEntries - totalExpenses) * 100) / 100;

    return {
      totalEntries,
      totalExpenses,
      balance,
    };
  }, [entries, expenses]);

  const { data: allEntries } = trpc.entries.list.useQuery();
  const { data: allExpenses } = trpc.expenses.list.useQuery();

  const monthlyData = useMemo(() => {
    if (!allEntries || !allExpenses) return [];

    const months: Record<
      string,
      { entradas: number; saidas: number; sortKey: number; label: string }
    > = {};

    const add = (dateVal: string | Date, field: "entradas" | "saidas", amount: string) => {
      const date = new Date(dateVal);
      const y = date.getFullYear();
      const m = date.getMonth();
      const key = `${y}-${String(m).padStart(2, "0")}`;
      if (!months[key]) {
        months[key] = {
          entradas: 0,
          saidas: 0,
          sortKey: y * 12 + m,
          label: date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
        };
      }
      months[key][field] += parseFloat(amount);
    };

    allEntries.forEach((e) => add(e.entryDate, "entradas", e.amount));
    allExpenses.forEach((e) => add(e.expenseDate, "saidas", e.amount));

    return Object.values(months)
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ label, entradas, saidas }) => ({
        month: label,
        entradas: Math.round(entradas * 100) / 100,
        saidas: Math.round(saidas * 100) / 100,
      }));
  }, [allEntries, allExpenses]);

  const weeklyData = useMemo(() => {
    if (!entries || !expenses) return [];

    const weeks: Record<number, { entradas: number; saidas: number }> = {};

    const addWeek = (dateVal: string | Date, field: "entradas" | "saidas", amount: string) => {
      const date = new Date(dateVal);
      const day = date.getUTCDate();
      const weekIndex = Math.ceil(day / 7);
      if (!weeks[weekIndex]) weeks[weekIndex] = { entradas: 0, saidas: 0 };
      weeks[weekIndex][field] += parseFloat(amount);
    };

    entries.forEach((e) => addWeek(e.entryDate, "entradas", e.amount));
    expenses.forEach((e) => addWeek(e.expenseDate, "saidas", e.amount));

    return Object.entries(weeks)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([week, v]) => ({
        week: `Semana ${week}`,
        entradas: Math.round(v.entradas * 100) / 100,
        saidas: Math.round(v.saidas * 100) / 100,
      }));
  }, [entries, expenses]);

  const categoryData = useMemo(() => {
    if (!entries) return [];

    const categories: Record<string, number> = {};

    entries.forEach((entry) => {
      const cat = entry.category.replace(/_/g, " ").toUpperCase();
      categories[cat] = (categories[cat] || 0) + parseFloat(entry.amount) * 100;
    });

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value: Math.round(value) / 100,
    }));
  }, [entries]);

  const expenseCategoryData = useMemo(() => {
    if (!expenses) return [];

    const categories: Record<string, number> = {};

    expenses.forEach((expense) => {
      const label = EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category;
      categories[label] = (categories[label] || 0) + parseFloat(expense.amount) * 100;
    });

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value: Math.round(value) / 100,
    }));
  }, [expenses]);

  const expenseShare = useMemo(
    () => calculateExpenseSharePct(expenseCategoryData, stats?.totalEntries ?? 0),
    [expenseCategoryData, stats?.totalEntries]
  );

  const recentMovements = useMemo(
    () => buildRecentMovements(entries ?? [], expenses ?? [], 5),
    [entries, expenses]
  );

  const isLoading = entriesLoading || expensesLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="animate-spin w-8 h-8" />
        </div>
      </DashboardLayout>
    );
  }

  const balancePositive = (stats?.balance || 0) >= 0;

  const monthlyEntriesGoal = parseFloat(annualBudget?.monthlyEntriesGoal ?? "0") || 0;
  const monthlyExpensesGoal = parseFloat(annualBudget?.monthlyExpensesGoal ?? "0") || 0;
  const entriesGoalPct = monthlyEntriesGoal > 0 ? ((stats?.totalEntries || 0) / monthlyEntriesGoal) * 100 : null;
  const expensesGoalPct = monthlyExpensesGoal > 0 ? ((stats?.totalExpenses || 0) / monthlyExpensesGoal) * 100 : null;

  const goalCardData = getGoalCardData(
    monthlyEntriesGoal,
    stats?.totalEntries ?? 0,
    entries?.length ?? 0,
    expenses?.length ?? 0
  );

  const kpis = [
    {
      label: "Total de Entradas",
      value: brl(stats?.totalEntries || 0),
      hint: `Dízimos e ofertas do mês`,
      icon: TrendingUp,
      iconClass: "text-emerald-600 dark:text-emerald-400",
      badgeClass: "bg-emerald-500/10",
      accent: "from-emerald-500/15",
      valueClass: "text-emerald-600 dark:text-emerald-400",
      goalPct: entriesGoalPct,
      goalGood: entriesGoalPct !== null && entriesGoalPct >= 100,
    },
    {
      label: "Total de Saídas",
      value: brl(stats?.totalExpenses || 0),
      hint: "Despesas registradas",
      icon: TrendingDown,
      iconClass: "text-red-600 dark:text-red-400",
      badgeClass: "bg-red-500/10",
      accent: "from-red-500/15",
      valueClass: "text-red-600 dark:text-red-400",
      goalPct: expensesGoalPct,
      goalGood: expensesGoalPct !== null && expensesGoalPct <= 100,
    },
    {
      label: "Saldo Líquido",
      value: brl(stats?.balance || 0),
      hint: balancePositive ? "Superávit" : "Déficit",
      hintIcon: balancePositive ? ArrowUpRight : ArrowDownRight,
      icon: Wallet,
      iconClass: balancePositive
        ? "text-blue-600 dark:text-blue-400"
        : "text-red-600 dark:text-red-400",
      badgeClass: balancePositive ? "bg-blue-500/10" : "bg-red-500/10",
      accent: balancePositive ? "from-blue-500/15" : "from-red-500/15",
      valueClass: balancePositive
        ? "text-blue-600 dark:text-blue-400"
        : "text-red-600 dark:text-red-400",
    },
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
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral da situação financeira</p>
            {user && (
              <p className="text-xs text-muted-foreground mt-1">
                Perfil: <span className="font-semibold capitalize">{user.role}</span>
              </p>
            )}
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cards de Saldo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            const HintIcon = kpi.hintIcon;
            return (
              <Card
                key={kpi.label}
                className="relative overflow-hidden border-border/60 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${kpi.accent} to-transparent`}
                />
                <CardContent className="relative p-5">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {kpi.label}
                    </span>
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${kpi.badgeClass}`}
                    >
                      <Icon className={`h-5 w-5 ${kpi.iconClass}`} />
                    </span>
                  </div>
                  <div className={`mt-3 text-3xl font-bold tracking-tight ${kpi.valueClass}`}>
                    {kpi.value}
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    {HintIcon && <HintIcon className="h-3.5 w-3.5" />}
                    {kpi.hint}
                  </p>
                  {kpi.goalPct !== undefined && kpi.goalPct !== null && (
                    <Badge
                      className={`mt-2 text-[10px] font-medium ${
                        kpi.goalGood
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {kpi.goalPct.toFixed(0)}% da meta mensal
                    </Badge>
                  )}
                  {"progressPct" in kpi && kpi.progressPct !== undefined && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${kpi.progressPct}%` }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Área - Evolução Mensal */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle>
                {chartView === "mensal" ? "Evolução Financeira Mensal" : "Evolução Financeira Semanal"}
              </CardTitle>
              <div className="flex items-center gap-1 rounded-md border p-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant={chartView === "mensal" ? "default" : "ghost"}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setChartView("mensal")}
                >
                  Mensal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={chartView === "semanal" ? "default" : "ghost"}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setChartView("semanal")}
                >
                  Semanal
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(chartView === "mensal" ? monthlyData : weeklyData).length > 0 ? (
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
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Rosca - Distribuição por Categoria */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Distribuição por Categoria</CardTitle>
            </CardHeader>
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
          </Card>

          {/* Gráfico de Pizza - Distribuição de Saídas por Categoria */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Distribuição de Saídas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {expenseCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expenseCategoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value, percent }) =>
                        `${name}: ${brl(Number(value))} (${(Number(percent) * 100).toFixed(0)}%)`
                      }
                    >
                      {expenseCategoryData.map((_, index) => (
                        <Cell key={`expense-cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any, props: any) =>
                        [`${brl(Number(value))} (${(Number(props?.payload?.percent ?? 0) * 100).toFixed(0)}%)`, name]
                      }
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid hsl(var(--border))",
                        fontSize: 13,
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

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
        </div>
      </div>
    </DashboardLayout>
  );
}
