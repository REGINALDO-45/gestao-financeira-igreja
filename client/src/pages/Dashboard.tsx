import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
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
} from "lucide-react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { monthRangeUTC } from "@/lib/dateRange";

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

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
    {
      label: "Lançamentos",
      value: String((entries?.length || 0) + (expenses?.length || 0)),
      hint: `${entries?.length || 0} entradas · ${expenses?.length || 0} saídas`,
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
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da situação financeira</p>
          {user && (
            <p className="text-xs text-muted-foreground mt-1">
              Perfil: <span className="font-semibold capitalize">{user.role}</span>
            </p>
          )}
        </div>

        {/* Cards de Saldo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Entradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {stats?.totalEntries.toFixed(2) || "0,00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Dízimos e ofertas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Saídas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R$ {stats?.totalExpenses.toFixed(2) || "0,00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Despesas registradas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Líquido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${(stats?.balance || 0) >= 0 ? "text-blue-600" : "text-red-600"
                  }`}
              >
                R$ {stats?.balance.toFixed(2) || "0,00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Resultado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Quantidade de Lançamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(entries?.length || 0) + (expenses?.length || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {entries?.length || 0} entradas, {expenses?.length || 0} saídas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Linha - Evolução Mensal */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução Financeira Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => `R$ ${typeof value === 'number' ? value.toFixed(2) : value}`} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="entradas"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill="url(#gradEntradas)"
                      name="Entradas"
                    />
                    <Area
                      type="monotone"
                      dataKey="saidas"
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      fill="url(#gradSaidas)"
                      name="Saídas"
                    />
                  </AreaChart>
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
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${brl(Number(value))}`}
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
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
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
