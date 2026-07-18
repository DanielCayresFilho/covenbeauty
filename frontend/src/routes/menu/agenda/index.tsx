import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import luxon3Plugin from "@fullcalendar/luxon3";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import type { EventClickArg, DatesSetArg } from "@fullcalendar/core";

import { AppShell } from "@/components/app-shell";
import { AppointmentForm, type EditAppt } from "@/components/agenda/appointment-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/menu/agenda/")({
  component: AgendaPage,
});

const TZ = "America/Sao_Paulo";

interface Appt {
  id: string;
  type: "APPOINTMENT" | "BLOCK";
  status: "SCHEDULED" | "DEPOSIT_PAID" | "COMPLETED" | "RETURN";
  startTime: string;
  endTime: string;
  notes: string | null;
  depositAmount?: string;
  client: { id?: string; fullName: string; phone?: string } | null;
  professional: { id?: string; fullName: string } | null;
  procedures: { procedureId?: string; nameSnapshot: string }[];
}
interface Paginated<T> {
  data: T[];
}

// Cores por status (pedido do salão).
const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "#a855f7", // roxo — Agendado
  DEPOSIT_PAID: "#22c55e", // verde — Sinal pago
  COMPLETED: "#3b82f6", // azul — Concluído
  RETURN: "#eab308", // amarelo — Retorno
};
const BLOCK_COLOR = "#6b7280"; // cinza — Bloqueado

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendado",
  DEPOSIT_PAID: "Sinal pago",
  COMPLETED: "Concluído",
  RETURN: "Retorno",
};

const LEGEND = [
  { label: "Agendado", color: STATUS_COLOR.SCHEDULED },
  { label: "Sinal pago", color: STATUS_COLOR.DEPOSIT_PAID },
  { label: "Concluído", color: STATUS_COLOR.COMPLETED },
  { label: "Retorno", color: STATUS_COLOR.RETURN },
  { label: "Bloqueado", color: BLOCK_COLOR },
];

const fmt = (iso: string, pattern: string) =>
  formatInTimeZone(new Date(iso), TZ, pattern, { locale: ptBR });
const apptColor = (a: Appt) =>
  a.type === "BLOCK" ? BLOCK_COLOR : (STATUS_COLOR[a.status] ?? BLOCK_COLOR);
const apptTitle = (a: Appt) =>
  a.type === "BLOCK" ? a.notes || "Bloqueio" : (a.client?.fullName ?? "Cliente");

function AgendaPage() {
  return (
    <AppShell>
      <Agenda />
    </AppShell>
  );
}

function Agenda() {
  const [mode, setMode] = useState<"calendar" | "list">("calendar");
  const [selected, setSelected] = useState<Appt | null>(null);
  const [form, setForm] = useState<{ open: boolean; appt: EditAppt | null }>({
    open: false,
    appt: null,
  });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.4em] text-blood">
            Operação
          </p>
          <h1 className="mt-1 font-serif text-3xl text-parchment">Agenda</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gap-1"
            onClick={() => setForm({ open: true, appt: null })}
          >
            <Plus className="h-4 w-4" /> Novo
          </Button>
          <div className="flex rounded-md border border-border p-0.5">
            <ToggleBtn active={mode === "calendar"} onClick={() => setMode("calendar")}>
              <CalendarDays className="h-4 w-4" />
            </ToggleBtn>
            <ToggleBtn active={mode === "list"} onClick={() => setMode("list")}>
              <List className="h-4 w-4" />
            </ToggleBtn>
          </div>
        </div>
      </div>

      {/* Legenda de cores */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: l.color }}
            />
            <span className="text-[0.7rem] text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>

      {mounted ? (
        mode === "calendar" ? (
          <CalendarView onSelect={setSelected} />
        ) : (
          <ListView onSelect={setSelected} />
        )
      ) : (
        <Skeleton className="h-96 rounded-lg" />
      )}

      <AppointmentSheet
        appt={selected}
        onClose={() => setSelected(null)}
        onEdit={(a) => {
          setSelected(null);
          setForm({ open: true, appt: a as unknown as EditAppt });
        }}
      />

      <AppointmentForm
        open={form.open}
        appt={form.appt}
        onClose={() => setForm({ open: false, appt: null })}
      />
    </div>
  );
}

// ─────────────── Calendário (FullCalendar) ───────────────

function CalendarView({ onSelect }: { onSelect: (a: Appt) => void }) {
  const calRef = useRef<FullCalendar>(null);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [title, setTitle] = useState("");
  const [view, setView] = useState<"timeGridDay" | "timeGridWeek">("timeGridDay");

  const query = useQuery({
    queryKey: ["appointments", range?.from, range?.to],
    queryFn: () =>
      apiFetch<Paginated<Appt>>(
        `/appointments?from=${range!.from}&to=${range!.to}&limit=300`,
      ),
    enabled: !!range,
    retry: false,
  });

  const events = useMemo(
    () =>
      (query.data?.data ?? []).map((a) => ({
        id: a.id,
        title: apptTitle(a),
        start: a.startTime,
        end: a.endTime,
        backgroundColor: apptColor(a),
        borderColor: "transparent",
        extendedProps: { appt: a },
      })),
    [query.data],
  );

  const api = () => calRef.current?.getApi();
  const changeView = (v: "timeGridDay" | "timeGridWeek") => {
    setView(v);
    api()?.changeView(v);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => api()?.prev()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => api()?.today()}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={() => api()?.next()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex rounded-md border border-border p-0.5">
          <ToggleBtn active={view === "timeGridDay"} onClick={() => changeView("timeGridDay")}>
            <span className="px-1 text-xs">Dia</span>
          </ToggleBtn>
          <ToggleBtn active={view === "timeGridWeek"} onClick={() => changeView("timeGridWeek")}>
            <span className="px-1 text-xs">Semana</span>
          </ToggleBtn>
        </div>
      </div>

      <p className="text-center text-sm capitalize text-parchment">{title}</p>

      {query.isError && (
        <Card className="border-border bg-card/60 p-3 text-center text-xs text-muted-foreground">
          Não foi possível carregar os agendamentos (servidor offline?).
        </Card>
      )}

      <Card className="overflow-hidden border-border bg-card/40 p-1">
        <FullCalendar
          ref={calRef}
          plugins={[timeGridPlugin, interactionPlugin, luxon3Plugin]}
          timeZone={TZ}
          initialView="timeGridDay"
          locale={ptBrLocale}
          headerToolbar={false}
          allDaySlot={false}
          nowIndicator
          height="auto"
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          slotDuration="00:30:00"
          expandRows
          events={events}
          eventClick={(arg: EventClickArg) =>
            onSelect(arg.event.extendedProps.appt as Appt)
          }
          datesSet={(arg: DatesSetArg) => {
            setRange({ from: arg.startStr, to: arg.endStr });
            setTitle(arg.view.title);
          }}
        />
      </Card>
    </div>
  );
}

// ─────────────── Lista (próximos 14 dias) ───────────────

function ListView({ onSelect }: { onSelect: (a: Appt) => void }) {
  const range = useMemo(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const to = new Date(from.getTime() + 14 * 86_400_000);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const query = useQuery({
    queryKey: ["appointments", "list", range.from, range.to],
    queryFn: () =>
      apiFetch<Paginated<Appt>>(
        `/appointments?from=${range.from}&to=${range.to}&limit=300`,
      ),
    retry: false,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Appt[]>();
    for (const a of query.data?.data ?? []) {
      const day = fmt(a.startTime, "yyyy-MM-dd");
      (map.get(day) ?? map.set(day, []).get(day)!).push(a);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [query.data]);

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }
  if (query.isError) {
    return (
      <Card className="border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
        Não foi possível carregar. Verifique se o servidor está no ar.
      </Card>
    );
  }
  if (grouped.length === 0) {
    return (
      <Card className="border-dashed border-border bg-transparent p-8 text-center text-sm text-muted-foreground">
        Nenhum agendamento nos próximos 14 dias.
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {grouped.map(([day, items]) => (
        <div key={day}>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {fmt(items[0].startTime, "EEEE, dd 'de' MMMM")}
          </p>
          <div className="space-y-2">
            {items.map((a) => (
              <button key={a.id} onClick={() => onSelect(a)} className="w-full text-left">
                <Card className="flex items-center gap-3 border-border bg-card/60 p-3 transition-colors hover:border-blood/50">
                  <span
                    className="h-9 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: apptColor(a) }}
                  />
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-medium text-parchment">
                      {fmt(a.startTime, "HH:mm")}
                    </span>
                    <span className="text-[0.65rem] text-muted-foreground">
                      {fmt(a.endTime, "HH:mm")}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-parchment">{apptTitle(a)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.type === "BLOCK"
                        ? "Bloqueio"
                        : a.procedures.map((p) => p.nameSnapshot).join(", ") || "—"}
                    </p>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────── Detalhe do agendamento ───────────────

function AppointmentSheet({
  appt,
  onClose,
  onEdit,
}: {
  appt: Appt | null;
  onClose: () => void;
  onEdit: (a: Appt) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [deposit, setDeposit] = useState("");
  const isAppt = appt?.type === "APPOINTMENT";

  const openComanda = useMutation({
    mutationFn: () =>
      apiFetch<{ id: string }>("/comandas", {
        method: "POST",
        body: JSON.stringify({ appointmentId: appt!.id }),
      }),
    onSuccess: (c) => {
      void navigate({ to: "/menu/comandas/$id", params: { id: c.id } });
    },
    onError: (e) =>
      toast.error(
        e instanceof ApiError ? e.message : "Não foi possível abrir a comanda",
      ),
  });

  const patch = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch(`/appointments/${appt!.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível atualizar"),
  });

  const remove = useMutation({
    mutationFn: () =>
      apiFetch(`/appointments/${appt!.id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Removido da agenda");
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      onClose();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível remover"),
  });

  return (
    <Sheet open={!!appt} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        {appt && (
          <>
            <SheetHeader>
              <SheetTitle className="font-serif text-2xl text-parchment">
                {apptTitle(appt)}
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-4 px-4 pb-4">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: apptColor(appt) }}
                />
                <span className="text-sm text-parchment">
                  {appt.type === "BLOCK"
                    ? "Bloqueio de agenda"
                    : STATUS_LABEL[appt.status]}
                </span>
              </div>

              <Row label="Data">
                {fmt(appt.startTime, "EEEE, dd 'de' MMMM 'de' yyyy")}
              </Row>
              <Row label="Horário">
                {fmt(appt.startTime, "HH:mm")} – {fmt(appt.endTime, "HH:mm")}
              </Row>
              {appt.professional && (
                <Row label="Profissional">{appt.professional.fullName}</Row>
              )}
              {isAppt && (
                <Row label="Procedimentos">
                  {appt.procedures.map((p) => p.nameSnapshot).join(", ") || "—"}
                </Row>
              )}
              {appt.notes && <Row label="Observação">{appt.notes}</Row>}

              {/* Ações */}
              {isAppt && (
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={appt.status}
                      onValueChange={(status) => {
                        patch.mutate({ status });
                        toast.success("Status atualizado");
                      }}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SCHEDULED">Agendado</SelectItem>
                        <SelectItem value="DEPOSIT_PAID">Sinal pago</SelectItem>
                        <SelectItem value="COMPLETED">Concluído</SelectItem>
                        <SelectItem value="RETURN">Retorno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs">Registrar sinal (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={deposit}
                        onChange={(e) => setDeposit(e.target.value)}
                        placeholder="ex.: 50,00"
                        className="h-11"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-11"
                      disabled={!deposit || patch.isPending}
                      onClick={() => {
                        patch.mutate({
                          depositAmount: Number(deposit),
                          status: "DEPOSIT_PAID",
                        });
                        setDeposit("");
                        toast.success("Sinal registrado ✦");
                      }}
                    >
                      Registrar
                    </Button>
                  </div>
                </div>
              )}

              {isAppt && (
                <Button
                  className="w-full"
                  disabled={openComanda.isPending}
                  onClick={() => openComanda.mutate()}
                >
                  {openComanda.isPending ? "Abrindo..." : "Abrir comanda"}
                </Button>
              )}

              <div className="flex gap-2 border-t border-border pt-4">
                {isAppt && (
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => onEdit(appt)}
                  >
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "gap-2 text-destructive hover:text-destructive",
                        isAppt ? "" : "flex-1",
                      )}
                    >
                      <Trash2 className="h-4 w-4" /> Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir da agenda?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => remove.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm capitalize text-parchment">{children}</p>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center rounded px-2 py-1.5 transition-colors",
        active ? "bg-secondary text-parchment" : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
