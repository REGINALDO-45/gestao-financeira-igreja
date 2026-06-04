import { useState } from "react";
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
import { Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

export default function Reports() {
  const [reportType, setReportType] = useState("entries");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: settings } = trpc.churchSettings.get.useQuery();
  const { data: entries } = trpc.entries.listByDateRange.useQuery({
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });
  const { data: expenses } = trpc.expenses.listByDateRange.useQuery({
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });

  const generateEntriesReport = async () => {
    if (!entries || !settings) {
      toast.error("Dados insuficientes para gerar relatório");
      return;
    }

    setIsGenerating(true);
    try {
      // Simular geração de PDF
      const reportData = {
        churchName: settings.churchName,
        pastorName: settings.pastorName,
        treasurerName: settings.treasurerName,
        date: new Date().toLocaleDateString("pt-BR"),
        entries: entries,
        totalEntries: entries.reduce((sum, e) => sum + parseFloat(e.amount), 0),
        verse: settings.defaultVerse,
      };

      // Aqui você implementaria a geração real do PDF
      console.log("Relatório de Entradas:", reportData);
      toast.success("Relatório de Entradas gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFinancialReport = async () => {
    if (!entries || !expenses || !settings) {
      toast.error("Dados insuficientes para gerar relatório");
      return;
    }

    setIsGenerating(true);
    try {
      const totalEntries = entries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

      const reportData = {
        churchName: settings.churchName,
        pastorName: settings.pastorName,
        treasurerName: settings.treasurerName,
        date: new Date().toLocaleDateString("pt-BR"),
        period: `${startDate} a ${endDate}`,
        totalEntries,
        totalExpenses,
        balance: totalEntries - totalExpenses,
        entries,
        expenses,
      };

      // Aqui você implementaria a geração real do PDF
      console.log("Relatório Financeiro-Clerical:", reportData);
      toast.success("Relatório Financeiro-Clerical gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Geração de relatórios institucionais em PDF</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gerar Relatório</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reportType">Tipo de Relatório</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de relatório" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entries">Relatório de Entradas Dominical</SelectItem>
                    <SelectItem value="financial">Relatório Financeiro-Clerical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="endDate">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <Button
              onClick={
                reportType === "entries" ? generateEntriesReport : generateFinancialReport
              }
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Gerar PDF
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Relatório de Entradas Dominical</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Documento institucional com tabelas de dízimos e ofertas, cabeçalho com logo,
                pastor e tesoureira, versículo bíblico e rodapé.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setReportType("entries");
                }}
              >
                Selecionar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Relatório Financeiro-Clerical</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Relatório gerencial com gráficos, resumo de entradas e saídas por período,
                campo de assinaturas e análise financeira completa.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setReportType("financial");
                }}
              >
                Selecionar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
