import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Pencil, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthGuard, isTreasurer } from "@/hooks/useAuthGuard";
import type { Goal } from "@shared/types";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const STATUS_LABELS: Record<string, string> = {
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  em_andamento: "bg-primary/10 text-primary",
  concluida: "bg-green-100 text-green-800",
  cancelada: "bg-muted text-muted-foreground",
};

type FormState = {
  title: string;
  description: string;
  targetAmount: string;
  deadline: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  targetAmount: "",
  deadline: "",
};

type ContributionFormState = {
  amount: string;
  date: string;
  description: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const EMPTY_CONTRIBUTION_FORM: ContributionFormState = {
  amount: "",
  date: todayISO(),
  description: "",
};

export default function Goals() {
  const { user } = useAuthGuard();
  const canManage = isTreasurer(user?.role);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);

  const [editOpen, setEditOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);

  const [contributionOpen, setContributionOpen] = useState(false);
  const [contributionGoal, setContributionGoal] = useState<Goal | null>(null);
  const [contributionForm, setContributionForm] = useState<ContributionFormState>(
    EMPTY_CONTRIBUTION_FORM
  );

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsGoal, setDetailsGoal] = useState<Goal | null>(null);

  const { data: goals, isLoading } = trpc.goals.list.useQuery();
  const { data: contributions, isLoading: isLoadingContributions } =
    trpc.goals.contributions.list.useQuery(
      { goalId: detailsGoal?.id ?? 0 },
      { enabled: !!detailsGoal }
    );

  const utils = trpc.useUtils();
  const createGoal = trpc.goals.create.useMutation();
  const updateGoal = trpc.goals.update.useMutation();
  const deleteGoal = trpc.goals.delete.useMutation();
  const createContribution = trpc.goals.contributions.create.useMutation();

  const invalidateGoals = () => utils.goals.list.invalidate();
  const invalidateContributions = (goalId: number) =>
    utils.goals.contributions.list.invalidate({ goalId });

  const validateForm = (form: FormState) => {
    if (!form.title.trim()) {
      toast.error("Título da meta é obrigatório");
      return false;
    }
    const target = parseFloat(form.targetAmount);
    if (!form.targetAmount || isNaN(target) || target <= 0) {
      toast.error("Valor alvo deve ser maior que zero");
      return false;
    }
    return true;
  };

  const onCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(createForm)) return;

    try {
      await createGoal.mutateAsync({
        title: createForm.title,
        description: createForm.description || undefined,
        targetAmount: createForm.targetAmount,
        deadline: createForm.deadline ? new Date(createForm.deadline) : undefined,
      });
      toast.success("Meta criada com sucesso!");
      setCreateForm(EMPTY_FORM);
      setCreateOpen(false);
      invalidateGoals();
    } catch {
      toast.error("Erro ao criar meta");
    }
  };

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setEditForm({
      title: goal.title,
      description: goal.description ?? "",
      targetAmount: goal.targetAmount,
      deadline: goal.deadline ? new Date(goal.deadline).toISOString().slice(0, 10) : "",
    });
    setEditOpen(true);
  };

  const onEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal || !validateForm(editForm)) return;

    try {
      await updateGoal.mutateAsync({
        id: editingGoal.id,
        title: editForm.title,
        description: editForm.description || undefined,
        targetAmount: editForm.targetAmount,
        deadline: editForm.deadline ? new Date(editForm.deadline) : undefined,
      });
      toast.success("Meta atualizada com sucesso!");
      setEditOpen(false);
      setEditingGoal(null);
      invalidateGoals();
    } catch {
      toast.error("Erro ao atualizar meta");
    }
  };

  const onDelete = async () => {
    if (!editingGoal) return;
    try {
      await deleteGoal.mutateAsync({ id: editingGoal.id });
      toast.success("Meta excluída com sucesso!");
      setEditOpen(false);
      setEditingGoal(null);
      invalidateGoals();
    } catch {
      toast.error("Erro ao excluir meta");
    }
  };

  const toggleStatus = async (goal: Goal) => {
    const nextStatus = goal.status === "concluida" ? "em_andamento" : "concluida";
    try {
      await updateGoal.mutateAsync({ id: goal.id, status: nextStatus });
      toast.success(
        nextStatus === "concluida" ? "Meta marcada como concluída!" : "Meta reaberta"
      );
      invalidateGoals();
    } catch {
      toast.error("Erro ao atualizar status da meta");
    }
  };

  const openAddContribution = (goal: Goal) => {
    setContributionGoal(goal);
    setContributionForm(EMPTY_CONTRIBUTION_FORM);
    setContributionOpen(true);
  };

  const onContributionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributionGoal) return;

    const amount = parseFloat(contributionForm.amount);
    if (!contributionForm.amount || isNaN(amount) || amount <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }
    if (!contributionForm.date) {
      toast.error("Data é obrigatória");
      return;
    }

    try {
      await createContribution.mutateAsync({
        goalId: contributionGoal.id,
        amount: contributionForm.amount,
        contributionDate: new Date(contributionForm.date),
        description: contributionForm.description || undefined,
      });
      toast.success("Aporte registrado com sucesso!");
      setContributionOpen(false);
      setContributionForm(EMPTY_CONTRIBUTION_FORM);
      invalidateGoals();
      invalidateContributions(contributionGoal.id);
    } catch {
      toast.error("Erro ao registrar aporte");
    }
  };

  const openDetails = (goal: Goal) => {
    setDetailsGoal(goal);
    setDetailsOpen(true);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin w-8 h-8" />
        </div>
      </DashboardLayout>
    );
  }

  const emAndamento = (goals ?? []).filter((g) => g.status === "em_andamento");
  const concluidas = (goals ?? []).filter((g) => g.status === "concluida");
  const canceladas = (goals ?? []).filter((g) => g.status === "cancelada");

  const renderForm = (
    form: FormState,
    setForm: (f: FormState) => void,
    onSubmit: (e: React.FormEvent) => void,
    submitLabel: string,
    isPending: boolean,
    onDeleteClick?: () => void
  ) => (
    <form onSubmit={onSubmit} className="space-y-4 pt-2">
      <div>
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          placeholder="Ex: Reforma do Salão Principal"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          placeholder="Descreva o projeto ou campanha"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="targetAmount">Valor Alvo (R$) *</Label>
        <Input
          id="targetAmount"
          type="number"
          step="0.01"
          min="0"
          value={form.targetAmount}
          onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="deadline">Prazo</Label>
        <Input
          id="deadline"
          type="date"
          value={form.deadline}
          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
        {onDeleteClick && (
          <Button type="button" variant="destructive" size="icon" onClick={onDeleteClick}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </form>
  );

  const renderGoalCard = (goal: Goal) => {
    const target = parseFloat(goal.targetAmount);
    const current = parseFloat(goal.currentAmount);
    const pct = target > 0 ? (current / target) * 100 : 0;

    return (
      <Card
        key={goal.id}
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => openDetails(goal)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg truncate">{goal.title}</CardTitle>
              {goal.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {goal.description}
                </p>
              )}
            </div>
            {canManage && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(goal);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStatus(goal);
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold">{currencyFormatter.format(current)}</span>
            <span className="text-sm text-muted-foreground">
              de {currencyFormatter.format(target)}
            </span>
          </div>
          <Progress value={Math.min(pct, 100)} />
          <div className="flex items-center justify-between text-xs">
            <span className="text-primary font-medium">{pct.toFixed(0)}% Concluído</span>
            <span className="text-muted-foreground">
              {goal.deadline
                ? `Prazo: ${new Date(goal.deadline).toLocaleDateString("pt-BR")}`
                : "Sem prazo definido"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Badge className={STATUS_BADGE_CLASS[goal.status]}>
              {STATUS_LABELS[goal.status]}
            </Badge>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openAddContribution(goal);
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                R$
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const sections = [
    { key: "em_andamento", label: "Em Andamento", items: emAndamento },
    { key: "concluida", label: "Concluídas", items: concluidas },
    { key: "cancelada", label: "Canceladas", items: canceladas },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Metas</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe projetos e campanhas financeiras
            </p>
          </div>
          {canManage && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button id="new-goal-btn">
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Criar Meta</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Criar Nova Meta</DialogTitle>
                </DialogHeader>
                {renderForm(
                  createForm,
                  setCreateForm,
                  onCreateSubmit,
                  "Criar Meta",
                  createGoal.isPending
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>

        {!goals || goals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma meta cadastrada
            </CardContent>
          </Card>
        ) : (
          sections
            .filter((section) => section.items.length > 0)
            .map((section) => (
              <div key={section.key} className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  {section.label}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.items.map(renderGoalCard)}
                </div>
              </div>
            ))
        )}

        {/* Dialog de edição */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Meta</DialogTitle>
            </DialogHeader>
            {renderForm(
              editForm,
              setEditForm,
              onEditSubmit,
              "Salvar Alterações",
              updateGoal.isPending,
              onDelete
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de novo aporte */}
        <Dialog open={contributionOpen} onOpenChange={setContributionOpen}>
          <DialogContent className="w-[95vw] sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Registrar Aporte{contributionGoal ? ` — ${contributionGoal.title}` : ""}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onContributionSubmit} className="space-y-4 pt-2">
              <div>
                <Label htmlFor="contribAmount">Valor (R$) *</Label>
                <Input
                  id="contribAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={contributionForm.amount}
                  onChange={(e) =>
                    setContributionForm({ ...contributionForm, amount: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="contribDate">Data *</Label>
                <Input
                  id="contribDate"
                  type="date"
                  value={contributionForm.date}
                  onChange={(e) =>
                    setContributionForm({ ...contributionForm, date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="contribDescription">Descrição</Label>
                <Textarea
                  id="contribDescription"
                  placeholder="Ex: Doação da campanha de Páscoa"
                  value={contributionForm.description}
                  onChange={(e) =>
                    setContributionForm({ ...contributionForm, description: e.target.value })
                  }
                />
              </div>
              <Button type="submit" className="w-full" disabled={createContribution.isPending}>
                {createContribution.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Registrar Aporte
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de detalhes / histórico */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{detailsGoal?.title}</DialogTitle>
            </DialogHeader>
            {detailsGoal && (
              <div className="space-y-4">
                {detailsGoal.description && (
                  <p className="text-sm text-muted-foreground">{detailsGoal.description}</p>
                )}
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold">
                      {currencyFormatter.format(parseFloat(detailsGoal.currentAmount))}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      de {currencyFormatter.format(parseFloat(detailsGoal.targetAmount))}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      (parseFloat(detailsGoal.currentAmount) /
                        parseFloat(detailsGoal.targetAmount)) *
                        100,
                      100
                    )}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">Histórico de Aportes</h3>
                  {isLoadingContributions ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : contributions && contributions.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {contributions.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-start justify-between gap-2 rounded-lg border p-2.5 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">
                              {new Date(c.contributionDate).toLocaleDateString("pt-BR")}
                            </p>
                            {c.description && <p className="truncate">{c.description}</p>}
                          </div>
                          <span className="font-semibold shrink-0">
                            {currencyFormatter.format(parseFloat(c.amount))}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum aporte registrado ainda
                    </p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
