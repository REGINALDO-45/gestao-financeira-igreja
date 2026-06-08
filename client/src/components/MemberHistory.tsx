import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface MemberHistoryProps {
  memberId: number;
}

export function MemberHistory({ memberId }: MemberHistoryProps) {
  const { data: entries, isLoading } = trpc.entries.listByMember.useQuery({ memberId });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma contribuição encontrada para este membro.
      </div>
    );
  }

  const totalAmount = entries.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-muted p-4 rounded-lg">
        <span className="font-medium text-sm text-muted-foreground">Total Contribuído:</span>
        <span className="text-xl font-bold">R$ {totalAmount.toFixed(2)}</span>
      </div>
      
      <div className="max-h-[60vh] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Forma Pag.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  {new Date(entry.entryDate).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="capitalize">
                  <Badge variant="outline">{entry.category.replace(/_/g, " ")}</Badge>
                </TableCell>
                <TableCell className="font-semibold text-green-600">
                  R$ {parseFloat(entry.amount).toFixed(2)}
                </TableCell>
                <TableCell className="capitalize">{entry.paymentMethod}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
