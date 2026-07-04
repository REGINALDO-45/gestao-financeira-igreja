import {
  HandCoins,
  Gift,
  Star,
  Megaphone,
  Globe,
  HardHat,
  ShoppingBag,
  UtensilsCrossed,
  Coffee,
  HeartHandshake,
  CircleDollarSign,
  Droplet,
  Zap,
  Wifi,
  Home,
  SprayCan,
  BookOpen,
  Wrench,
  Settings2,
  Receipt,
  type LucideIcon,
} from "lucide-react";

const ENTRY_ICONS: Record<string, LucideIcon> = {
  dizimo: HandCoins,
  oferta: Gift,
  oferta_especial: Star,
  campanha: Megaphone,
  missoes: Globe,
  construcao: HardHat,
  bazar: ShoppingBag,
  almoco_beneficente: UtensilsCrossed,
  cantina: Coffee,
  doacao: HeartHandshake,
  outras_receitas: CircleDollarSign,
};

const EXPENSE_ICONS: Record<string, LucideIcon> = {
  agua: Droplet,
  energia: Zap,
  internet: Wifi,
  aluguel: Home,
  material_limpeza: SprayCan,
  evangelismo: BookOpen,
  missoes: Globe,
  construcao: HardHat,
  equipamentos: Wrench,
  manutencao: Settings2,
  outras_despesas: Receipt,
};

interface CategoryIconProps {
  category: string;
  type: "entrada" | "saida";
}

export function CategoryIcon({ category, type }: CategoryIconProps) {
  const Icon = (type === "entrada" ? ENTRY_ICONS[category] : EXPENSE_ICONS[category]) ?? CircleDollarSign;
  const color = type === "entrada" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
  const bg = type === "entrada" ? "bg-emerald-500/10" : "bg-red-500/10";

  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>
      <Icon className={`h-4 w-4 ${color}`} />
    </span>
  );
}
