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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Printer, Download } from "lucide-react";
import { toast } from "sonner";

export default function Receipts() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    memberId: "",
    entryId: "",
    receiptNumber: "",
    amount: "",
    category: "dizimo",
    receiptDate: new Date().toISOString().split("T")[0],
  });

  const { data: receipts = [], isLoading } = trpc.receipts.listByMember.useQuery(
    { memberId: 0 },
    { enabled: false }
  );
  const { data: members } = trpc.members.list.useQuery();
  const { data: entries } = trpc.entries.list.useQuery();
  const createReceipt = trpc.receipts.create.useMutation();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.memberId || !formData.amount || !formData.receiptNumber) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      await createReceipt.mutateAsync({
        memberId: parseInt(formData.memberId),
        entryId: parseInt(formData.entryId || "0"),
        receiptNumber: formData.receiptNumber,
        amount: formData.amount,
        category: formData.category,
        issuedDate: new Date(formData.receiptDate),
      });
      toast.success("Recibo gerado com sucesso!");
      setFormData({
        memberId: "",
        entryId: "",
        receiptNumber: "",
        amount: "",
        category: "dizimo",
        receiptDate: new Date().toISOString().split("T")[0],
      });
      setOpen(false);
    } catch (error) {
      toast.error("Erro ao gerar recibo");
    }
  };

  const handlePrintPDF = (receipt: any) => {
    if (!window.html2pdf) {
      toast.error("Biblioteca de PDF não carregada");
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            .receipt-container { max-width: 600px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a3a52; padding-bottom: 20px; }
            .header h1 { color: #1a3a52; margin: 5px 0; font-size: 20px; }
            .header p { margin: 3px 0; font-size: 11px; }
            .receipt-number { text-align: center; font-weight: bold; font-size: 14px; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 10px 0; font-size: 12px; }
            .info-label { font-weight: bold; }
            .details { margin: 30px 0; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; font-size: 12px; }
            .amount-box { background-color: #1a3a52; color: white; padding: 20px; text-align: center; margin: 30px 0; font-size: 18px; font-weight: bold; }
            .footer { text-align: center; margin-top: 40px; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; }
            .signature-area { margin-top: 50px; text-align: center; }
            .signature-line { border-top: 1px solid #333; width: 200px; margin: 30px auto 5px; }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <h1>IGREJA METODISTA MONTE ALEGRE</h1>
              <p>Servir a Deus é transformar vidas!</p>
            </div>
            
            <div class="receipt-number">
              RECIBO Nº ${receipt.receiptNumber}
            </div>
            
            <div class="info-row">
              <div><span class="info-label">Membro:</span> ${receipt.memberName || "N/A"}</div>
              <div><span class="info-label">Data:</span> ${new Date(receipt.issuedDate).toLocaleDateString("pt-BR")}</div>
            </div>
            
            <div class="details">
              <div class="detail-row">
                <span>Categoria:</span>
                <span>${receipt.category || "N/A"}</span>
              </div>
              <div class="detail-row">
                <span>Descrição:</span>
                <span>${receipt.description || "Contribuição"}</span>
              </div>
            </div>
            
            <div class="amount-box">
              Valor: R$ ${parseFloat(receipt.amount).toFixed(2)}
            </div>
            
            <div class="signature-area">
              <p style="font-size: 12px; margin-bottom: 20px;">Obrigado pela sua contribuição!</p>
              <div class="signature-line"></div>
              <p style="font-size: 11px; margin-top: 5px;">Assinatura do Tesoureiro</p>
            </div>
            
            <div class="footer">
              <p>Este recibo comprova a contribuição realizada à Igreja Metodista Monte Alegre.</p>
              <p>Emitido em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const element = document.createElement("div");
    element.innerHTML = htmlContent;
    
    const options = {
      margin: 10,
      filename: `Recibo_${receipt.receiptNumber}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
    };

    window.html2pdf().set(options).from(element).save();
    toast.success("Recibo exportado com sucesso!");
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Recibos</h1>
            <p className="text-muted-foreground">Geração e impressão de recibos individuais</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Recibo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gerar Novo Recibo</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="memberId">Membro *</Label>
                  <Select
                    value={formData.memberId}
                    onValueChange={(value) => setFormData({ ...formData, memberId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um membro" />
                    </SelectTrigger>
                    <SelectContent>
                      {members?.map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="entryId">Lançamento (Opcional)</Label>
                  <Select
                    value={formData.entryId}
                    onValueChange={(value) => setFormData({ ...formData, entryId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um lançamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {entries?.map((entry) => (
                        <SelectItem key={entry.id} value={entry.id.toString()}>
                          {entry.category} - R$ {parseFloat(entry.amount).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="receiptNumber">Número do Recibo *</Label>
                  <Input
                    id="receiptNumber"
                    placeholder="Ex: REC-001"
                    value={formData.receiptNumber}
                    onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="amount">Valor (R$) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dizimo">Dízimo</SelectItem>
                      <SelectItem value="oferta">Oferta</SelectItem>
                      <SelectItem value="oferta_especial">Oferta Especial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="receiptDate">Data do Recibo</Label>
                  <Input
                    id="receiptDate"
                    type="date"
                    value={formData.receiptDate}
                    onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Gerar Recibo
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recibos Gerados</CardTitle>
          </CardHeader>
          <CardContent>
            {receipts && receipts.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Membro</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts.map((receipt) => (
                      <TableRow key={receipt.id}>
                        <TableCell className="font-medium">
                          {receipt.receiptNumber}
                        </TableCell>
                        <TableCell>
                          {members?.find((m) => m.id === receipt.memberId)?.name || "-"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          R$ {parseFloat(receipt.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {new Date(receipt.issuedDate).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePrintPDF(receipt)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum recibo gerado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
