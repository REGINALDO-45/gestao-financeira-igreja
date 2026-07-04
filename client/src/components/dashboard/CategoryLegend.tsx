interface CategoryLegendItem {
  name: string;
  value: number;
  color: string;
}

interface CategoryLegendProps {
  items: CategoryLegendItem[];
  formatValue: (n: number) => string;
}

export function CategoryLegend({ items, formatValue }: CategoryLegendProps) {
  if (items.length === 0) {
    return <div className="text-center py-6 text-sm text-muted-foreground">Nenhum dado disponível</div>;
  }

  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.name} className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 min-w-0">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="capitalize text-muted-foreground truncate">{item.name.toLowerCase()}</span>
          </span>
          <span className="font-medium shrink-0">{formatValue(item.value)}</span>
        </li>
      ))}
    </ul>
  );
}
