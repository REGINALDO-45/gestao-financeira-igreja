import { useLocation } from "wouter";
import type { Movement } from "@/lib/dashboardMath";

interface RecentMovementsProps {
  movements: Movement[];
  formatValue: (n: number) => string;
}

export function RecentMovements({ movements, formatValue }: RecentMovementsProps) {
  const [, setLocation] = useLocation();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">Movimentação recente</span>
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => setLocation("/entries")}
        >
          Ver todos
        </button>
      </div>
      {movements.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">Nenhuma movimentação recente</div>
      ) : (
        <div className="space-y-0.5">
          {movements.map((movement) => (
            <div
              key={movement.id}
              className="flex items-center justify-between py-2 text-sm border-b last:border-0"
            >
              <span className="capitalize text-muted-foreground truncate pr-2">{movement.description}</span>
              <span
                className={`font-semibold shrink-0 ${
                  movement.type === "entrada" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                }`}
              >
                {movement.type === "entrada" ? "+" : "−"}
                {formatValue(movement.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
