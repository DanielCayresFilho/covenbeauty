import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarDays,
  Receipt,
  Users,
  Package,
  Scissors,
  Wallet,
  Bell,
  Settings,
  MoreHorizontal,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  to: string;
  ready: boolean;
}

const PRIMARY: NavItem[] = [
  { label: "Início", icon: LayoutDashboard, to: "/menu", ready: true },
  { label: "Agenda", icon: CalendarDays, to: "/menu/agenda", ready: true },
  { label: "Comandas", icon: Receipt, to: "/menu/comandas", ready: true },
  { label: "Clientes", icon: Users, to: "/menu/clientes", ready: true },
];

const SECONDARY: NavItem[] = [
  { label: "Produtos", icon: Package, to: "/menu/produtos", ready: true },
  { label: "Procedimentos", icon: Scissors, to: "/menu/procedimentos", ready: true },
  { label: "Financeiro", icon: Wallet, to: "/menu/financeiro", ready: true },
  { label: "Lembretes", icon: Bell, to: "/menu/lembretes", ready: true },
  { label: "Configurações", icon: Settings, to: "/menu/config", ready: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) void navigate({ to: "/menu/login" });
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background text-parchment">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur">
        <img src="/marca.png" alt="Coven Beauty" className="h-7 w-auto" />
        <button
          type="button"
          onClick={() => {
            void logout();
            void navigate({ to: "/menu/login" });
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-parchment"
        >
          <span className="hidden sm:inline">{user?.fullName?.split(" ")[0]}</span>
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <div className="md:flex">
        {/* Rail (iPad / desktop): mostra tudo */}
        <nav className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 flex-col gap-1 border-r border-border p-3 md:flex">
          {PRIMARY.map((i) => (
            <NavLink key={i.to} item={i} pathname={pathname} variant="rail" />
          ))}
          <div className="my-2 border-t border-border" />
          {SECONDARY.map((i) => (
            <NavLink key={i.to} item={i} pathname={pathname} variant="rail" />
          ))}
        </nav>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 pb-24 md:pb-10">
          {children}
        </main>
      </div>

      {/* Bottom-tab (mobile): principais + "Mais" */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur md:hidden">
        {PRIMARY.map((i) => (
          <NavLink key={i.to} item={i} pathname={pathname} variant="tab" />
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-2.5 text-[0.65rem]",
            SECONDARY.some((i) => pathname === i.to)
              ? "text-blood"
              : "text-muted-foreground",
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>Mais</span>
        </button>
      </nav>

      {/* Gaveta "Mais" */}
      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Mais</DrawerTitle>
          </DrawerHeader>
          <div className="grid gap-1 px-4 pb-8">
            {SECONDARY.map((i) => (
              <NavLink
                key={i.to}
                item={i}
                pathname={pathname}
                variant="rail"
                onNavigate={() => setMoreOpen(false)}
              />
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function NavLink({
  item,
  pathname,
  variant,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  variant: "tab" | "rail";
  onNavigate?: () => void;
}) {
  const active = pathname === item.to;
  const Icon = item.icon;

  const cls =
    variant === "tab"
      ? cn(
          "flex flex-col items-center justify-center gap-1 py-2.5 text-[0.65rem]",
          active ? "text-blood" : "text-muted-foreground",
        )
      : cn(
          "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
          active
            ? "bg-secondary text-parchment"
            : "text-muted-foreground hover:bg-secondary/50 hover:text-parchment",
        );

  const content = (
    <>
      <Icon className={variant === "tab" ? "h-5 w-5" : "h-4 w-4"} />
      <span>{item.label}</span>
    </>
  );

  if (!item.ready) {
    return (
      <button
        type="button"
        onClick={() => toast.info(`${item.label} — em breve`)}
        className={cn(cls, "opacity-70")}
      >
        {content}
      </button>
    );
  }

  return (
    <Link to={item.to} className={cls} onClick={onNavigate}>
      {content}
    </Link>
  );
}
