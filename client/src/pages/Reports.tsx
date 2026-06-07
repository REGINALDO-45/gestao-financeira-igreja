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

declare global {
  interface Window {
    html2pdf: any;
  }
}

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
      const totalTithes = entries
        .filter(e => e.category === "dizimo")
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const totalOfferings = entries
        .filter(e => e.category === "oferta")
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const totalEntries = totalTithes + totalOfferings;

      const titheEntries = entries.filter(e => e.category === "dizimo");
      const offeringEntries = entries.filter(e => e.category === "oferta");

      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1a3a52; padding-bottom: 20px; }
              .header h1 { color: #1a3a52; margin: 5px 0; font-size: 24px; }
              .header p { margin: 3px 0; font-size: 12px; }
              .info-row { display: flex; justify-content: space-between; margin: 10px 0; font-size: 12px; }
              .info-box { flex: 1; margin-right: 20px; }
              .section-title { background-color: #1a3a52; color: white; padding: 10px; margin-top: 20px; margin-bottom: 10px; font-weight: bold; font-size: 14px; }
              .section-title.offerings { background-color: #c41e3a; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
              th { background-color: #f0f0f0; padding: 8px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold; }
              td { padding: 8px; border-bottom: 1px solid #eee; }
              .total-row { font-weight: bold; background-color: #f9f9f9; }
              .total-box { background-color: #1a3a52; color: white; padding: 15px; text-align: center; margin: 20px 0; font-size: 16px; font-weight: bold; }
              .verse { text-align: center; margin: 30px 0; font-style: italic; font-size: 12px; color: #666; }
              .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>IGREJA METODISTA MONTE ALEGRE</h1>
              <p>Servir a Deus é transformar vidas!</p>
            </div>
            
            <div class="info-row">
              <div class="info-box">
                <strong>Pastor:</strong> ${settings.pastorName || "N/A"}
              </div>
              <div class="info-box">
                <strong>Tesoureira:</strong> ${settings.treasurerName || "N/A"}
              </div>
              <div class="info-box">
                <strong>Referência:</strong> ${new Date(startDate).toLocaleDateString("pt-BR")}
              </div>
            </div>
            
            <h2 style="text-align: center; color: #1a3a52; margin-top: 30px;">RELATÓRIO DE ENTRADAS</h2>
            <p style="text-align: center; color: #666; font-size: 12px;">Dízimos e Ofertas por Domingo</p>
            
            <div class="section-title">DÍZIMOS</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Dizimista</th>
                  <th>Valor (R$)</th>
                </tr>
              </thead>
              <tbody>
                ${titheEntries.map((entry, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${entry.description || "Anônimo"}</td>
                    <td>R$ ${parseFloat(entry.amount).toFixed(2)}</td>
                  </tr>
                `).join("")}
                <tr class="total-row">
                  <td colspan="2">TOTAL DÍZIMOS</td>
                  <td>R$ ${totalTithes.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="section-title offerings">OFERTAS</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ofertante</th>
                  <th>Valor (R$)</th>
                </tr>
              </thead>
              <tbody>
                ${offeringEntries.map((entry, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${entry.description || "Visitante"}</td>
                    <td>R$ ${parseFloat(entry.amount).toFixed(2)}</td>
                  </tr>
                `).join("")}
                <tr class="total-row">
                  <td colspan="2">TOTAL OFERTAS</td>
                  <td>R$ ${totalOfferings.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="total-box">
              TOTAL GERAL A SER DEPOSITADO NA SEGUNDA-FEIRA<br>
              R$ ${totalEntries.toFixed(2)}
            </div>
            
            <div class="verse">
              "${settings.defaultVerse || "Cada um contribua segundo tiver proposto no coração, não com tristeza ou por necessidade; pois Deus ama ao que dá com alegria. 2 Coríntios 9:7"}"
            </div>
            
            <div class="footer">
              <p>Obrigado pela fidelidade e generosidade!</p>
              <p>Deus abençoe a vida de cada um.</p>
            </div>
          </body>
        </html>
      `;

      const element = document.createElement("div");
      element.innerHTML = htmlContent;
      
      const options = {
        margin: 10,
        filename: `Relatório_Entradas_${new Date().toISOString().split("T")[0]}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
      };

      if (!window.html2pdf) {
        toast.error("Biblioteca de PDF não carregada. Tente novamente.");
        return;
      }
      await new Promise((resolve) => {
        window.html2pdf().set(options).from(element).save().then(resolve);
      });
      toast.success("Relatório de Entradas gerado com sucesso!");
    } catch (error) {
      console.error(error);
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
      const balance = totalEntries - totalExpenses;

      // Agrupar entradas por categoria
      const categoryLabels: Record<string, string> = {
        "dizimo": "Dízimos",
        "oferta": "Ofertas",
        "oferta_especial": "Ofertas Especiais",
        "campanha": "Campanhas",
        "missoes": "Missões",
        "construcao": "Construção",
        "bazar": "Bazar",
        "almoco_beneficente": "Almoço Beneficente",
        "cantina": "Cantina",
        "doacao": "Doações",
        "outras_receitas": "Outras Receitas",
      };
      const entriesByCategory = entries.reduce((acc, entry) => {
        const cat = categoryLabels[entry.category] || entry.category;
        if (!acc[cat]) acc[cat] = 0;
        acc[cat] += parseFloat(entry.amount);
        return acc;
      }, {} as Record<string, number>);

      // Agrupar despesas por categoria
      const expenseCategoryLabels: Record<string, string> = {
        "agua": "Água",
        "energia": "Energia",
        "internet": "Internet",
        "aluguel": "Aluguel",
        "material_limpeza": "Material de Limpeza",
        "evangelismo": "Evangelismo",
        "missoes": "Missões",
        "construcao": "Construção",
        "equipamentos": "Equipamentos",
        "manutencao": "Manutenção",
        "outras_despesas": "Outras Despesas",
      };
      const expensesByCategory = expenses.reduce((acc, expense) => {
        const cat = expenseCategoryLabels[expense.category] || expense.category;
        if (!acc[cat]) acc[cat] = 0;
        acc[cat] += parseFloat(expense.amount);
        return acc;
      }, {} as Record<string, number>);

      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1a3a52; padding-bottom: 20px; }
              .header h1 { color: #1a3a52; margin: 5px 0; font-size: 24px; }
              .header p { margin: 3px 0; font-size: 12px; }
              .info-row { display: flex; justify-content: space-between; margin: 10px 0; font-size: 12px; }
              .info-box { flex: 1; margin-right: 20px; }
              .section-title { background-color: #1a3a52; color: white; padding: 10px; margin-top: 20px; margin-bottom: 10px; font-weight: bold; font-size: 14px; }
              .stats { display: flex; justify-content: space-between; margin: 20px 0; }
              .stat-box { flex: 1; padding: 15px; margin-right: 10px; text-align: center; border: 1px solid #ddd; border-radius: 5px; }
              .stat-box.income { background-color: #e8f5e9; border-left: 4px solid #4caf50; }
              .stat-box.expense { background-color: #ffebee; border-left: 4px solid #f44336; }
              .stat-box.balance { background-color: #e3f2fd; border-left: 4px solid #2196f3; }
              .stat-value { font-size: 20px; font-weight: bold; color: #1a3a52; }
              .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
              th { background-color: #f0f0f0; padding: 8px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold; }
              td { padding: 8px; border-bottom: 1px solid #eee; }
              .total-row { font-weight: bold; background-color: #f9f9f9; }
              .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; }
              .signature-area { display: flex; justify-content: space-around; margin-top: 50px; }
              .signature-line { text-align: center; width: 150px; border-top: 1px solid #333; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>IGREJA METODISTA MONTE ALEGRE</h1>
              <p>Servir a Deus é transformar vidas!</p>
            </div>
            
            <div class="info-row">
              <div class="info-box">
                <strong>Pastor:</strong> ${settings.pastorName || "N/A"}
              </div>
              <div class="info-box">
                <strong>Tesoureira:</strong> ${settings.treasurerName || "N/A"}
              </div>
              <div class="info-box">
                <strong>Período:</strong> ${new Date(startDate).toLocaleDateString("pt-BR")} a ${new Date(endDate).toLocaleDateString("pt-BR")}
              </div>
            </div>
            
            <h2 style="text-align: center; color: #1a3a52; margin-top: 30px;">RELATÓRIO FINANCEIRO-CLERICAL</h2>
            
            <div class="stats">
              <div class="stat-box income">
                <div class="stat-value">R$ ${totalEntries.toFixed(2)}</div>
                <div class="stat-label">Total de Entradas</div>
              </div>
              <div class="stat-box expense">
                <div class="stat-value">R$ ${totalExpenses.toFixed(2)}</div>
                <div class="stat-label">Total de Saídas</div>
              </div>
              <div class="stat-box balance">
                <div class="stat-value">R$ ${balance.toFixed(2)}</div>
                <div class="stat-label">Saldo do Período</div>
              </div>
            </div>
            
            <div class="section-title">DEMONSTRATIVO FINANCEIRO</div>
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Valor (R$)</th>
                </tr>
              </thead>
              <tbody>
                <tr style="font-weight: bold; background-color: #e8f5e9;">
                  <td>ENTRADAS</td>
                  <td>R$ ${totalEntries.toFixed(2)}</td>
                </tr>
                ${Object.entries(entriesByCategory).map(([cat, value]) => `
                  <tr>
                    <td style="padding-left: 20px;">${cat}</td>
                    <td>R$ ${(value as number).toFixed(2)}</td>
                  </tr>
                `).join("")}
                <tr style="font-weight: bold; background-color: #ffebee; margin-top: 10px;">
                  <td>SAÍDAS</td>
                  <td>R$ ${totalExpenses.toFixed(2)}</td>
                </tr>
                ${Object.entries(expensesByCategory).map(([cat, value]) => `
                  <tr>
                    <td style="padding-left: 20px;">${cat}</td>
                    <td>R$ ${(value as number).toFixed(2)}</td>
                  </tr>
                `).join("")}
                <tr class="total-row" style="background-color: #e3f2fd;">
                  <td>SALDO DO PERÍODO</td>
                  <td>R$ ${balance.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="signature-area">
              <div class="signature-line">Pastor<br>${settings.pastorName || "_________________"}</div>
              <div class="signature-line">Tesoureira<br>${settings.treasurerName || "_________________"}</div>
            </div>
            
            <div class="footer">
              <p>Relatório gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
              <p>Honre o Senhor com os seus bens e com as primícias de toda a sua renda. Provérbios 3:9</p>
            </div>
          </body>
        </html>
      `;

      const element = document.createElement("div");
      element.innerHTML = htmlContent;
      
      const options = {
        margin: 10,
        filename: `Relatório_Financeiro_${new Date().toISOString().split("T")[0]}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
      };

      if (!window.html2pdf) {
        toast.error("Biblioteca de PDF não carregada. Tente novamente.");
        return;
      }
      await new Promise((resolve) => {
        window.html2pdf().set(options).from(element).save().then(resolve);
      });
      toast.success("Relatório Financeiro-Clerical gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar relatório");
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
            <CardTitle>Gerar Relatórios</CardTitle>
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

            <Button
              onClick={reportType === "entries" ? generateEntriesReport : generateFinancialReport}
              disabled={isGenerating}
              className="w-full"
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
