interface MobileBalanceCardProps {
  balance: number;
  totalEntries: number;
  totalExpenses: number;
  formatValue: (n: number) => string;
}

export function MobileBalanceCard({ balance, totalEntries, totalExpenses, formatValue }: MobileBalanceCardProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[color:var(--sidebar-primary)] to-[color:var(--accent)] p-4 text-white">
      <div className="text-xs opacity-80">Saldo em caixa</div>
      <div className="mt-0.5 text-2xl font-bold">{formatValue(balance)}</div>
      <div className="mt-3 flex gap-2">
        <div className="flex-1 rounded-xl bg-white/15 p-2.5">
          <div className="text-[10px] opacity-85">↓ Entradas</div>
          <div className="text-sm font-semibold">{formatValue(totalEntries)}</div>
        </div>
        <div className="flex-1 rounded-xl bg-white/15 p-2.5">
          <div className="text-[10px] opacity-85">↑ Saídas</div>
          <div className="text-sm font-semibold">{formatValue(totalExpenses)}</div>
        </div>
      </div>
    </div>
  );
}
