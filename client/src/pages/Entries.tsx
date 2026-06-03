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
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Entries() {
  const [open, setOpen] = useState(false);
  const { data: entries, isLoading } = trpc.entries.list.useQuery();
  const { data: members } = trpc.members.list.useQuery();
  const createEntry = trpc.entries.create.useMutation();

  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    category: "dizimo",
    amount: "",
    paymentMethod: "pix",
    memberId: "",
    cultoSunday: "",
    description: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEntry.mutateAsync({
        ...formData,
        entryDate: new Date(formData.entryDate),
        memberId: formData.memberId ? parseInt(formData.memberId) : undefined,
        category: formData.category as any,
        paymentMethod: formData.paymentMethod as any,
      });
      toast.success("Entrada registrada com sucesso!");
      setFormData({
        entryDate: new Date().toISOString().split('T')[0],
        category: "dizimo",
        amount: "",
        paymentMethod: "pix",
        memberId: "",
        cultoSunday: "",
        description: "",
      });
      setOpen(false);
    } catch (error) {
      toast.error("Erro ao registrar entrada");
    }
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
            <h1 className="text-3xl font-bold">Entradas</h1>
            <p className="text-muted-foreground">Dízimos, ofertas e outras receitas</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Entrada
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Nova Entrada</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="entryDate">Data</Label>
                  <Input
                    id="entryDate"
                    type="date"
                    value={formData.entryDate}
                    onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as any })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dizimo">Dízimo</SelectItem>
                      <SelectItem value="oferta">Oferta</SelectItem>
                      <SelectItem value="oferta_especial">Oferta Especial</SelectItem>
                      <SelectItem value="campanha">Campanha</SelectItem>
                      <SelectItem value="missoes">Missões</SelectItem>
                      <SelectItem value="construcao">Construção</SelectItem>
                      <SelectItem value="bazar">Bazar</SelectItem>
                      <SelectItem value="almoco_beneficente">Almoço Beneficente</SelectItem>
                      <SelectItem value="cantina">Cantina</SelectItem>
                      <SelectItem value="doacao">Doação</SelectItem>
                      <SelectItem value="outras_receitas">Outras Receitas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="amount">Valor (R$)</Label>
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
                  <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                  <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value as any })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a forma de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="cartao">Cartão</SelectItem>
                      <SelectItem value="deposito">Depósito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="memberId">Membro (Opcional)</Label>
                  <Select value={formData.memberId} onValueChange={(value) => setFormData({ ...formData, memberId: value })}>
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
                  <Label htmlFor="cultoSunday">Culto/Domingo</Label>
                  <Input
                    id="cultoSunday"
                    placeholder="Ex: Domingo, 26 de Maio"
                    value={formData.cultoSunday}
                    onChange={(e) => setFormData({ ...formData, cultoSunday: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Observações</Label>
                  <Input
                    id="description"
                    placeholder="Observações adicionais"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Registrar Entrada
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lançamentos de Entradas</CardTitle>
          </CardHeader>
          <CardContent>
            {entries && entries.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Membro</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Forma de Pagamento</TableHead>
                      <TableHead>Culto/Domingo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {new Date(entry.entryDate).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="capitalize">
                          {entry.category.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>{entry.memberId ? "Membro ID: " + entry.memberId : "-"}</TableCell>
                        <TableCell className="font-semibold">
                          R$ {parseFloat(entry.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="capitalize">{entry.paymentMethod}</TableCell>
                        <TableCell>{entry.cultoSunday || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma entrada registrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
