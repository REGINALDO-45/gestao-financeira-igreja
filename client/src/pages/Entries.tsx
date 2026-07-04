import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, Plus, X, Pencil, Search, Download } from "lucide-react";
import { toast } from "sonner";
import { useAuthGuard, isTreasurer } from "@/hooks/useAuthGuard";
import { useIsMobile } from "@/hooks/useMobile";
import { EntryForm } from "@/components/forms/EntryForm";
import { CategoryIcon } from "@/components/transactions/CategoryIcon";
import { matchesSearch } from "@/lib/searchTransactions";
import { buildCsv, downloadCsv } from "@/lib/exportCsv";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Entry = RouterOutputs["entries"]["list"][number];

export default function Entries() {
  const { user } = useAuthGuard();
  const isMobile = useIsMobile();
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
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEntries = useMemo(() => {
    if (!entries) return [];

    return entries.filter((entry) => {
      const memberName = entry.memberId ? members?.find((m) => m.id === entry.memberId)?.name : undefined;
      if (!matchesSearch(searchQuery, [entry.description, memberName, entry.category])) return false;

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
  }, [entries, members, filterCategory, filterPaymentMethod, filterMemberId, filterDateFrom, filterDateTo, searchQuery]);

  const clearFilters = () => {
    setFilterCategory("all");
    setFilterPaymentMethod("all");
    setFilterMemberId("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const handleExport = () => {
    const csv = buildCsv(filteredEntries, [
      { header: "Data", value: (e) => new Date(e.entryDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) },
      { header: "Categoria", value: (e) => e.category.replace(/_/g, " ") },
      { header: "Descrição", value: (e) => e.description ?? "" },
      { header: "Membro", value: (e) => (e.memberId ? members?.find((m) => m.id === e.memberId)?.name ?? "" : "") },
      { header: "Valor", value: (e) => parseFloat(e.amount).toFixed(2) },
      { header: "Forma de Pagamento", value: (e) => e.paymentMethod },
    ]);
    downloadCsv(`entradas-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const hasActiveFilters =
    (filterCategory && filterCategory !== "all") ||
    (filterPaymentMethod && filterPaymentMethod !== "all") ||
    (filterMemberId && filterMemberId !== "all") ||
    filterDateFrom ||
    filterDateTo;

  if (isLoading) {
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Entradas</h1>
            <p className="text-sm text-muted-foreground">Dízimos, ofertas e outras receitas</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição ou membro…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 w-full sm:w-56"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredEntries.length === 0}>
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            {isTreasurer(user?.role) && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size={isMobile ? "sm" : "default"} id="new-entry-btn">
                    <Plus className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Nova Entrada</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Registrar Nova Entrada</DialogTitle>
                  </DialogHeader>
                  <EntryForm onSuccess={() => setOpen(false)} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <Label htmlFor="filter-category" className="text-xs sm:text-sm">Categoria</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger id="filter-category" className="text-xs sm:text-sm h-9">
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
                <Label htmlFor="filter-payment" className="text-xs sm:text-sm">Pagamento</Label>
                <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                  <SelectTrigger id="filter-payment" className="text-xs sm:text-sm h-9">
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
                <Label htmlFor="filter-member" className="text-xs sm:text-sm">Membro</Label>
                <Select value={filterMemberId} onValueChange={setFilterMemberId}>
                  <SelectTrigger id="filter-member" className="text-xs sm:text-sm h-9">
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
                <Label htmlFor="filter-date-from" className="text-xs sm:text-sm">Data De</Label>
                <Input
                  id="filter-date-from"
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="text-xs sm:text-sm h-9"
                />
              </div>

              <div>
                <Label htmlFor="filter-date-to" className="text-xs sm:text-sm">Data Até</Label>
                <Input
                  id="filter-date-to"
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="text-xs sm:text-sm h-9"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {filterCategory !== "all" && (
                  <Badge variant="secondary" className="rounded-full capitalize">{filterCategory.replace(/_/g, " ")}</Badge>
                )}
                {filterPaymentMethod !== "all" && (
                  <Badge variant="secondary" className="rounded-full capitalize">{filterPaymentMethod}</Badge>
                )}
                {filterMemberId !== "all" && filterMemberId !== "" && (
                  <Badge variant="secondary" className="rounded-full">
                    {members?.find((m) => m.id.toString() === filterMemberId)?.name ?? "Membro"}
                  </Badge>
                )}
                {(filterDateFrom || filterDateTo) && (
                  <Badge variant="secondary" className="rounded-full">Período filtrado</Badge>
                )}
                <span className="text-xs text-muted-foreground">{filteredEntries.length} resultado(s)</span>
                <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2 text-xs sm:text-sm">
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                  Limpar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de Entradas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Lançamentos de Entradas</CardTitle>
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
                          <span className="flex items-center gap-2">
                            <CategoryIcon category={entry.category} type="entrada" />
                            {entry.category.replace(/_/g, " ")}
                          </span>
                        </TableCell>
                        <TableCell>{entry.memberId ? "Membro ID: " + entry.memberId : "-"}</TableCell>
                        <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">
                          +R$ {parseFloat(entry.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="capitalize">{entry.paymentMethod}</TableCell>
                        <TableCell>{entry.cultoSunday || "-"}</TableCell>
                        <TableCell>
                          {entry.costCenterId ? costCenterNameById.get(entry.costCenterId) ?? "-" : "-"}
                        </TableCell>
                        {isTreasurer(user?.role) && (
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setEditingEntry(entry)}>
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
              <div className="text-center py-8 text-muted-foreground text-sm">
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
