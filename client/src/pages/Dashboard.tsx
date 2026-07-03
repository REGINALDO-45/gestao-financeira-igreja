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

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#84cc16"];
const EXPENSE_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6", "#06b6d4"];

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

  const expenseCategoryData = useMemo(() => {
    if (!expenses || !entries) return [];

    const totalEntries = sumAmounts(entries) || 1; // Avoid division by zero
    const categories: Record<string, number> = {};
    let salaryAmount = 0;

    expenses.forEach((exp) => {
      const amt = parseFloat(exp.amount);
      const desc = (exp.description || "").toLowerCase();
      const sup = (exp.supplier || "").toLowerCase();

      // Detect if it is salary/prebenda/pastor/zeladoria/zelador/salario/clero/clerical/cooperador
      const isSalary =
        desc.includes("salario") ||
        desc.includes("salário") ||
        desc.includes("prebenda") ||
        desc.includes("zelador") ||
        desc.includes("zeladoria") ||
        desc.includes("pastor") ||
        desc.includes("folha") ||
        desc.includes("mão de obra") ||
        desc.includes("mao de obra") ||
        sup.includes("salario") ||
        sup.includes("salário") ||
        sup.includes("prebenda") ||
        sup.includes("zelador");

      if (isSalary) {
        salaryAmount += amt * 100;
      } else {
        const catLabel = EXPENSE_CATEGORY_LABELS[exp.category] || exp.category;
        categories[catLabel] = (categories[catLabel] || 0) + amt * 100;
      }
    });

    const result = Object.entries(categories).map(([name, value]) => {
      const val = Math.round(value) / 100;
      return {
        name,
        value: val,
        percentageOfEntries: (val / totalEntries) * 100,
      };
    });

    if (salaryAmount > 0) {
      const val = Math.round(salaryAmount) / 100;
      result.push({
        name: "Salários e Prebendas",
        value: val,
        percentageOfEntries: (val / totalEntries) * 100,
      });
    }

    return result.sort((a, b) => b.value - a.value);
  }, [expenses, entries]);

  const salaryPercentOfEntries = useMemo(() => {
    if (!expenses || !entries) return 0;
    const totalEntries = sumAmounts(entries);
    if (totalEntries === 0) return 0;

    let salaryAmount = 0;
    expenses.forEach((exp) => {
      const desc = (exp.description || "").toLowerCase();
      const sup = (exp.supplier || "").toLowerCase();
      const isSalary =
        desc.includes("salario") ||
        desc.includes("salário") ||
        desc.includes("prebenda") ||
        desc.includes("zelador") ||
        desc.includes("zeladoria") ||
        desc.includes("pastor") ||
        desc.includes("folha") ||
        desc.includes("mão de obra") ||
        desc.includes("mao de obra") ||
        sup.includes("salario") ||
        sup.includes("salário") ||
        sup.includes("prebenda") ||
        sup.includes("zelador");

      if (isSalary) {
        salaryAmount += parseFloat(exp.amount);
      }
    });

    return (salaryAmount / totalEntries) * 100;
  }, [expenses, entries]);

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

        {/* Gráficos de Evolução */}
        <div className="w-full">
          {/* Gráfico de Linha - Evolução Mensal */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Evolução Financeira Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="gradEntradas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gradSaidas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => brl(Number(value))} />
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
        </div>

        {/* Gráficos de Pizza/Rosca */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Rosca - Distribuição de Entradas por Categoria */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Distribuição de Entradas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
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
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span style={{ fontSize: 12, textTransform: "capitalize" }}>
                          {value.toLowerCase()}
                        </span>
                      )}
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

          {/* Gráfico de Rosca - Distribuição de Saídas por Categoria com % em relação às Entradas */}
          <Card className="border-border/60 shadow-sm flex flex-col justify-between">
            <CardHeader>
              <CardTitle>Distribuição de Saídas por Categoria</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between space-y-4">
              {expenseCategoryData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={expenseCategoryData}
                        cx="50%"
                        cy="45%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {expenseCategoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any, name: any, props: any) => {
                          const valStr = brl(Number(value));
                          const pct = props.payload.percentageOfEntries;
                          return [`${valStr} (${pct.toFixed(1)}% das entradas)`, name];
                        }}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid hsl(var(--border))",
                          fontSize: 13,
                        }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => (
                          <span style={{ fontSize: 12 }} className="text-muted-foreground">
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="pt-2 border-t text-center">
                    <p className="text-sm font-medium text-foreground">
                      Gasto com Salários/Prebendas representa{" "}
                      <span className="text-red-600 dark:text-red-400 font-bold">
                        {salaryPercentOfEntries.toFixed(1)}%
                      </span>{" "}
                      das entradas
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-muted-foreground">
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
