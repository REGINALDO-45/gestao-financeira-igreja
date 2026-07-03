import { useState, useMemo } from "react";
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
import { Loader2, Plus, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuthGuard, isTreasurer } from "@/hooks/useAuthGuard";
import { EntryForm } from "@/components/forms/EntryForm";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Entry = RouterOutputs["entries"]["list"][number];

export default function Entries() {
  const { user } = useAuthGuard();
  const [open, setOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const { data: entries, isLoading } = trpc.entries.list.useQuery();
  const { data: members } = trpc.members.list.useQuery();
  const { data: costCenters } = trpc.costCenters.list.useQuery();
  const costCenterNameById = useMemo(() => {
    const map = new Map<number, string>();
    costCenters?.forEach((cc) => map.set(cc.id, cc.name));
    return map;
  }, [costCenters]);

  // Filtros
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("");
  const [filterMemberId, setFilterMemberId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const filteredEntries = useMemo(() => {
    if (!entries) return [];

    return entries.filter((entry) => {
      if (filterCategory && filterCategory !== "all" && entry.category !== filterCategory) return false;
      if (filterPaymentMethod && filterPaymentMethod !== "all" && entry.paymentMethod !== filterPaymentMethod) return false;
      if (filterMemberId && filterMemberId !== "all" && entry.memberId?.toString() !== filterMemberId) return false;

      if (filterDateFrom) {
        const entryDate = new Date(entry.entryDate);
        const fromDate = new Date(filterDateFrom);
        if (entryDate < fromDate) return false;
      }

      if (filterDateTo) {
        const entryDate = new Date(entry.entryDate);
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (entryDate > toDate) return false;
      }

      return true;
    });
  }, [entries, filterCategory, filterPaymentMethod, filterMemberId, filterDateFrom, filterDateTo]);

  const clearFilters = () => {
    setFilterCategory("all");
    setFilterPaymentMethod("all");
    setFilterMemberId("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const hasActiveFilters = (filterCategory && filterCategory !== "all") || (filterPaymentMethod && filterPaymentMethod !== "all") || (filterMemberId && filterMemberId !== "all") || filterDateFrom || filterDateTo;

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
          {isTreasurer(user?.role) && (
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
                <EntryForm onSuccess={() => setOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="filter-category" className="text-sm">Categoria</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger id="filter-category">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
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
                <Label htmlFor="filter-payment" className="text-sm">Forma de Pagamento</Label>
                <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                  <SelectTrigger id="filter-payment">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="deposito">Depósito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filter-member" className="text-sm">Membro</Label>
                <Select value={filterMemberId} onValueChange={setFilterMemberId}>
                  <SelectTrigger id="filter-member">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {members?.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filter-date-from" className="text-sm">Data De</Label>
                <Input
                  id="filter-date-from"
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="filter-date-to" className="text-sm">Data Até</Label>
                <Input
                  id="filter-date-to"
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {filteredEntries.length} resultado(s) encontrado(s)
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Limpar Filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lançamentos de Entradas</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredEntries && filteredEntries.length > 0 ? (
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
                      <TableHead>Ministério</TableHead>
                      {isTreasurer(user?.role) && <TableHead className="text-right">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {new Date(entry.entryDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
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
                        <TableCell>
                          {entry.costCenterId ? costCenterNameById.get(entry.costCenterId) ?? "-" : "-"}
                        </TableCell>
                        {isTreasurer(user?.role) && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingEntry(entry)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        )}
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

        <Dialog open={editingEntry !== null} onOpenChange={(isOpen) => !isOpen && setEditingEntry(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Entrada</DialogTitle>
            </DialogHeader>
            {editingEntry && (
              <EntryForm entry={editingEntry} onSuccess={() => setEditingEntry(null)} />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
