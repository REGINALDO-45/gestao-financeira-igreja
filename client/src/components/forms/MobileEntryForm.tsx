import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEntryFormState } from "./useEntryFormState";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Entry = RouterOutputs["entries"]["list"][number];

interface MobileEntryFormProps {
  entry?: Entry;
  onSuccess?: () => void;
}

const CATEGORIES: { value: string; label: string }[] = [
  { value: "dizimo", label: "Dízimo" },
  { value: "oferta", label: "Oferta" },
  { value: "oferta_especial", label: "Oferta Especial" },
  { value: "campanha", label: "Campanha" },
  { value: "missoes", label: "Missões" },
  { value: "construcao", label: "Construção" },
  { value: "bazar", label: "Bazar" },
  { value: "almoco_beneficente", label: "Almoço Beneficente" },
  { value: "cantina", label: "Cantina" },
  { value: "doacao", label: "Doação" },
  { value: "outras_receitas", label: "Outras Receitas" },
];

export function MobileEntryForm({ entry, onSuccess }: MobileEntryFormProps) {
  const { isEditing, formData, setFormData, members, costCenters, onSubmit } = useEntryFormState({
    entry,
    onSuccess,
  });

  const decimalPart = (formData.amount.toString().split(".")[1] ?? "00").padEnd(2, "0").slice(0, 2);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="text-center">
        <Label htmlFor="amount" className="text-xs uppercase tracking-wide text-muted-foreground">
          Valor
        </Label>
        <div className="mt-1 flex items-baseline justify-center gap-1">
          <span className="text-2xl font-bold text-emerald-600">R$</span>
          <input
            id="amount"
            type="number"
            step="0.01"
            placeholder="0"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="w-40 border-none bg-transparent text-center text-5xl font-extrabold text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-xl font-semibold text-muted-foreground">,{decimalPart}</span>
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold">Categoria</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const isSelected = formData.category === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setFormData({ ...formData, category: cat.value as any })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label htmlFor="mobile-entry-description">Descrição</Label>
        <Input
          id="mobile-entry-description"
          placeholder="Ex: Dízimo mensal — João Silva"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="mobile-entryDate">Data</Label>
          <Input
            id="mobile-entryDate"
            type="date"
            value={formData.entryDate}
            onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="mobile-paymentMethod">Forma</Label>
          <Select
            value={formData.paymentMethod}
            onValueChange={(value) => setFormData({ ...formData, paymentMethod: value as any })}
          >
            <SelectTrigger id="mobile-paymentMethod">
              <SelectValue />
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
      </div>

      <div>
        <Label htmlFor="mobile-memberId">Membro (Opcional)</Label>
        <Select
          value={formData.memberId || "none"}
          onValueChange={(value) => setFormData({ ...formData, memberId: value })}
        >
          <SelectTrigger id="mobile-memberId">
            <SelectValue placeholder="Selecione um membro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Não associar</SelectItem>
            {members?.map((member) => (
              <SelectItem key={member.id} value={member.id.toString()}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="mobile-costCenterId">Ministério (Opcional)</Label>
        <Select
          value={formData.costCenterId || "none"}
          onValueChange={(value) => setFormData({ ...formData, costCenterId: value })}
        >
          <SelectTrigger id="mobile-costCenterId">
            <SelectValue placeholder="Caixa Geral (sem ministério específico)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Caixa Geral (sem ministério específico)</SelectItem>
            {costCenters?.map((cc) => (
              <SelectItem key={cc.id} value={cc.id.toString()}>
                {cc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-gradient-to-r from-[color:var(--sidebar-primary)] to-[color:var(--accent)] py-3 text-sm font-semibold text-white shadow-lg"
      >
        {isEditing ? "Salvar Alterações" : "Salvar lançamento"}
      </button>
    </form>
  );
}
