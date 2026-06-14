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

  const { data: settings } = trpc.churchSettings.get.useQuery();
  const { data: entries } = trpc.entries.listByDateRange.useQuery({
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });
  const { data: expenses } = trpc.expenses.listByDateRange.useQuery({
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });
  const { data: costCenterTotals } = trpc.entries.summaryByCostCenter.useQuery({
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });

  // Período do mês anterior, usado para calcular as cotas regional/distrital
  const prevMonthRange = useMemo(() => {
    const d = new Date(startDate + "T12:00:00");
    const prevMonthStart = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const prevMonthEnd = new Date(d.getFullYear(), d.getMonth(), 0);
    return { startDate: prevMonthStart, endDate: prevMonthEnd };
  }, [startDate]);

  const { data: prevMonthEntries } = trpc.entries.listByDateRange.useQuery(prevMonthRange);

  const pastorName    = settings?.pastorName    ?? "Pr. Reginaldo Medeiros";
  const treasurerName = settings?.treasurerName ?? "Ageovany";

  const generateEntriesReport = async () => {
    setIsGenerating(true);
    try {
      if (!entries) throw new Error("Nenhum dado encontrado para o período selecionado");
      const tithes    = entries.filter(e => e.category === "dizimo").map(e => ({ name: e.description || "Dizimista", amount: parseFloat(e.amount) }));
      const offerings = entries.filter(e => e.category === "oferta").map(e => ({ name: e.description || "Ofertante", amount: parseFloat(e.amount) }));
      const d = new Date(startDate + "T12:00:00");
      const wd = d.toLocaleDateString("pt-BR", { weekday: "long" });
      const mo = d.toLocaleDateString("pt-BR", { month: "long" });
      const refDate = `${wd.charAt(0).toUpperCase() + wd.slice(1)}, ${d.getDate()} de ${mo.charAt(0).toUpperCase() + mo.slice(1)} de ${d.getFullYear()}`;
      const nd = new Date(d); nd.setDate(d.getDate() + 1);
      const depositDate = nd.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

      const result = await buildEntriesReport(tithes, offerings, refDate, depositDate, pastorName, treasurerName);
      showPreview(result);
      toast.success("Relatório de Entradas gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFinancialReport = async () => {
    setIsGenerating(true);
    try {
      if (!entries || !expenses) throw new Error("Nenhum dado encontrado para o período selecionado");
      const totalEntries  = entries.reduce((s, e) => s + parseFloat(e.amount), 0);
      const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
      const d = new Date(startDate + "T12:00:00");
      const mo = d.toLocaleDateString("pt-BR", { month: "long" });

      const prevMonthEntriesTotal = (prevMonthEntries ?? []).reduce((s, e) => s + parseFloat(e.amount), 0);
      const cotaRegionalTotal = prevMonthEntriesTotal * 0.11;
      const cotaDistritalTotal = prevMonthEntriesTotal * 0.04;

      const result = await buildFinancialReport({
        refDate: `${mo.charAt(0).toUpperCase() + mo.slice(1)} ${d.getFullYear()}`,
        pastorName,
        treasurerName,
        totalEntries,
        totalExpenses,
        balance: totalEntries - totalExpenses,
        balanceAvailable: totalEntries - totalExpenses,
        dizimosTotal: entries.filter(e => e.category === "dizimo").reduce((s, e) => s + parseFloat(e.amount), 0),
        ofertasTotal: entries.filter(e => e.category === "oferta").reduce((s, e) => s + parseFloat(e.amount), 0),
        ofertasEspeciaisTotal: entries.filter(e => ["oferta_especial","campanha","missoes","construcao"].includes(e.category)).reduce((s, e) => s + parseFloat(e.amount), 0),
        bazarTotal: entries.filter(e => e.category === "bazar").reduce((s, e) => s + parseFloat(e.amount), 0),
        almocoTotal: entries.filter(e => ["almoco_beneficente","cantina"].includes(e.category)).reduce((s, e) => s + parseFloat(e.amount), 0),
        outrasEntradasTotal: entries.filter(e => ["doacao","outras_receitas"].includes(e.category)).reduce((s, e) => s + parseFloat(e.amount), 0),
        despesasFixasTotal: expenses.filter(e => ["agua","energia","internet","aluguel"].includes(e.category)).reduce((s, e) => s + parseFloat(e.amount), 0),
        despesasMinisteriaisTotal: expenses.filter(e => ["evangelismo","missoes"].includes(e.category)).reduce((s, e) => s + parseFloat(e.amount), 0),
        despesasAdminTotal: expenses.filter(e => ["material_limpeza","manutencao","outras_despesas"].includes(e.category)).reduce((s, e) => s + parseFloat(e.amount), 0),
        investimentosTotal: expenses.filter(e => ["construcao","equipamentos"].includes(e.category)).reduce((s, e) => s + parseFloat(e.amount), 0),
        prevMonthEntriesTotal,
        cotaRegionalTotal,
        cotaDistritalTotal,
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
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cotas Regional e Distrital</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Calculadas sobre o total de entradas do mês anterior ({prevMonthRange.startDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}):{" "}
              <span className="font-semibold">
                R$ {(prevMonthEntries ?? []).reduce((s, e) => s + parseFloat(e.amount), 0).toFixed(2)}
              </span>
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-md border px-4 py-2">
                <span>Cota Regional (11%)</span>
                <span className="font-semibold">
                  R$ {((prevMonthEntries ?? []).reduce((s, e) => s + parseFloat(e.amount), 0) * 0.11).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md border px-4 py-2">
                <span>Cota Distrital (4%)</span>
                <span className="font-semibold">
                  R$ {((prevMonthEntries ?? []).reduce((s, e) => s + parseFloat(e.amount), 0) * 0.04).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {costCenterTotals && costCenterTotals.length > 0 && (
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
                onClick={reportType === "entries" ? generateEntriesReport : generateFinancialReport}
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
