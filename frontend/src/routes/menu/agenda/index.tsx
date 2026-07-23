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
  Lock,
} from "lucide-react";

import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import luxon3Plugin from "@fullcalendar/luxon3";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import type {
  EventClickArg,
  DatesSetArg,
  EventContentArg,
} from "@fullcalendar/core";

import { AppShell } from "@/components/app-shell";
import { AppointmentForm, type EditAppt } from "@/components/agenda/appointment-form";
import { Decalque } from "@/components/agenda/decalque";
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
import { toast } from "sonner";
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
  comanda?: { id: string; status: string } | null;
  sessionsPlanned?: number | null;
  sessionNumber?: number | null;
  subtotal?: string | null;
  decalqueFilename?: string | null;
}

/** Heurística: é tatuagem? (sessões, decalque ou linha de texto livre). */
const isTattooAppt = (a: Appt) =>
  a.type === "APPOINTMENT" &&
  (!!a.sessionsPlanned ||
    a.sessionNumber != null ||
    !!a.decalqueFilename ||
    (a.procedures.length > 0 && !a.procedures[0].procedureId));

/** "Sessão 1/3", "Sessão 2", ou null quando não é tatuagem. */
const sessionLabel = (a: Appt) => {
  if (a.sessionNumber && a.sessionsPlanned)
    return `Sessão ${a.sessionNumber}/${a.sessionsPlanned}`;
  if (a.sessionsPlanned) return `${a.sessionsPlanned} sessões`;
  if (a.sessionNumber) return `Sessão ${a.sessionNumber}`;
  return null;
};
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

interface RecurringBlock {
  id: string;
  professionalId: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  note: string | null;
}
const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
const minToHHMM = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const fmt = (iso: string, pattern: string) =>
  formatInTimeZone(new Date(iso), TZ, pattern, { locale: ptBR });
const apptColor = (a: Appt) =>
  a.type === "BLOCK" ? BLOCK_COLOR : (STATUS_COLOR[a.status] ?? BLOCK_COLOR);
const apptTitle = (a: Appt) =>
  a.type === "BLOCK" ? a.notes || "Bloqueio" : (a.client?.fullName ?? "Cliente");
const apptProcedures = (a: Appt) =>
  a.procedures.map((p) => p.nameSnapshot).join(", ");

/** Conteúdo de cada evento: cliente + profissional + procedimento, bem claro. */
function renderEventContent(arg: EventContentArg) {
  const a = arg.event.extendedProps.appt as Appt | undefined;
  if (!a) {
    // Bloqueio fixo (evento de fundo).
    return (
      <div className="fc-cb-event">
        <div className="fc-cb-sub">🔒 {arg.event.title}</div>
      </div>
    );
  }
  const procs = apptProcedures(a);
  return (
    <div className="fc-cb-event">
      <div className="fc-cb-time">{arg.timeText}</div>
      <div className="fc-cb-name">{apptTitle(a)}</div>
      {a.type !== "BLOCK" && a.professional && (
        <div className="fc-cb-sub">✦ {a.professional.fullName}</div>
      )}
      {sessionLabel(a) && <div className="fc-cb-sub">🖊 {sessionLabel(a)}</div>}
      {a.type !== "BLOCK" && procs && <div className="fc-cb-sub">{procs}</div>}
    </div>
  );
}

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
  const [blocksOpen, setBlocksOpen] = useState(false);
  // Agenda é compartilhada: dá para focar em um profissional quando lota.
  const [professionalId, setProfessionalId] = useState("all");
  useEffect(() => setMounted(true), []);

  const professionals = useQuery({
    queryKey: ["professionals"],
    queryFn: () =>
      apiFetch<{ id: string; fullName: string }[]>("/users/professionals"),
    staleTime: 5 * 60 * 1000,
  });

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
            variant="outline"
            size="icon"
            title="Bloqueios fixos"
            onClick={() => setBlocksOpen(true)}
          >
            <Lock className="h-4 w-4" />
          </Button>
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

      {/* Filtro por profissional (a agenda mostra todos por padrão) */}
      {(professionals.data?.length ?? 0) > 1 && (
        <Select value={professionalId} onValueChange={setProfessionalId}>
          <SelectTrigger className="h-10 w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os profissionais</SelectItem>
            {professionals.data!.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

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
        <div key={mode} className="cb-fade-in">
          {mode === "calendar" ? (
            <CalendarView onSelect={setSelected} professionalId={professionalId} />
          ) : (
            <ListView onSelect={setSelected} professionalId={professionalId} />
          )}
        </div>
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

      <RecurringBlocksSheet
        open={blocksOpen}
        onClose={() => setBlocksOpen(false)}
        professionals={professionals.data ?? []}
      />
    </div>
  );
}

// ─────────────── Bloqueios fixos (recorrentes) ───────────────

function RecurringBlocksSheet({
  open,
  onClose,
  professionals,
}: {
  open: boolean;
  onClose: () => void;
  professionals: { id: string; fullName: string }[];
}) {
  const qc = useQueryClient();
  const [professionalId, setProfessionalId] = useState("");
  const [weekday, setWeekday] = useState("6");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("11:00");
  const [note, setNote] = useState("");

  const list = useQuery({
    queryKey: ["recurring-blocks"],
    queryFn: () => apiFetch<RecurringBlock[]>("/recurring-blocks"),
    enabled: open,
    retry: false,
  });

  const proById = new Map(professionals.map((p) => [p.id, p.fullName]));

  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + (m || 0);
  };

  const create = useMutation({
    mutationFn: () =>
      apiFetch("/recurring-blocks", {
        method: "POST",
        body: JSON.stringify({
          professionalId,
          weekday: Number(weekday),
          startMinute: toMin(start),
          endMinute: toMin(end),
          note: note || undefined,
        }),
      }),
    onSuccess: () => {
      toast.success("Bloqueio fixo criado ✦");
      setNote("");
      void qc.invalidateQueries({ queryKey: ["recurring-blocks"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível criar"),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/recurring-blocks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Bloqueio removido");
      void qc.invalidateQueries({ queryKey: ["recurring-blocks"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Falha ao remover"),
  });

  const submit = () => {
    if (!professionalId) return toast.error("Selecione o profissional");
    if (toMin(end) <= toMin(start))
      return toast.error("O fim deve ser após o início");
    create.mutate();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl text-parchment">
            Bloqueios fixos
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <p className="text-xs text-muted-foreground">
            Ex.: todo sábado das 09h às 11h. Impede novos agendamentos no horário.
          </p>

          <div className="space-y-1.5">
            <Label>Profissional</Label>
            <Select value={professionalId} onValueChange={setProfessionalId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Dia da semana</Label>
            <Select value={weekday} onValueChange={setWeekday}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((w, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-1.5">
              <Label>Início</Label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-11" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label>Fim</Label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-11" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observação (opcional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex.: Almoço" className="h-11" />
          </div>

          <Button onClick={submit} disabled={create.isPending} className="h-11 w-full">
            {create.isPending ? "Salvando..." : "Adicionar bloqueio"}
          </Button>

          <div className="space-y-2 border-t border-border pt-4">
            {(list.data ?? []).length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                Nenhum bloqueio fixo ainda.
              </p>
            ) : (
              (list.data ?? []).map((b) => (
                <Card key={b.id} className="flex items-center gap-3 border-border bg-card/60 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-parchment">
                      {WEEKDAYS[b.weekday]} · {minToHHMM(b.startMinute)}–{minToHHMM(b.endMinute)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {proById.get(b.professionalId) ?? "Profissional"}
                      {b.note ? ` · ${b.note}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove.mutate(b.id)}
                    className="shrink-0 rounded p-1.5 text-destructive hover:bg-destructive/10"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────── Calendário (FullCalendar) ───────────────

function CalendarView({
  onSelect,
  professionalId,
}: {
  onSelect: (a: Appt) => void;
  professionalId: string;
}) {
  const calRef = useRef<FullCalendar>(null);
  const qc = useQueryClient();
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [title, setTitle] = useState("");
  const [view, setView] = useState<"timeGridDay" | "timeGridWeek">("timeGridWeek");

  const query = useQuery({
    queryKey: ["appointments", range?.from, range?.to],
    queryFn: () =>
      apiFetch<Paginated<Appt>>(
        `/appointments?from=${range!.from}&to=${range!.to}&limit=200`,
      ),
    enabled: !!range,
    retry: false,
  });

  // Arrastar/redimensionar no calendário reagenda (PATCH startTime/endTime).
  const move = useMutation({
    mutationFn: (vars: { id: string; startTime: string; endTime: string }) =>
      apiFetch(`/appointments/${vars.id}`, {
        method: "PATCH",
        body: JSON.stringify({ startTime: vars.startTime, endTime: vars.endTime }),
      }),
    onSuccess: () => {
      toast.success("Agendamento movido ✦");
      void qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível mover"),
  });

  const blocksQuery = useQuery({
    queryKey: ["recurring-blocks"],
    queryFn: () => apiFetch<RecurringBlock[]>("/recurring-blocks"),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const events = useMemo(() => {
    const appts = (query.data?.data ?? [])
      .filter(
        (a) => professionalId === "all" || a.professional?.id === professionalId,
      )
      .map((a) => ({
        id: a.id,
        title: apptTitle(a),
        start: a.startTime,
        end: a.endTime,
        backgroundColor: apptColor(a),
        borderColor: "transparent",
        extendedProps: { appt: a },
      }));
    // Bloqueios fixos (recorrentes) como eventos de fundo.
    const blocks = (blocksQuery.data ?? [])
      .filter((b) => professionalId === "all" || b.professionalId === professionalId)
      .map((b) => ({
        daysOfWeek: [b.weekday],
        startTime: minToHHMM(b.startMinute),
        endTime: minToHHMM(b.endMinute),
        display: "background" as const,
        backgroundColor: BLOCK_COLOR,
        title: b.note ?? "Bloqueado",
        extendedProps: { recurring: true },
      }));
    return [...appts, ...blocks];
  }, [query.data, blocksQuery.data, professionalId]);

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
          initialView="timeGridWeek"
          locale={ptBrLocale}
          headerToolbar={false}
          allDaySlot={false}
          nowIndicator
          height="auto"
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          slotDuration="00:30:00"
          expandRows
          /* Dois profissionais no mesmo horário: dividem o espaço lado a lado
             em vez de um cobrir o outro. */
          slotEventOverlap={false}
          /* Arrastar para reagendar e redimensionar para mudar a duração. */
          editable
          eventStartEditable
          eventDurationEditable
          events={events}
          eventContent={renderEventContent}
          eventClick={(arg: EventClickArg) => {
            const a = arg.event.extendedProps.appt as Appt | undefined;
            if (a) onSelect(a);
          }}
          eventDrop={(arg) => {
            const a = arg.event.extendedProps.appt as Appt | undefined;
            if (!a || !arg.event.start || !arg.event.end) {
              arg.revert();
              return;
            }
            move.mutate(
              {
                id: a.id,
                startTime: arg.event.start.toISOString(),
                endTime: arg.event.end.toISOString(),
              },
              { onError: () => arg.revert() },
            );
          }}
          eventResize={(arg) => {
            const a = arg.event.extendedProps.appt as Appt | undefined;
            if (!a || !arg.event.start || !arg.event.end) {
              arg.revert();
              return;
            }
            move.mutate(
              {
                id: a.id,
                startTime: arg.event.start.toISOString(),
                endTime: arg.event.end.toISOString(),
              },
              { onError: () => arg.revert() },
            );
          }}
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

function ListView({
  onSelect,
  professionalId,
}: {
  onSelect: (a: Appt) => void;
  professionalId: string;
}) {
  // Mês navegável (0 = mês atual) — permite ver retornos/agendamentos futuros.
  const [monthOffset, setMonthOffset] = useState(0);
  const range = useMemo(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const to = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0, 23, 59, 59);
    return { from: from.toISOString(), to: to.toISOString(), label: from };
  }, [monthOffset]);

  const query = useQuery({
    queryKey: ["appointments", "list", range.from, range.to],
    queryFn: () =>
      apiFetch<Paginated<Appt>>(
        `/appointments?from=${range.from}&to=${range.to}&limit=200`,
      ),
    retry: false,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Appt[]>();
    for (const a of query.data?.data ?? []) {
      if (professionalId !== "all" && a.professional?.id !== professionalId) {
        continue;
      }
      const day = fmt(a.startTime, "yyyy-MM-dd");
      (map.get(day) ?? map.set(day, []).get(day)!).push(a);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [query.data, professionalId]);

  const header = (
    <div className="flex items-center justify-center gap-1">
      <Button variant="outline" size="icon" onClick={() => setMonthOffset((m) => m - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-40 text-center text-sm capitalize text-parchment">
        {fmt(range.from, "MMMM 'de' yyyy")}
      </span>
      <Button variant="outline" size="icon" onClick={() => setMonthOffset((m) => m + 1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  let body: React.ReactNode;
  if (query.isLoading) {
    body = (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  } else if (query.isError) {
    body = (
      <Card className="border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
        Não foi possível carregar. Verifique se o servidor está no ar.
      </Card>
    );
  } else if (grouped.length === 0) {
    body = (
      <Card className="border-dashed border-border bg-transparent p-8 text-center text-sm text-muted-foreground">
        Nenhum agendamento neste mês.
      </Card>
    );
  } else {
    body = (
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
                    {a.type !== "BLOCK" && a.professional && (
                      <p className="truncate text-xs font-medium text-blood">
                        ✦ {a.professional.fullName}
                      </p>
                    )}
                    <p className="truncate text-xs text-muted-foreground">
                      {a.type === "BLOCK"
                        ? "Bloqueio"
                        : apptProcedures(a) || "—"}
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

  return (
    <div className="space-y-3">
      {header}
      {body}
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
    mutationFn: () => {
      if (appt!.comanda) return Promise.resolve({ id: appt!.comanda.id });
      return apiFetch<{ id: string }>("/comandas", {
        method: "POST",
        body: JSON.stringify({ appointmentId: appt!.id }),
      });
    },
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
              {sessionLabel(appt) && (
                <Row label="Tatuagem">{sessionLabel(appt)}</Row>
              )}
              {isAppt && (
                <Row label="Procedimentos">
                  {appt.procedures.map((p) => p.nameSnapshot).join(", ") || "—"}
                </Row>
              )}
              {appt.notes && <Row label="Observação">{appt.notes}</Row>}

              {isTattooAppt(appt) && (
                <div className="border-t border-border pt-4">
                  <Decalque
                    appointmentId={appt.id}
                    decalqueFilename={appt.decalqueFilename}
                    canEdit
                    onChanged={() =>
                      void qc.invalidateQueries({ queryKey: ["appointments"] })
                    }
                  />
                </div>
              )}

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
                  {openComanda.isPending
                    ? "Abrindo..."
                    : appt.comanda
                      ? "Ver comanda"
                      : "Abrir comanda"}
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
