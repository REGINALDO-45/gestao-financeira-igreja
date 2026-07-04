import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, FileText, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { buildEntriesReport } from "@/lib/reports/EntriesReport";
import { buildFinancialReport } from "@/lib/reports/FinancialReport";
import { buildAnnualReport } from "@/lib/reports/AnnualReport";
import { utcDayStart, utcDayEnd, monthRangeUTC, yearRangeUTC } from "@/lib/dateRange";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function Reports() {
  const [reportType, setReportType] = useState("entries");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState<{ doc: any; url: string; filename: string } | null>(null);

  // Revoke the blob URL when the preview closes/changes to avoid leaking memory
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const showPreview = (result: { doc: any; filename: string }) => {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { doc: result.doc, url: result.doc.output("bloburl"), filename: result.filename };
    });
  };

  const dateRange = useMemo(() => ({
    startDate: utcDayStart(startDate),
    endDate: utcDayEnd(endDate),
  }), [startDate, endDate]);

  const { data: settings } = trpc.churchSettings.get.useQuery();
  const { data: members } = trpc.members.list.useQuery();
  const { data: entries } = trpc.entries.listByDateRange.useQuery(dateRange);
  const { data: expenses } = trpc.expenses.listByDateRange.useQuery(dateRange);
  const { data: costCenterTotals } = trpc.entries.summaryByCostCenter.useQuery(dateRange);

  // Período do mês anterior, usado para calcular as cotas regional/distrital
  const prevMonthRange = useMemo(() => {
    const [y, m] = startDate.split("-").map(Number);
    return monthRangeUTC(y, m - 2);
  }, [startDate]);

  const { data: prevMonthEntries } = trpc.entries.listByDateRange.useQuery(prevMonthRange);
  const { data: prevMonthExpenses } = trpc.expenses.listByDateRange.useQuery(prevMonthRange);

  // Ano de referência do relatório Anual — usa o ano da Data Inicial selecionada
  const reportYear = new Date(startDate + "T12:00:00").getFullYear();
  const yearRange = useMemo(() => yearRangeUTC(reportYear), [reportYear]);

  const { data: yearEntries } = trpc.entries.listByDateRange.useQuery(yearRange, { enabled: reportType === "annual" });
  const { data: yearExpenses } = trpc.expenses.listByDateRange.useQuery(yearRange, { enabled: reportType === "annual" });
  const { data: annualBudget } = trpc.annualBudgets.getByYear.useQuery({ year: reportYear }, { enabled: reportType === "annual" });

  const pastorName    = settings?.pastorName    ?? "Pr. Reginaldo Medeiros";
  const treasurerName = settings?.treasurerName ?? "Ageovany";

  const generateEntriesReport = async () => {
    setIsGenerating(true);
    try {
      if (!entries) throw new Error("Nenhum dado encontrado para o período selecionado");
      const memberNameById = new Map(members?.map((m) => [m.id, m.name]) ?? []);
      // Vários lançamentos podem ter o mesmo nome (ex: lançamentos por membro sem
      // descrição, ou totais semanais consolidados) — agrupamos por nome e somamos
      // para evitar dezenas de linhas repetidas no PDF.
      const groupByName = (list: typeof entries, fallback: string) => {
        const totals = new Map<string, number>();
        list.forEach(e => {
          const name = (e.memberId && memberNameById.get(e.memberId)) || e.description || fallback;
          const amount = Math.round(parseFloat(e.amount) * 100) / 100;
          totals.set(name, Math.round(((totals.get(name) ?? 0) + amount) * 100) / 100);
        });
        return Array.from(totals, ([name, amount]) => ({ name, amount }));
      };
      const tithes    = groupByName(entries.filter(e => e.category === "dizimo"), "Dizimista");
      const offerings = groupByName(entries.filter(e => e.category === "oferta"), "Ofertante");
      const d = new Date(startDate + "T12:00:00");
      const wd = d.toLocaleDateString("pt-BR", { weekday: "long" });
      const mo = d.toLocaleDateString("pt-BR", { month: "long" });
      const refDate = `${wd.charAt(0).toUpperCase() + wd.slice(1)}, ${d.getDate()} de ${mo.charAt(0).toUpperCase() + mo.slice(1)} de ${d.getFullYear()}`;
      const nd = new Date(d); nd.setDate(d.getDate() + 1);
      const depositDate = nd.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

      const prevTotal = Math.round((prevMonthEntries ?? []).reduce((s, e) => s + parseFloat(e.amount) * 100, 0)) / 100;
      const prevMo = prevMonthRange.startDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
      const cotasData = prevTotal > 0 ? {
        prevMonthRef: prevMo.charAt(0).toUpperCase() + prevMo.slice(1),
        prevMonthEntriesTotal: prevTotal,
        cotaRegional: Math.round(prevTotal * 11) / 100,
        cotaDistrital: Math.round(prevTotal * 4) / 100,
      } : undefined;

      const result = await buildEntriesReport(tithes, offerings, refDate, depositDate, pastorName, treasurerName, settings?.logoUrl, cotasData);
      showPreview(result);
      toast.success("Relatório de Entradas gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGenerating(false);
    }
  };

  const expenseCategoryLabels: Record<string, string> = {
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

  const generateFinancialReport = async () => {
    setIsGenerating(true);
    try {
      if (!entries || !expenses) throw new Error("Nenhum dado encontrado para o período selecionado");

      const safeSum = (items: { amount: string }[]) =>
        Math.round(items.reduce((s, e) => s + parseFloat(e.amount) * 100, 0)) / 100;

      const expensesDetail = [...expenses]
        .sort((a, b) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime())
        .map((e) => ({
          date: new Date(e.expenseDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }),
          category: expenseCategoryLabels[e.category] ?? e.category,
          description: e.description || "-",
          amount: Math.round(parseFloat(e.amount) * 100) / 100,
        }));

      const totalEntries  = safeSum(entries);
      const totalExpenses = safeSum(expenses);
      const d = new Date(startDate + "T12:00:00");
      const mo = d.toLocaleDateString("pt-BR", { month: "long" });

      const prevMonthEntriesTotal = safeSum(prevMonthEntries ?? []);
      const prevMonthExpensesTotal = safeSum(prevMonthExpenses ?? []);
      const prevMonthBalance = Math.round((prevMonthEntriesTotal - prevMonthExpensesTotal) * 100) / 100;
      const cotaRegionalTotal = Math.round(prevMonthEntriesTotal * 11) / 100;
      const cotaDistritalTotal = Math.round(prevMonthEntriesTotal * 4) / 100;

      const result = await buildFinancialReport({
        refDate: `${mo.charAt(0).toUpperCase() + mo.slice(1)} ${d.getFullYear()}`,
        pastorName,
        treasurerName,
        totalEntries,
        totalExpenses,
        balance: Math.round((totalEntries - totalExpenses) * 100) / 100,
        balanceAvailable: Math.round((totalEntries - totalExpenses) * 100) / 100,
        dizimosTotal: safeSum(entries.filter(e => e.category === "dizimo")),
        ofertasTotal: safeSum(entries.filter(e => e.category === "oferta")),
        ofertasEspeciaisTotal: safeSum(entries.filter(e => ["oferta_especial","campanha","missoes","construcao"].includes(e.category))),
        bazarTotal: safeSum(entries.filter(e => e.category === "bazar")),
        almocoTotal: safeSum(entries.filter(e => ["almoco_beneficente","cantina"].includes(e.category))),
        outrasEntradasTotal: safeSum(entries.filter(e => ["doacao","outras_receitas"].includes(e.category))),
        despesasFixasTotal: safeSum(expenses.filter(e => ["agua","energia","internet","aluguel"].includes(e.category))),
        despesasMinisteriaisTotal: safeSum(expenses.filter(e => ["evangelismo","missoes"].includes(e.category))),
        despesasAdminTotal: safeSum(expenses.filter(e => ["material_limpeza","manutencao","outras_despesas"].includes(e.category))),
        investimentosTotal: safeSum(expenses.filter(e => ["construcao","equipamentos"].includes(e.category))),
        prevMonthEntriesTotal,
        prevMonthExpensesTotal,
        prevMonthBalance,
        cotaRegionalTotal,
        cotaDistritalTotal,
        prevMonthRef: (() => {
          const ref = prevMonthRange.startDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
          return ref.charAt(0).toUpperCase() + ref.slice(1);
        })(),
        logoUrl: settings?.logoUrl,
        expensesDetail,
      });
      showPreview(result);
      toast.success("Relatório Financeiro-Clerical gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAnnualReport = async () => {
    setIsGenerating(true);
    try {
      if (!yearEntries || !yearExpenses) throw new Error("Nenhum dado encontrado para o ano selecionado");

      const monthlyEntriesGoal = parseFloat(annualBudget?.monthlyEntriesGoal ?? "0") || 0;
      const monthlyExpensesGoal = parseFloat(annualBudget?.monthlyExpensesGoal ?? "0") || 0;
      const sumAmounts = (items: { amount: string }[]) =>
        Math.round(items.reduce((s, e) => s + parseFloat(e.amount) * 100, 0)) / 100;

      const monthlyData = MONTH_NAMES.map((name, monthIndex) => ({
        name,
        entriesRealized: sumAmounts(yearEntries.filter(e => new Date(e.entryDate).getUTCMonth() === monthIndex)),
        entriesGoal: monthlyEntriesGoal,
        expensesRealized: sumAmounts(yearExpenses.filter(e => new Date(e.expenseDate).getUTCMonth() === monthIndex)),
        expensesGoal: monthlyExpensesGoal,
      }));

      const result = await buildAnnualReport({
        year: reportYear,
        pastorName,
        treasurerName,
        logoUrl: settings?.logoUrl,
        monthlyData,
      });
      showPreview(result);
      toast.success("Relatório Anual gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGenerating(false);
    }
  };

  const generateReport =
    reportType === "entries" ? generateEntriesReport :
    reportType === "financial" ? generateFinancialReport :
    generateAnnualReport;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground mt-2">Gere relatórios financeiros institucionais</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configurações de Geração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reportType">Tipo de Relatório</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger id="reportType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entries">Entradas Dominical</SelectItem>
                    <SelectItem value="financial">Financeiro-Clerical</SelectItem>
                    <SelectItem value="annual">Anual (Orçado x Realizado)</SelectItem>
                  </SelectContent>
                </Select>
                {reportType === "annual" && (
                  <p className="text-xs text-muted-foreground">
                    Usa o ano da Data Inicial ({reportYear}). Configure as metas na aba Orçamento Anual.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {reportType !== "annual" && (
        <Card>
          <CardHeader>
            <CardTitle>Cotas Regional e Distrital</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const prevTotal = Math.round((prevMonthEntries ?? []).reduce((s, e) => s + parseFloat(e.amount) * 100, 0)) / 100;
              return (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Calculadas sobre o total de entradas do mês anterior ({prevMonthRange.startDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })}):{" "}
                    <span className="font-semibold">
                      R$ {prevTotal.toFixed(2)}
                    </span>
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-md border px-4 py-2">
                      <span>Cota Regional (11%)</span>
                      <span className="font-semibold">
                        R$ {(Math.round(prevTotal * 11) / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border px-4 py-2">
                      <span>Cota Distrital (4%)</span>
                      <span className="font-semibold">
                        R$ {(Math.round(prevTotal * 4) / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
        )}

        {reportType !== "annual" && costCenterTotals && costCenterTotals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Entradas por Ministério</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Valores recebidos por ministério/centro de custo no período selecionado. Esses valores já estão
                incluídos no total geral de entradas (caixa geral).
              </p>
              <div className="space-y-2">
                {costCenterTotals.map((item) => (
                  <div
                    key={item.costCenterId}
                    className="flex items-center justify-between rounded-md border px-4 py-2"
                  >
                    <span>{item.costCenterName ?? "Ministério não identificado"}</span>
                    <span className="font-semibold">
                      R$ {item.total.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Pré-visualização do Relatório</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={generateReport}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Gerar PDF
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                disabled={!preview}
                onClick={() => {
                  if (!preview) return;
                  const win = window.open(preview.url, "_blank");
                  win?.addEventListener("load", () => win.print());
                }}
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
              <Button
                variant="outline"
                disabled={!preview}
                onClick={() => preview && preview.doc.save(preview.filename)}
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {preview ? (
              <iframe
                key={preview.url}
                src={preview.url}
                title="Pré-visualização do PDF"
                className="w-full h-[75vh] rounded-md border bg-muted"
              />
            ) : (
              <div className="flex h-[50vh] flex-col items-center justify-center gap-2 rounded-md border border-dashed text-muted-foreground">
                <FileText className="h-10 w-10 opacity-40" />
                <p className="text-sm text-center px-4">
                  Clique em "Gerar PDF" para visualizar o relatório aqui, no mesmo layout que será impresso.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
