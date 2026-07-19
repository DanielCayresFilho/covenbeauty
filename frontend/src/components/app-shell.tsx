import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarDays,
  Receipt,
  Users,
  Scissors,
  Package,
  Wallet,
  Bell,
  Settings,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { getTheme, setTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  to: string;
}

const NAV: NavItem[] = [
  { label: "Início", icon: LayoutDashboard, to: "/menu" },
  { label: "Agenda", icon: CalendarDays, to: "/menu/agenda" },
  { label: "Comandas", icon: Receipt, to: "/menu/comandas" },
  { label: "Clientes", icon: Users, to: "/menu/clientes" },
  { label: "Procedimentos", icon: Scissors, to: "/menu/procedimentos" },
  { label: "Produtos", icon: Package, to: "/menu/produtos" },
  { label: "Financeiro", icon: Wallet, to: "/menu/financeiro" },
  { label: "Lembretes", icon: Bell, to: "/menu/lembretes" },
  { label: "Configurações", icon: Settings, to: "/menu/config" },
];

const COLLAPSE_KEY = "cb_sidebar_collapsed";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    if (!isAuthenticated) void navigate({ to: "/menu/login" });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    setThemeState(getTheme());
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  // Fecha a gaveta ao trocar de rota (mobile).
  useEffect(() => setMobileOpen(false), [pathname]);

  if (!isAuthenticated) return null;

  const toggleTheme = () => {
    const t: Theme = theme === "dark" ? "light" : "dark";
    setTheme(t);
    setThemeState(t);
  };
  const toggleCollapse = () => {
    setCollapsed((c) => {
      localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      return !c;
    });
  };
  const doLogout = () => {
    void logout();
    void navigate({ to: "/menu/login" });
  };

  return (
    <div className="crm-ui min-h-screen bg-background text-foreground">
      {/* Botão flutuante (mobile) para abrir a sidebar */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm md:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop (mobile) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-transform duration-200 md:transition-[width]",
          collapsed ? "md:w-[68px]" : "md:w-60",
          "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Topo: logo + colapsar */}
        <div className="flex h-16 items-center justify-between px-3">
          {!collapsed && (
            <img src="/marca.png" alt="Coven Beauty" className="h-9 w-auto" />
          )}
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground md:flex"
            aria-label="Recolher menu"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground md:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
          {NAV.map((item) => {
            const active =
              item.to === "/menu"
                ? pathname === "/menu"
                : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.95rem] font-medium transition-colors",
                  collapsed && "md:justify-center md:px-0",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={cn(collapsed && "md:hidden")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Rodapé: tema + usuário + sair */}
        <div className="space-y-1 border-t border-border p-2">
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[0.9rem] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              collapsed && "md:justify-center md:px-0",
            )}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 shrink-0" />
            ) : (
              <Moon className="h-5 w-5 shrink-0" />
            )}
            <span className={cn(collapsed && "md:hidden")}>
              {theme === "dark" ? "Tema claro" : "Tema escuro"}
            </span>
          </button>

          {!collapsed && user && (
            <p className="truncate px-3 pt-1 text-xs text-muted-foreground">
              {user.fullName}
            </p>
          )}

          <button
            type="button"
            onClick={doLogout}
            title="Sair"
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[0.9rem] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
              collapsed && "md:justify-center md:px-0",
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className={cn(collapsed && "md:hidden")}>Sair</span>
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <div
        className={cn(
          "min-h-screen transition-[padding] duration-200",
          collapsed ? "md:pl-[68px]" : "md:pl-60",
        )}
      >
        <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-16 md:px-6 md:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
