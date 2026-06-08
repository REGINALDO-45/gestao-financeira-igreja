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
import { Loader2, Plus, History } from "lucide-react";
import { toast } from "sonner";
import { MemberForm } from "@/components/forms/MemberForm";
import { MemberHistory } from "@/components/MemberHistory";

export default function Members() {
  const [open, setOpen] = useState(false);
  const [historyMemberId, setHistoryMemberId] = useState<number | null>(null);

  const { data: members, isLoading } = trpc.members.list.useQuery();

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
              <MemberForm onSuccess={() => setOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={!!historyMemberId} onOpenChange={(val) => !val && setHistoryMemberId(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Histórico de Contribuições</DialogTitle>
              </DialogHeader>
              {historyMemberId && <MemberHistory memberId={historyMemberId} />}
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
                      <TableHead className="text-right">Ações</TableHead>
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
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setHistoryMemberId(member.id)}>
                            <History className="w-4 h-4 mr-2" />
                            Histórico
                          </Button>
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
