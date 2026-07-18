import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Users,
  CalendarCheck,
  RefreshCcw,
  Wallet,
  Clock,
  AlertTriangle,
  Cake,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
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
  professional: { fullName: string } | null;
  procedures: { nameSnapshot: string }[];
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

  const reminders = useQuery({
    queryKey: ["reminders", "pending"],
    queryFn: () =>
      apiFetch<Paginated<ReminderItem>>("/reminders?status=pending&limit=20"),
    retry: false,
    staleTime: 30_000,
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
        ) : agenda.data!.data.length === 0 ? (
          <Empty>Nenhum atendimento para hoje.</Empty>
        ) : (
          <div className="space-y-2">
            {agenda.data!.data.map((a) => (
              <Card
                key={a.id}
                className="flex items-center gap-3 border-border bg-card/60 p-3"
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
                    {a.procedures.map((p) => p.nameSnapshot).join(", ") ||
                      a.professional?.fullName ||
                      "—"}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </Card>
            ))}
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
