import { useState } from "react";
import { useLocation } from "wouter";
import {
  Home,
  ListChecks,
  Plus,
  FileText,
  Menu,
  Users,
  Banknote,
  Target,
  Receipt,
  Settings,
  LogOut,
} from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";

interface BottomNavProps {
  onSelectEntry: () => void;
  onSelectExpense: () => void;
}

const TABS = [
  { icon: Home, label: "Início", path: "/dashboard" },
  { icon: ListChecks, label: "Lançamentos", path: "/entries" },
] as const;

const MORE_LINKS = [
  { icon: Users, label: "Membros", path: "/members" },
  { icon: Banknote, label: "Centros de Custo", path: "/cost-centers" },
  { icon: Target, label: "Orçamento Anual", path: "/annual-budget" },
  { icon: FileText, label: "Relatórios", path: "/reports" },
  { icon: Receipt, label: "Recibos", path: "/receipts" },
  { icon: Settings, label: "Configurações", path: "/settings" },
] as const;

export function BottomNav({ onSelectEntry, onSelectExpense }: BottomNavProps) {
  const [location, setLocation] = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { logout } = useAuth();

  const renderTab = (tab: { icon: typeof Home; label: string; path: string }) => {
    const isActive = location === tab.path;
    const Icon = tab.icon;
    return (
      <button
        key={tab.path}
        type="button"
        onClick={() => setLocation(tab.path)}
        className={`flex flex-col items-center gap-1 px-3 py-1.5 text-[10px] ${
          isActive ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <Icon className="h-5 w-5" />
        {tab.label}
      </button>
    );
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:backdrop-blur">
        {TABS.map(renderTab)}
        <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
          <Button
            type="button"
            size="icon"
            className="-mt-6 h-12 w-12 rounded-full shadow-lg"
            onClick={() => setSheetOpen(true)}
            id="mobile-fab"
          >
            <Plus className="h-6 w-6" />
          </Button>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Novo lançamento</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-2 px-4 pb-6">
              <DrawerClose asChild>
                <Button
                  className="justify-start bg-emerald-600 hover:bg-emerald-700"
                  onClick={onSelectEntry}
                >
                  Nova Entrada
                </Button>
              </DrawerClose>
              <DrawerClose asChild>
                <Button
                  className="justify-start bg-red-600 hover:bg-red-700"
                  onClick={onSelectExpense}
                >
                  Nova Saída
                </Button>
              </DrawerClose>
            </div>
          </DrawerContent>
        </Drawer>
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 text-[10px] ${
            moreOpen ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Menu className="h-5 w-5" />
          Mais
        </button>
      </nav>
      <div className="h-16" aria-hidden="true" />

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Mais opções</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-1 px-4 pb-6">
            {MORE_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <DrawerClose asChild key={link.path}>
                  <button
                    type="button"
                    onClick={() => setLocation(link.path)}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-muted"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {link.label}
                  </button>
                </DrawerClose>
              );
            })}
            <DrawerClose asChild>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
