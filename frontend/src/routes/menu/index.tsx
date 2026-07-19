import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Users,
  CalendarCheck,
  RefreshCcw,
  Wallet,
  Clock,
  AlertTriangle,
  Cake,
  Check,
  UserPlus,
  CalendarDays,
  Receipt,
  Scissors,
  Package,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/menu/")({
  component: DashboardPage,
});

// ── Tipos das respostas do backend ──
interface Summary {
  newClients: number;
  totalAppointments: number;
  completedAppointments: number;
  returns: number;
  revenue: string;
  averageTicket: string;
}
interface ApptItem {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  type: string;
  client: { fullName: string } | null;
  professional: { id?: string; fullName: string } | null;
  procedures: { nameSnapshot: string }[];
  comanda: { id: string; status: string } | null;
}
interface ReminderItem {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  isOverdue: boolean;
  type: string;
}
interface Paginated<T> {
  data: T[];
}

function todayRange() {
  const n = new Date();
  const start = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 0, 0, 0);
  const end = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 23, 59, 59);
  return { from: start.toISOString(), to: end.toISOString() };
}

const brl = (v: string) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function DashboardPage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.fullName?.split(" ")[0] ?? "";

  const summary = useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => apiFetch<Summary>("/analytics/summary"),
    retry: false,
    staleTime: 60_000,
  });

  const today = todayRange();
  const agenda = useQuery({
    queryKey: ["appointments", "today"],
    queryFn: () =>
      apiFetch<Paginated<ApptItem>>(
        `/appointments?from=${today.from}&to=${today.to}&limit=50`,
      ),
    retry: false,
    staleTime: 30_000,
  });

  // No início cada profissional vê a agenda DELE (a agenda completa/compartilhada
  // fica na página "Agenda").
  const todayAppts = (agenda.data?.data ?? []).filter(
    (a) => a.professional?.id === user?.id,
  );

  const reminders = useQuery({
    queryKey: ["reminders", "pending"],
    queryFn: () =>
      apiFetch<Paginated<ReminderItem>>("/reminders?status=pending&limit=20"),
    retry: false,
    staleTime: 30_000,
  });

  const navigate = useNavigate();
  const qc = useQueryClient();

  // Abre (ou vai para) a comanda do agendamento e leva pro fluxo completo.
  const openComanda = useMutation({
    mutationFn: (a: ApptItem) => {
      if (a.comanda) return Promise.resolve({ id: a.comanda.id });
      return apiFetch<{ id: string }>("/comandas", {
        method: "POST",
        body: JSON.stringify({ appointmentId: a.id }),
      });
    },
    onSuccess: (c) =>
      navigate({ to: "/menu/comandas/$id", params: { id: c.id } }),
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível abrir a comanda"),
  });

  const completeReminder = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/reminders/${id}/complete`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Lembrete concluído ✦");
      void qc.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Falha"),
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[0.6rem] uppercase tracking-[0.4em] text-blood">
          Painel
        </p>
        <h1 className="mt-1 font-serif text-3xl text-parchment">
          Olá, {firstName} ✦
        </h1>
      </div>

      {/* Ações rápidas */}
      <section>
        <SectionTitle>Ações rápidas</SectionTitle>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
          <QuickAction to="/menu/clientes" icon={UserPlus} label="Cliente" />
          <QuickAction to="/menu/agenda" icon={CalendarDays} label="Agenda" />
          <QuickAction to="/menu/comandas" icon={Receipt} label="Comandas" />
          <QuickAction to="/menu/procedimentos" icon={Scissors} label="Procedim." />
          <QuickAction to="/menu/produtos" icon={Package} label="Produtos" />
          <QuickAction to="/menu/financeiro" icon={Wallet} label="Financeiro" />
        </div>
      </section>

      {/* Resumo do mês */}
      <section>
        <SectionTitle>Resumo do mês</SectionTitle>
        {summary.isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : summary.isError ? (
          <LoadError />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Stat
              icon={Wallet}
              label="Faturamento"
              value={brl(summary.data!.revenue)}
            />
            <Stat
              icon={CalendarCheck}
              label="Atendimentos"
              value={String(summary.data!.totalAppointments)}
            />
            <Stat
              icon={Users}
              label="Clientes novos"
              value={String(summary.data!.newClients)}
            />
            <Stat
              icon={RefreshCcw}
              label="Retornos"
              value={String(summary.data!.returns)}
            />
          </div>
        )}
      </section>

      {/* Agenda de hoje */}
      <section>
        <SectionTitle>Hoje na agenda</SectionTitle>
        {agenda.isLoading ? (
          <ListSkeleton />
        ) : agenda.isError ? (
          <LoadError />
        ) : todayAppts.length === 0 ? (
          <Empty>Nenhum atendimento para hoje.</Empty>
        ) : (
          <div className="space-y-2">
            {todayAppts.map((a) => {
              const isAppt = a.type === "APPOINTMENT";
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={!isAppt || openComanda.isPending}
                  onClick={() => isAppt && openComanda.mutate(a)}
                  className="w-full text-left"
                >
                  <Card
                    className={cn(
                      "flex items-center gap-3 border-border bg-card/60 p-3",
                      isAppt && "transition-colors hover:border-primary",
                    )}
                  >
                    <div className="flex flex-col items-center rounded-md bg-secondary px-2.5 py-1.5">
                      <span className="text-sm font-medium text-parchment">
                        {format(new Date(a.startTime), "HH:mm")}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-parchment">
                        {a.type === "BLOCK"
                          ? "Bloqueio de agenda"
                          : (a.client?.fullName ?? "Cliente")}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {isAppt && a.comanda ? (
                          <span className="text-emerald-400">
                            {a.comanda.status === "OPEN"
                              ? "comanda aberta →"
                              : "comanda fechada →"}
                          </span>
                        ) : isAppt ? (
                          <span className="text-primary">abrir comanda →</span>
                        ) : (
                          a.procedures.map((p) => p.nameSnapshot).join(", ") ||
                          a.professional?.fullName ||
                          "—"
                        )}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Lembretes */}
      <section>
        <SectionTitle>Lembretes</SectionTitle>
        {reminders.isLoading ? (
          <ListSkeleton />
        ) : reminders.isError ? (
          <LoadError />
        ) : reminders.data!.data.length === 0 ? (
          <Empty>Nenhum lembrete pendente. ✦</Empty>
        ) : (
          <div className="space-y-2">
            {reminders.data!.data.map((r) => (
              <Card
                key={r.id}
                className="flex items-center gap-3 border-border bg-card/60 p-3"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    r.isOverdue
                      ? "bg-destructive/15 text-destructive"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {r.type === "CLIENT_BIRTHDAY" ? (
                    <Cake className="h-4 w-4" />
                  ) : r.isOverdue ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-parchment">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(r.dueDate), "dd/MM/yyyy")}
                    {r.isOverdue && (
                      <span className="ml-2 text-destructive">Atrasado</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => completeReminder.mutate(r.id)}
                  disabled={completeReminder.isPending}
                  title="Concluir"
                  className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-emerald-400"
                >
                  <Check className="h-4 w-4" />
                </button>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Auxiliares de UI ──
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
      {children}
    </h2>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Wallet;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card/60 px-2 py-4 text-center transition-colors hover:border-primary hover:bg-card"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </Link>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-border bg-card/60 p-4">
      <Icon className="h-4 w-4 text-blood" />
      <p className="mt-3 text-xl font-medium text-parchment">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    SCHEDULED: { label: "Agendado", cls: "bg-secondary text-muted-foreground" },
    DEPOSIT_PAID: { label: "Sinal pago", cls: "bg-blood/20 text-blood" },
    COMPLETED: { label: "Concluído", cls: "bg-emerald-900/40 text-emerald-300" },
    RETURN: { label: "Retorno", cls: "bg-accent/20 text-accent" },
  };
  const s = map[status] ?? { label: status, cls: "bg-secondary text-muted-foreground" };
  return (
    <span className={cn("rounded-full px-2 py-1 text-[0.6rem]", s.cls)}>
      {s.label}
    </span>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-lg" />
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-dashed border-border bg-transparent p-6 text-center text-sm text-muted-foreground">
      {children}
    </Card>
  );
}

function LoadError() {
  return (
    <Card className="border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
      Não foi possível carregar. Verifique se o servidor está no ar.
    </Card>
  );
}
