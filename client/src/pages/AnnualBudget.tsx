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

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const sumAmounts = (items: { amount: string }[]) =>
  Math.round(items.reduce((s, e) => s + parseFloat(e.amount) * 100, 0)) / 100;

export default function AnnualBudget() {
  const { user } = useAuthGuard();
  const [year, setYear] = useState(new Date().getFullYear());
  const [entriesGoalInput, setEntriesGoalInput] = useState("");
  const [expensesGoalInput, setExpensesGoalInput] = useState("");

  const yearRange = useMemo(() => ({
    startDate: new Date(year, 0, 1, 0, 0, 0),
    endDate: new Date(year, 11, 31, 23, 59, 59),
  }), [year]);

  const { data: budget, isLoading: isLoadingBudget } = trpc.annualBudgets.getByYear.useQuery({ year });
  const { data: entries, isLoading: isLoadingEntries } = trpc.entries.listByDateRange.useQuery(yearRange);
  const { data: expenses, isLoading: isLoadingExpenses } = trpc.expenses.listByDateRange.useQuery(yearRange);
  const upsertBudget = trpc.annualBudgets.upsert.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    setEntriesGoalInput(budget?.monthlyEntriesGoal ?? "");
    setExpensesGoalInput(budget?.monthlyExpensesGoal ?? "");
  }, [budget]);

  const monthlyEntriesGoal = parseFloat(budget?.monthlyEntriesGoal ?? "0") || 0;
  const monthlyExpensesGoal = parseFloat(budget?.monthlyExpensesGoal ?? "0") || 0;

  const monthlyData = useMemo(() => {
    return MONTH_NAMES.map((name, monthIndex) => {
      const entriesRealized = sumAmounts((entries ?? []).filter(e => new Date(e.entryDate).getUTCMonth() === monthIndex));
      const expensesRealized = sumAmounts((expenses ?? []).filter(e => new Date(e.expenseDate).getUTCMonth() === monthIndex));
      return {
        name,
        entriesRealized,
        expensesRealized,
        entriesPct: monthlyEntriesGoal > 0 ? (entriesRealized / monthlyEntriesGoal) * 100 : 0,
        expensesPct: monthlyExpensesGoal > 0 ? (expensesRealized / monthlyExpensesGoal) * 100 : 0,
      };
    });
  }, [entries, expenses, monthlyEntriesGoal, monthlyExpensesGoal]);

  const totals = useMemo(() => ({
    entriesRealized: monthlyData.reduce((s, m) => s + m.entriesRealized, 0),
    expensesRealized: monthlyData.reduce((s, m) => s + m.expensesRealized, 0),
    entriesGoal: monthlyEntriesGoal * 12,
    expensesGoal: monthlyExpensesGoal * 12,
  }), [monthlyData, monthlyEntriesGoal, monthlyExpensesGoal]);

  const handleSaveGoals = async () => {
    try {
      await upsertBudget.mutateAsync({
        year,
        monthlyEntriesGoal: entriesGoalInput || "0",
        monthlyExpensesGoal: expensesGoalInput || "0",
      });
      utils.annualBudgets.getByYear.invalidate({ year });
      toast.success("Metas do orçamento anual salvas com sucesso!");
    } catch {
      toast.error("Erro ao salvar as metas");
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Orçamento Anual</h1>
          <p className="text-muted-foreground">Metas de entradas e despesas e o percentual realizado mês a mês</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Metas de {year}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <Label htmlFor="year">Ano</Label>
                <Input
                  id="year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                />
              </div>
              <div>
                <Label htmlFor="entriesGoal">Meta Mensal de Entradas (R$)</Label>
                <Input
                  id="entriesGoal"
                  type="number"
                  step="0.01"
                  value={entriesGoalInput}
                  onChange={(e) => setEntriesGoalInput(e.target.value)}
                  disabled={!isTreasurer(user?.role)}
                />
              </div>
              <div>
                <Label htmlFor="expensesGoal">Meta Mensal de Despesas (R$)</Label>
                <Input
                  id="expensesGoal"
                  type="number"
                  step="0.01"
                  value={expensesGoalInput}
                  onChange={(e) => setExpensesGoalInput(e.target.value)}
                  disabled={!isTreasurer(user?.role)}
                />
              </div>
              {isTreasurer(user?.role) && (
                <Button onClick={handleSaveGoals} disabled={upsertBudget.isPending}>
                  {upsertBudget.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar Metas
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Realizado vs. Meta — {year}</CardTitle>
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
                      <TableHead className="text-right">Meta Entradas</TableHead>
                      <TableHead className="text-right">% Entradas</TableHead>
                      <TableHead className="text-right">Despesas Realizado</TableHead>
                      <TableHead className="text-right">Meta Despesas</TableHead>
                      <TableHead className="text-right">% Despesas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyData.map((m) => (
                      <TableRow key={m.name}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell className="text-right">R$ {m.entriesRealized.toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {monthlyEntriesGoal.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{pctBadge(m.entriesPct, false)}</TableCell>
                        <TableCell className="text-right">R$ {m.expensesRealized.toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {monthlyExpensesGoal.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{pctBadge(m.expensesPct, true)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell>TOTAL {year}</TableCell>
                      <TableCell className="text-right">R$ {totals.entriesRealized.toFixed(2)}</TableCell>
                      <TableCell className="text-right">R$ {totals.entriesGoal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {totals.entriesGoal > 0 ? `${((totals.entriesRealized / totals.entriesGoal) * 100).toFixed(0)}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right">R$ {totals.expensesRealized.toFixed(2)}</TableCell>
                      <TableCell className="text-right">R$ {totals.expensesGoal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {totals.expensesGoal > 0 ? `${((totals.expensesRealized / totals.expensesGoal) * 100).toFixed(0)}%` : "—"}
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
