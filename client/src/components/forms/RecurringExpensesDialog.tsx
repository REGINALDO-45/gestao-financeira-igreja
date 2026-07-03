import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface RecurringExpensesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string; // "YYYY-MM"
}

const monthLabel = (month: string) => {
  const [year, mo] = month.split("-").map(Number);
  const d = new Date(year, mo - 1, 1);
  const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export function RecurringExpensesDialog({ open, onOpenChange, month }: RecurringExpensesDialogProps) {
  const { data: templates, isLoading } = trpc.recurringExpenses.listActive.useQuery(undefined, { enabled: open });
  const createExpense = trpc.expenses.create.useMutation();
  const markPrompted = trpc.churchSettings.markRecurringExpensesPrompted.useMutation();
  const utils = trpc.useUtils();

  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    if (templates) {
      setSelected(Object.fromEntries(templates.map((t) => [t.id, true])));
      setAmounts(Object.fromEntries(templates.map((t) => [t.id, t.amount])));
    }
  }, [templates]);

  const dismiss = async (launched: boolean) => {
    try {
      await markPrompted.mutateAsync({ month });
    } finally {
      onOpenChange(false);
      if (launched) toast.success("Despesas recorrentes lançadas com sucesso!");
    }
  };

  const handleLaunch = async () => {
    if (!templates) return;
    const toLaunch = templates.filter((t) => selected[t.id]);
    if (toLaunch.length === 0) {
      await dismiss(false);
      return;
    }

    setIsLaunching(true);
    try {
      const [year, mo] = month.split("-").map(Number);
      const expenseDate = new Date(year, mo - 1, 1);

      for (const t of toLaunch) {
        await createExpense.mutateAsync({
          expenseDate,
          category: t.category as any,
          amount: amounts[t.id] ?? t.amount,
          paymentMethod: t.paymentMethod as any,
          paymentStatus: "pendente",
          description: t.description,
        });
      }

      utils.expenses.list.invalidate();
      await dismiss(true);
    } catch {
      toast.error("Erro ao lançar despesas recorrentes");
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismiss(false)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Despesas recorrentes de {monthLabel(month)}</DialogTitle>
          <DialogDescription>
            Estas são as despesas que normalmente se repetem todo mês. Confira os valores e lance de uma vez o que já estiver certo — o resto você ajusta depois.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-1.5 border-b last:border-0">
                <Checkbox
                  checked={selected[t.id] ?? false}
                  onCheckedChange={(v) => setSelected((s) => ({ ...s, [t.id]: Boolean(v) }))}
                />
                <span className="flex-1 text-sm">{t.description}</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    className="w-24 h-8"
                    value={amounts[t.id] ?? ""}
                    onChange={(e) => setAmounts((a) => ({ ...a, [t.id]: e.target.value }))}
                    disabled={!selected[t.id]}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            Nenhuma despesa recorrente cadastrada ainda.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => dismiss(false)} disabled={isLaunching}>
            Agora não
          </Button>
          <Button onClick={handleLaunch} disabled={isLaunching || isLoading}>
            {isLaunching && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Lançar selecionadas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
