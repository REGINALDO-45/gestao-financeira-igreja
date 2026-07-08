import { useState, useMemo } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/useMobile";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CostCenters() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const isMobile = useIsMobile();

  const { data: costCenters, isLoading } = trpc.costCenters.list.useQuery();
  const { data: entries, isLoading: entriesLoading } = trpc.entries.list.useQuery();
  const { data: expenses, isLoading: expensesLoading } = trpc.expenses.list.useQuery();
  const createCostCenter = trpc.costCenters.create.useMutation();

  const costCenterTotals = useMemo(() => {
    if (!costCenters) return [];
    const totalsMap = new Map<number, { entradas: number; saidas: number }>();
    costCenters.forEach((cc) => totalsMap.set(cc.id, { entradas: 0, saidas: 0 }));

    (entries ?? []).forEach((entry) => {
      if (entry.costCenterId == null) return;
      const bucket = totalsMap.get(entry.costCenterId);
      if (bucket) bucket.entradas += parseFloat(entry.amount);
    });
    (expenses ?? []).forEach((expense) => {
      if (expense.costCenterId == null) return;
      const bucket = totalsMap.get(expense.costCenterId);
      if (bucket) bucket.saidas += parseFloat(expense.amount);
    });

    return costCenters.map((cc) => {
      const { entradas, saidas } = totalsMap.get(cc.id)!;
      return {
        id: cc.id,
        name: cc.name,
        entradas: Math.round(entradas * 100) / 100,
        saidas: Math.round(saidas * 100) / 100,
        saldo: Math.round((entradas - saidas) * 100) / 100,
      };
    });
  }, [costCenters, entries, expenses]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Nome do centro de custo é obrigatório");
      return;
    }

    try {
      await createCostCenter.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
      });
      toast.success("Centro de custo criado com sucesso!");
      setFormData({ name: "", description: "" });
      setOpen(false);
    } catch (error) {
      toast.error("Erro ao criar centro de custo");
    }
  };

  if (isLoading || entriesLoading || expensesLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin w-8 h-8" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Centros de Custo</h1>
            <p className="text-sm text-muted-foreground">Departamentos e projetos da igreja</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size={isMobile ? "sm" : "default"} id="new-cost-center-btn">
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Novo Centro de Custo</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Centro de Custo</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Evangelismo, Missões, Construção"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Descrição do centro de custo"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createCostCenter.isPending}>
                  {createCostCenter.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Criar Centro de Custo
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Totais por Centro de Custo */}
        {costCenterTotals.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {costCenterTotals.map((cc) => (
              <Card key={cc.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base truncate">{cc.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Entradas</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {brl(cc.entradas)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Saídas</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {brl(cc.saidas)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-1 border-t">
                    <span className="text-muted-foreground">Saldo</span>
                    <span
                      className={`font-bold ${
                        cc.saldo >= 0
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {brl(cc.saldo)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Lista de Centros de Custo</CardTitle>
          </CardHeader>
          <CardContent>
            {costCenters && costCenters.length > 0 ? (
              <>
                {/* Mobile: card list */}
                <div className="flex flex-col gap-3 sm:hidden">
                  {costCenters.map((cc) => (
                    <div key={cc.id} className="rounded-lg border bg-card p-3 space-y-1.5">
                      <p className="font-semibold text-sm">{cc.name}</p>
                      {cc.description && (
                        <p className="text-xs text-muted-foreground">{cc.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="w-3 h-3" />
                        <span>Criado em {new Date(cc.createdAt).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: standard table */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Data de Criação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costCenters.map((cc) => (
                        <TableRow key={cc.id}>
                          <TableCell className="font-medium">{cc.name}</TableCell>
                          <TableCell>{cc.description || "-"}</TableCell>
                          <TableCell>
                            {new Date(cc.createdAt).toLocaleDateString("pt-BR")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhum centro de custo cadastrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
