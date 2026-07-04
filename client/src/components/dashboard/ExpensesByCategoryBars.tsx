import type { ExpenseShareItem } from "@/lib/dashboardMath";

interface ExpensesByCategoryBarsProps {
  items: ExpenseShareItem[];
  totalExpenses: number;
  totalPct: number;
  colors: string[];
  formatValue: (n: number) => string;
}

export function ExpensesByCategoryBars({
  items,
  totalExpenses,
  totalPct,
  colors,
  formatValue,
}: ExpensesByCategoryBarsProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        Nenhum dado disponível
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.name}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="capitalize">{item.name.toLowerCase()}</span>
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{formatValue(item.value)}</span>
              {" · "}
              {item.pct.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(item.pct, 100)}%`,
                backgroundColor: colors[index % colors.length],
              }}
            />
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between text-xs pt-2 mt-1 border-t">
        <span className="text-muted-foreground">Total de saídas</span>
        <span>
          <span className="font-semibold text-red-600 dark:text-red-400">{formatValue(totalExpenses)}</span>
          {" · "}
          {totalPct.toFixed(1)}% das entradas
        </span>
      </div>
    </div>
  );
}
