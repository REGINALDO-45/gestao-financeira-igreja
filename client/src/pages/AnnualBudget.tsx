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
