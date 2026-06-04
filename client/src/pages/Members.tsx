import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Members() {
  const [open, setOpen] = useState(false);
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

  const { data: members, isLoading } = trpc.members.list.useQuery();
  const createMember = trpc.members.create.useMutation();

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
      setOpen(false);
    } catch (error) {
      toast.error("Erro ao cadastrar membro");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "regular":
        return "bg-green-100 text-green-800";
      case "atrasado":
        return "bg-yellow-100 text-yellow-800";
      case "inativo":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="animate-spin w-8 h-8" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Membros</h1>
            <p className="text-muted-foreground">Gestão de membros da comunidade</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Membro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Membro</DialogTitle>
              </DialogHeader>
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
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Membros</CardTitle>
          </CardHeader>
          <CardContent>
            {members && members.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dizimista</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>{member.phone || "-"}</TableCell>
                        <TableCell>{member.email || "-"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(member.status)}>
                            {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {member.isActiveTithePayer ? (
                            <Badge className="bg-blue-100 text-blue-800">Sim</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">Não</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum membro cadastrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
