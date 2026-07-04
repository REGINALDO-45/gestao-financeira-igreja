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
import { useExpenseFormState } from "./useExpenseFormState";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Expense = RouterOutputs["expenses"]["list"][number];

interface ExpenseFormProps {
  expense?: Expense;
  onSuccess?: () => void;
}

export function ExpenseForm({ expense, onSuccess }: ExpenseFormProps) {
  const { isEditing, formData, setFormData, costCenters, onSubmit } = useExpenseFormState({
    expense,
    onSuccess,
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="expenseDate">Data</Label>
        <Input
          id="expenseDate"
          type="date"
          value={formData.expenseDate}
          onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="category">Categoria</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => setFormData({ ...formData, category: value as any })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a categoria" />
          </SelectTrigger>
          <SelectContent>
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
        <Label htmlFor="amount">Valor (R$)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
        <Select
          value={formData.paymentMethod}
          onValueChange={(value) => setFormData({ ...formData, paymentMethod: value as any })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a forma de pagamento" />
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

      <div>
        <Label htmlFor="paymentStatus">Status de Pagamento</Label>
        <Select
          value={formData.paymentStatus}
          onValueChange={(value) => setFormData({ ...formData, paymentStatus: value as any })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="supplier">Fornecedor</Label>
        <Input
          id="supplier"
          placeholder="Nome do fornecedor"
          value={formData.supplier}
          onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="costCenterId">Centro de Custo (Opcional)</Label>
        <Select
          value={formData.costCenterId || "none"}
          onValueChange={(value) => setFormData({ ...formData, costCenterId: value })}
        >
          <SelectTrigger>
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

      <div>
        <Label htmlFor="description">Observações</Label>
        <Input
          id="description"
          placeholder="Observações adicionais"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <Button type="submit" className="w-full">
        {isEditing ? "Salvar Alterações" : "Registrar Despesa"}
      </Button>
    </form>
  );
}
