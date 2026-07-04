import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Entry = RouterOutputs["entries"]["list"][number];

interface UseEntryFormStateOptions {
  entry?: Entry;
  onSuccess?: () => void;
}

const toDateInputValue = (date: Date | string) =>
  new Date(date).toISOString().split("T")[0];

export function useEntryFormState({ entry, onSuccess }: UseEntryFormStateOptions) {
  const isEditing = Boolean(entry);
  const { data: members } = trpc.members.list.useQuery();
  const { data: costCenters } = trpc.costCenters.list.useQuery();
  const createEntry = trpc.entries.create.useMutation();
  const updateEntry = trpc.entries.update.useMutation();
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState({
    entryDate: entry ? toDateInputValue(entry.entryDate) : new Date().toISOString().split("T")[0],
    category: entry?.category ?? "dizimo",
    amount: entry?.amount ?? "",
    paymentMethod: entry?.paymentMethod ?? "pix",
    memberId: entry?.memberId ? entry.memberId.toString() : "",
    cultoSunday: entry?.cultoSunday ?? "",
    description: entry?.description ?? "",
    costCenterId: entry?.costCenterId ? entry.costCenterId.toString() : "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        entryDate: new Date(formData.entryDate),
        memberId: formData.memberId && formData.memberId !== "none" ? parseInt(formData.memberId) : undefined,
        category: formData.category as any,
        paymentMethod: formData.paymentMethod as any,
        costCenterId: formData.costCenterId && formData.costCenterId !== "none" ? parseInt(formData.costCenterId) : undefined,
      };

      if (isEditing && entry) {
        await updateEntry.mutateAsync({
          id: entry.id,
          ...payload,
          memberId: formData.memberId && formData.memberId !== "none" ? parseInt(formData.memberId) : null,
          costCenterId: formData.costCenterId && formData.costCenterId !== "none" ? parseInt(formData.costCenterId) : null,
        });
        toast.success("Entrada atualizada com sucesso!");
      } else {
        await createEntry.mutateAsync(payload);
        toast.success("Entrada registrada com sucesso!");

        setFormData({
          entryDate: new Date().toISOString().split("T")[0],
          category: "dizimo",
          amount: "",
          paymentMethod: "pix",
          memberId: "",
          cultoSunday: "",
          description: "",
          costCenterId: "",
        });
      }

      // Invalidate to refresh the list
      utils.entries.list.invalidate();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error(isEditing ? "Erro ao atualizar entrada" : "Erro ao registrar entrada");
    }
  };

  return { isEditing, formData, setFormData, members, costCenters, onSubmit };
}
