import { useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const brlCompact = (n: number) =>
  "R$ " +
  n.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

export default function Dashboard() {
  const { user } = useAuthGuard();
  const { data: entries, isLoading: entriesLoading } = trpc.entries.list.useQuery();
  const { data: expenses, isLoading: expensesLoading } = trpc.expenses.list.useQuery();

  const stats = useMemo(() => {
    if (!entries || !expenses) return null;

    const totalEntries = entries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const balance = totalEntries - totalExpenses;

    return {
      totalEntries,
      totalExpenses,
      balance,
    };
  }, [entries, expenses]);

  const monthlyData = useMemo(() => {
    if (!entries || !expenses) return [];

    // key "YYYY-MM" → mantém um sortKey numérico real e um rótulo legível,
    // evitando ordenar pelo texto do mês em português (que o Date não parseia)
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

    entries.forEach((e) => add(e.entryDate, "entradas", e.amount));
    expenses.forEach((e) => add(e.expenseDate, "saidas", e.amount));

    return Object.values(months)
      .sort((a, b) => a.sortKey - b.sortKey) // antigo → recente (esquerda → direita)
      .map(({ label, entradas, saidas }) => ({ month: label, entradas, saidas }));
  }, [entries, expenses]);

  const categoryData = useMemo(() => {
    if (!entries) return [];

    const categories: Record<string, number> = {};

    entries.forEach((entry) => {
      const cat = entry.category.replace(/_/g, " ").toUpperCase();
      categories[cat] = (categories[cat] || 0) + parseFloat(entry.amount);
    });

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
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

  const kpis = [
    {
      label: "Total de Entradas",
      value: brl(stats?.totalEntries || 0),
      hint: "Dízimos e ofertas",
      icon: TrendingUp,
      iconClass: "text-emerald-600 dark:text-emerald-400",
      badgeClass: "bg-emerald-500/10",
      accent: "from-emerald-500/15",
      valueClass: "text-emerald-600 dark:text-emerald-400",
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
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da situação financeira</p>
          {user && (
            <p className="text-xs text-muted-foreground mt-1">
              Perfil: <span className="font-semibold capitalize">{user.role}</span>
            </p>
          )}
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
                  <div className={`mt-3 text-2xl font-bold tracking-tight ${kpi.valueClass}`}>
                    {kpi.value}
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    {HintIcon && <HintIcon className="h-3.5 w-3.5" />}
                    {kpi.hint}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Área - Evolução Mensal */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Evolução Financeira Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradEntradas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradSaidas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
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
                <ResponsiveContainer width="100%" height={300}>
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
