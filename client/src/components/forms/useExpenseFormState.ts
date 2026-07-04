import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Expense = RouterOutputs["expenses"]["list"][number];

interface UseExpenseFormStateOptions {
  expense?: Expense;
  onSuccess?: () => void;
}

const toDateInputValue = (date: Date | string) =>
  new Date(date).toISOString().split("T")[0];

export function useExpenseFormState({ expense, onSuccess }: UseExpenseFormStateOptions) {
  const isEditing = Boolean(expense);
  const { data: costCenters } = trpc.costCenters.list.useQuery();
  const createExpense = trpc.expenses.create.useMutation();
  const updateExpense = trpc.expenses.update.useMutation();
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState({
    expenseDate: expense ? toDateInputValue(expense.expenseDate) : new Date().toISOString().split("T")[0],
    category: expense?.category ?? "agua",
    amount: expense?.amount ?? "",
    paymentMethod: expense?.paymentMethod ?? "pix",
    paymentStatus: expense?.paymentStatus ?? "pendente",
    supplier: expense?.supplier ?? "",
    costCenterId: expense?.costCenterId ? expense.costCenterId.toString() : "",
    description: expense?.description ?? "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        expenseDate: new Date(formData.expenseDate),
        category: formData.category as any,
        paymentMethod: formData.paymentMethod as any,
        paymentStatus: formData.paymentStatus as any,
      };

      if (isEditing && expense) {
        await updateExpense.mutateAsync({
          id: expense.id,
          ...payload,
          costCenterId: formData.costCenterId && formData.costCenterId !== "none" ? parseInt(formData.costCenterId) : null,
        });
        toast.success("Despesa atualizada com sucesso!");
      } else {
        await createExpense.mutateAsync({
          ...payload,
          costCenterId: formData.costCenterId && formData.costCenterId !== "none" ? parseInt(formData.costCenterId) : undefined,
        });
        toast.success("Despesa registrada com sucesso!");

        setFormData({
          expenseDate: new Date().toISOString().split("T")[0],
          category: "agua",
          amount: "",
          paymentMethod: "pix",
          paymentStatus: "pendente",
          supplier: "",
          costCenterId: "",
          description: "",
        });
      }

      // Invalidate list
      utils.expenses.list.invalidate();

      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(isEditing ? "Erro ao atualizar despesa" : "Erro ao registrar despesa");
    }
  };

  return { isEditing, formData, setFormData, costCenters, onSubmit };
}
