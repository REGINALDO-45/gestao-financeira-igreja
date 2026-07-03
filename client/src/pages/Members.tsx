import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Loader2, Plus, History, Phone, Mail, CheckCircle2, XCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/useMobile";
import { MemberForm } from "@/components/forms/MemberForm";
import { MemberHistory } from "@/components/MemberHistory";

const STATUS_STYLES: Record<string, string> = {
  regular: "bg-green-100 text-green-800",
  atrasado: "bg-yellow-100 text-yellow-800",
  inativo: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  regular: "Regular",
  atrasado: "Atrasado",
  inativo: "Inativo",
};

export default function Members() {
  const [open, setOpen] = useState(false);
  const [historyMemberId, setHistoryMemberId] = useState<number | null>(null);
  const isMobile = useIsMobile();

  const { data: members, isLoading } = trpc.members.list.useQuery();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin w-8 h-8" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Membros</h1>
            <p className="text-sm text-muted-foreground">Gestão de membros da comunidade</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size={isMobile ? "sm" : "default"} id="new-member-btn">
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Novo Membro</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Membro</DialogTitle>
              </DialogHeader>
              <MemberForm onSuccess={() => setOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={!!historyMemberId} onOpenChange={(val) => !val && setHistoryMemberId(null)}>
            <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Histórico de Contribuições</DialogTitle>
              </DialogHeader>
              {historyMemberId && <MemberHistory memberId={historyMemberId} />}
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Lista de Membros</CardTitle>
          </CardHeader>
          <CardContent>
            {members && members.length > 0 ? (
              <>
                {/* Mobile: card list */}
                <div className="flex flex-col gap-3 sm:hidden">
                  {members.map((member) => (
                    <div key={member.id} className="rounded-lg border bg-card p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm leading-tight">{member.name}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge className={`text-xs ${STATUS_STYLES[member.status] || ""}`}>
                              {STATUS_LABELS[member.status] || member.status}
                            </Badge>
                            {member.isActiveTithePayer ? (
                              <Badge className="bg-blue-100 text-blue-800 text-xs gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Dizimista
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-500 text-xs gap-1">
                                <XCircle className="w-3 h-3" />
                                Não dizimista
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 h-8 px-2"
                          onClick={() => setHistoryMemberId(member.id)}
                          id={`history-btn-${member.id}`}
                        >
                          <History className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-col gap-1">
                        {member.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span>{member.phone}</span>
                          </div>
                        )}
                        {member.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{member.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: standard table */}
                <div className="hidden sm:block overflow-x-auto">
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
                            <Badge className={STATUS_STYLES[member.status] || ""}>
                              {STATUS_LABELS[member.status] || member.status}
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setHistoryMemberId(member.id)}
                              id={`history-btn-desktop-${member.id}`}
                            >
                              <History className="w-4 h-4 mr-2" />
                              Histórico
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhum membro cadastrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
