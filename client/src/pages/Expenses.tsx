import { useState, useMemo, useEffect } from "react";
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
import { Loader2, Plus, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuthGuard, isTreasurer } from "@/hooks/useAuthGuard";
import { useIsMobile } from "@/hooks/useMobile";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { RecurringExpensesDialog } from "@/components/forms/RecurringExpensesDialog";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Expense = RouterOutputs["expenses"]["list"][number];

export default function Expenses() {
  const { user } = useAuthGuard();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Filtros
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCostCenter, setFilterCostCenter] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const { data: expenses, isLoading } = trpc.expenses.list.useQuery();
  const { data: costCenters } = trpc.costCenters.list.useQuery();
  const { data: settings } = trpc.churchSettings.get.useQuery();

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);

  useEffect(() => {
    if (
      isTreasurer(user?.role) &&
      settings &&
      settings.lastRecurringExpensePromptMonth !== currentMonth
    ) {
      setRecurringDialogOpen(true);
    }
  }, [settings, user?.role, currentMonth]);

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];

    return expenses.filter((expense) => {
      if (filterCategory && filterCategory !== "all" && expense.category !== filterCategory) return false;
      if (filterStatus && filterStatus !== "all" && expense.paymentStatus !== filterStatus) return false;
      if (filterCostCenter && filterCostCenter !== "all" && expense.costCenterId?.toString() !== filterCostCenter) return false;

      if (filterDateFrom) {
        const expenseDate = new Date(expense.expenseDate);
        const fromDate = new Date(filterDateFrom);
        if (expenseDate < fromDate) return false;
      }

      if (filterDateTo) {
        const expenseDate = new Date(expense.expenseDate);
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (expenseDate > toDate) return false;
      }

      return true;
    });
  }, [expenses, filterCategory, filterStatus, filterCostCenter, filterDateFrom, filterDateTo]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pago":
        return "bg-green-100 text-green-800";
      case "pendente":
        return "bg-yellow-100 text-yellow-800";
      case "cancelado":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const clearFilters = () => {
    setFilterCategory("all");
    setFilterStatus("all");
    setFilterCostCenter("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const hasActiveFilters =
    (filterCategory && filterCategory !== "all") ||
    (filterStatus && filterStatus !== "all") ||
    (filterCostCenter && filterCostCenter !== "all") ||
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Saídas</h1>
            <p className="text-sm text-muted-foreground">Despesas e saídas financeiras</p>
          </div>
          {isTreasurer(user?.role) && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size={isMobile ? "sm" : "default"} id="new-expense-btn">
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Nova Despesa</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Registrar Nova Despesa</DialogTitle>
                </DialogHeader>
                <ExpenseForm onSuccess={() => setOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
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
                    <SelectItem value="agua">Água</SelectItem>
                    <SelectItem value="energia">Energia</SelectItem>
                    <SelectItem value="internet">Internet</SelectItem>
                    <SelectItem value="aluguel">Aluguel</SelectItem>
                    <SelectItem value="material_limpeza">Material de Limpeza</SelectItem>
                    <SelectItem value="evangelismo">Evangelismo</SelectItem>
                    <SelectItem value="missoes">Missões</SelectItem>
                    <SelectItem value="construcao">Construção</SelectItem>
                    <SelectItem value="equipamentos">Equipamentos</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="outras_despesas">Outras Despesas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filter-status" className="text-xs sm:text-sm">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger id="filter-status" className="text-xs sm:text-sm h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filter-cost-center" className="text-xs sm:text-sm">Centro de Custo</Label>
                <Select value={filterCostCenter} onValueChange={setFilterCostCenter}>
                  <SelectTrigger id="filter-cost-center" className="text-xs sm:text-sm h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {costCenters?.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id.toString()}>
                        {cc.name}
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
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {filteredExpenses.length} resultado(s)
                </p>
                <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2 text-xs sm:text-sm">
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                  Limpar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de Saídas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Lançamentos de Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredExpenses && filteredExpenses.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Centro de Custo</TableHead>
                      <TableHead>Status</TableHead>
                      {isTreasurer(user?.role) && <TableHead className="text-right">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          {new Date(expense.expenseDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                        </TableCell>
                        <TableCell className="capitalize">
                          {expense.category.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>{expense.supplier || "-"}</TableCell>
                        <TableCell className="font-semibold">
                          R$ {parseFloat(expense.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>{expense.costCenterId ? "CC ID: " + expense.costCenterId : "-"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(expense.paymentStatus)}>
                            {expense.paymentStatus === "pago" && "Pago"}
                            {expense.paymentStatus === "pendente" && "Pendente"}
                            {expense.paymentStatus === "cancelado" && "Cancelado"}
                          </Badge>
                        </TableCell>
                        {isTreasurer(user?.role) && (
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setEditingExpense(expense)}>
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
                Nenhuma despesa registrada
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={editingExpense !== null} onOpenChange={(isOpen) => !isOpen && setEditingExpense(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Despesa</DialogTitle>
            </DialogHeader>
            {editingExpense && (
              <ExpenseForm expense={editingExpense} onSuccess={() => setEditingExpense(null)} />
            )}
          </DialogContent>
        </Dialog>

        {isTreasurer(user?.role) && (
          <RecurringExpensesDialog
            open={recurringDialogOpen}
            onOpenChange={setRecurringDialogOpen}
            month={currentMonth}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
