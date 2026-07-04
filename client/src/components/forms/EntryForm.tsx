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
import { useEntryFormState } from "./useEntryFormState";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Entry = RouterOutputs["entries"]["list"][number];

interface EntryFormProps {
  entry?: Entry;
  onSuccess?: () => void;
}

export function EntryForm({ entry, onSuccess }: EntryFormProps) {
  const { isEditing, formData, setFormData, members, costCenters, onSubmit } = useEntryFormState({
    entry,
    onSuccess,
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="entryDate">Data</Label>
        <Input
          id="entryDate"
          type="date"
          value={formData.entryDate}
          onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
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
        <Label htmlFor="memberId">Membro (Opcional)</Label>
        <Select
          value={formData.memberId || "none"}
          onValueChange={(value) => setFormData({ ...formData, memberId: value })}
        >
          <SelectTrigger>
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
        <Label htmlFor="cultoSunday">Culto/Domingo</Label>
        <Input
          id="cultoSunday"
          placeholder="Ex: Domingo, 26 de Maio"
          value={formData.cultoSunday}
          onChange={(e) => setFormData({ ...formData, cultoSunday: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="costCenterId">Ministério / Centro de Custo (Opcional)</Label>
        <Select
          value={formData.costCenterId || "none"}
          onValueChange={(value) => setFormData({ ...formData, costCenterId: value })}
        >
          <SelectTrigger>
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
        {isEditing ? "Salvar Alterações" : "Registrar Entrada"}
      </Button>
    </form>
  );
}
