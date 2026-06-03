import { useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
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
import { Loader2 } from "lucide-react";

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export default function Dashboard() {
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

    const months: Record<string, { entradas: number; saidas: number }> = {};

    entries.forEach((entry) => {
      const date = new Date(entry.entryDate);
      const monthKey = date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });

      if (!months[monthKey]) {
        months[monthKey] = { entradas: 0, saidas: 0 };
      }
      months[monthKey].entradas += parseFloat(entry.amount);
    });

    expenses.forEach((expense) => {
      const date = new Date(expense.expenseDate);
      const monthKey = date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });

      if (!months[monthKey]) {
        months[monthKey] = { entradas: 0, saidas: 0 };
      }
      months[monthKey].saidas += parseFloat(expense.amount);
    });

    return Object.entries(months)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([month, data]) => ({
        month,
        ...data,
      }));
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da situação financeira</p>
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
                className={`text-2xl font-bold ${
                  (stats?.balance || 0) >= 0 ? "text-blue-600" : "text-red-600"
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
                    <Line
                      type="monotone"
                      dataKey="entradas"
                      stroke="#10b981"
                      name="Entradas"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="saidas"
                      stroke="#ef4444"
                      name="Saídas"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Rosca - Distribuição por Categoria */}
          <Card>
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
                      label={({ name, value }) => `${name}: R$ ${value.toFixed(2)}`}
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `R$ ${typeof value === 'number' ? value.toFixed(2) : value}`} />
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
