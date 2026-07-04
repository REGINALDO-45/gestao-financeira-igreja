import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  Users,
  DollarSign,
  TrendingDown,
  Settings,
  FileText,
  Receipt,
  ChurchIcon,
  Banknote,
  Target,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { BottomNav } from "./BottomNav";
import { FullScreenFormSheet } from "./FullScreenFormSheet";
import { EntryForm } from "./forms/EntryForm";
import { ExpenseForm } from "./forms/ExpenseForm";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: DollarSign, label: "Entradas", path: "/entries" },
  { icon: TrendingDown, label: "Saídas", path: "/expenses" },
  { icon: Users, label: "Membros", path: "/members" },
  { icon: Banknote, label: "Centros de Custo", path: "/cost-centers" },
  { icon: Target, label: "Orçamento Anual", path: "/annual-budget" },
  { icon: FileText, label: "Relatórios", path: "/reports" },
  { icon: Receipt, label: "Recibos", path: "/receipts" },
  { icon: Settings, label: "Configurações", path: "/settings" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="flex flex-col items-center gap-8 p-6 sm:p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <ChurchIcon className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-center">
              Entre para continuar
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              O acesso ao sistema financeiro requer autenticação.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Entrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": isMobile ? "80vw" : `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar, setOpen } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [mobileEntryOpen, setMobileEntryOpen] = useState(false);
  const [mobileExpenseOpen, setMobileExpenseOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find((item) => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft =
        sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const handleNavClick = (path: string) => {
    setLocation(path);
    // On mobile, close the sidebar after navigation
    if (isMobile) {
      setOpen(false);
    }
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        {!isMobile && (
        <Sidebar
          collapsible="icon"
          className="border-r-0 bg-sidebar text-sidebar-foreground"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-auto justify-center py-4 border-b border-sidebar-border">
            <div className="flex flex-col items-center gap-2 px-2 transition-all w-full">
              {(!isCollapsed || isMobile) && (
                <>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-sidebar-foreground tracking-tight">
                      IGREJA
                    </div>
                    <div className="text-xs font-semibold text-sidebar-foreground tracking-tight">
                      METODISTA
                    </div>
                    <div className="text-xs text-sidebar-foreground/70 mt-1">
                      Sistema Financeiro
                    </div>
                  </div>
                </>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => handleNavClick(item.path)}
                      tooltip={item.label}
                      className={`h-11 transition-all font-normal ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/20"
                      }`}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="text-sm">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <div className="flex flex-col gap-3">
              {(!isCollapsed || isMobile) && (
                <div className="text-center text-xs text-sidebar-foreground/70 italic px-2">
                  <p className="mb-1">"Tudo vem de ti, e é do teu recebemos."</p>
                  <p className="text-xs">1 Crônicas 29:14</p>
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-sidebar-accent/20 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
                    <Avatar className="h-9 w-9 border border-sidebar-foreground/20 shrink-0 bg-sidebar-accent/30">
                      <AvatarFallback className="text-xs font-medium text-sidebar-foreground">
                        {user?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                      <p className="text-sm font-medium truncate leading-none text-sidebar-foreground">
                        {user?.name || "-"}
                      </p>
                      <p className="text-xs text-sidebar-foreground/70 truncate mt-1.5">
                        {user?.role || "user"}
                      </p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarFooter>
        </Sidebar>
        )}

        {/* Desktop resize handle */}
        {!isMobile && (
          <div
            className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
            onMouseDown={() => {
              if (isCollapsed) return;
              setIsResizing(true);
            }}
            style={{ zIndex: 50 }}
          />
        )}
      </div>

      <SidebarInset>
        {/* Mobile top header bar */}
        <div className="flex border-b h-14 items-center justify-between bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <SidebarTrigger
              className="h-9 w-9 rounded-lg hover:bg-muted transition-colors"
              id="sidebar-trigger"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-tight text-foreground">
                {activeMenuItem?.label ?? "Sistema Financeiro"}
              </span>
              {!isMobile && (
                <span className="text-xs text-muted-foreground leading-tight">
                  Igreja Metodista
                </span>
              )}
            </div>
          </div>

          {/* Mobile: user avatar in header */}
          {isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5 border-b mb-1">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                </div>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <main className="flex-1 p-3 sm:p-4 md:p-6">{children}</main>
      </SidebarInset>

      {isMobile && (
        <>
          <BottomNav
            onSelectEntry={() => setMobileEntryOpen(true)}
            onSelectExpense={() => setMobileExpenseOpen(true)}
          />
          <FullScreenFormSheet open={mobileEntryOpen} onOpenChange={setMobileEntryOpen} title="Nova Entrada">
            <EntryForm onSuccess={() => setMobileEntryOpen(false)} />
          </FullScreenFormSheet>
          <FullScreenFormSheet open={mobileExpenseOpen} onOpenChange={setMobileExpenseOpen} title="Nova Saída">
            <ExpenseForm onSuccess={() => setMobileExpenseOpen(false)} />
          </FullScreenFormSheet>
        </>
      )}
    </>
  );
}
