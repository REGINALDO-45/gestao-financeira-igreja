import { useState } from "react";
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
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface MemberFormProps {
  onSuccess?: () => void;
}

export function MemberForm({ onSuccess }: MemberFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    birthDate: "",
    baptismDate: "",
    status: "regular",
    isActiveTithePayer: false,
    observations: "",
  });

  const createMember = trpc.members.create.useMutation();
  const utils = trpc.useUtils();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Nome do membro é obrigatório");
      return;
    }

    try {
      await createMember.mutateAsync({
        ...formData,
        birthDate: formData.birthDate ? new Date(formData.birthDate) : undefined,
        baptismDate: formData.baptismDate ? new Date(formData.baptismDate) : undefined,
        status: formData.status as any,
      });
      toast.success("Membro cadastrado com sucesso!");
      
      setFormData({
        name: "",
        phone: "",
        email: "",
        address: "",
        birthDate: "",
        baptismDate: "",
        status: "regular",
        isActiveTithePayer: false,
        observations: "",
      });

      utils.members.list.invalidate();

      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Erro ao cadastrar membro");
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          placeholder="Nome completo"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="phone">Telefone</Label>
        <Input
          id="phone"
          placeholder="(11) 99999-9999"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="email@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="address">Endereço</Label>
        <Input
          id="address"
          placeholder="Rua, número, complemento"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="birthDate">Data de Nascimento</Label>
        <Input
          id="birthDate"
          type="date"
          value={formData.birthDate}
          onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="baptismDate">Data de Batismo</Label>
        <Input
          id="baptismDate"
          type="date"
          value={formData.baptismDate}
          onChange={(e) => setFormData({ ...formData, baptismDate: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="regular">Regular</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <input
          id="isActiveTithePayer"
          type="checkbox"
          checked={formData.isActiveTithePayer}
          onChange={(e) =>
            setFormData({ ...formData, isActiveTithePayer: e.target.checked })
          }
          className="w-4 h-4"
        />
        <Label htmlFor="isActiveTithePayer">Dizimista Ativo</Label>
      </div>

      <div>
        <Label htmlFor="observations">Observações</Label>
        <Input
          id="observations"
          placeholder="Observações adicionais"
          value={formData.observations}
          onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
        />
      </div>

      <Button type="submit" className="w-full">
        Cadastrar Membro
      </Button>
    </form>
  );
}
