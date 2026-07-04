import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExpenseFormState } from "./useExpenseFormState";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Expense = RouterOutputs["expenses"]["list"][number];

interface MobileExpenseFormProps {
  expense?: Expense;
  onSuccess?: () => void;
}

const CATEGORIES: { value: string; label: string }[] = [
  { value: "agua", label: "Água" },
  { value: "energia", label: "Energia" },
  { value: "internet", label: "Internet" },
  { value: "aluguel", label: "Aluguel" },
  { value: "material_limpeza", label: "Material de Limpeza" },
  { value: "evangelismo", label: "Evangelismo" },
  { value: "missoes", label: "Missões" },
  { value: "construcao", label: "Construção" },
  { value: "equipamentos", label: "Equipamentos" },
  { value: "manutencao", label: "Manutenção" },
  { value: "outras_despesas", label: "Outras Despesas" },
];

export function MobileExpenseForm({ expense, onSuccess }: MobileExpenseFormProps) {
  const { isEditing, formData, setFormData, costCenters, onSubmit } = useExpenseFormState({
    expense,
    onSuccess,
  });

  const decimalPart = (formData.amount.toString().split(".")[1] ?? "00").padEnd(2, "0").slice(0, 2);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="text-center">
        <Label htmlFor="expense-amount" className="text-xs uppercase tracking-wide text-muted-foreground">
          Valor
        </Label>
        <div className="mt-1 flex items-baseline justify-center gap-1">
          <span className="text-2xl font-bold text-red-600">R$</span>
          <input
            id="expense-amount"
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
                    ? "border-red-600 bg-red-600 text-white"
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
        <Label htmlFor="mobile-expense-description">Descrição</Label>
        <Input
          id="mobile-expense-description"
          placeholder="Ex: Conta de energia"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="mobile-expenseDate">Data</Label>
          <Input
            id="mobile-expenseDate"
            type="date"
            value={formData.expenseDate}
            onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="mobile-expense-paymentMethod">Forma</Label>
          <Select
            value={formData.paymentMethod}
            onValueChange={(value) => setFormData({ ...formData, paymentMethod: value as any })}
          >
            <SelectTrigger id="mobile-expense-paymentMethod">
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
        <Label htmlFor="mobile-supplier">Fornecedor</Label>
        <Input
          id="mobile-supplier"
          placeholder="Nome do fornecedor"
          value={formData.supplier}
          onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="mobile-expense-costCenterId">Centro de Custo (Opcional)</Label>
        <Select
          value={formData.costCenterId || "none"}
          onValueChange={(value) => setFormData({ ...formData, costCenterId: value })}
        >
          <SelectTrigger id="mobile-expense-costCenterId">
            <SelectValue placeholder="Selecione um centro de custo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Não associar</SelectItem>
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
