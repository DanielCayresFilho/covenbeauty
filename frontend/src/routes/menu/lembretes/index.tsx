import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { toast } from "sonner";
import { Plus, Cake, Clock, AlertTriangle, Check, RotateCcw, Trash2, Gift } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
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
  SheetFooter,
} from "@/components/ui/sheet";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/menu/lembretes/")({
  component: LembretesPage,
});

const TZ = "America/Sao_Paulo";

interface Reminder {
  id: string;
  type: "GENERAL" | "CLIENT_BIRTHDAY";
  title: string;
  description: string | null;
  dueDate: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "pending" | "completed" | "overdue";
  isOverdue: boolean;
  isCompleted: boolean;
  client?: { fullName: string; phone: string } | null;
}
interface Paginated<T> {
  data: T[];
}

function LembretesPage() {
  return (
    <AppShell>
      <Lembretes />
    </AppShell>
  );
}

function Lembretes() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"pending" | "overdue" | "completed">("pending");
  const [open, setOpen] = useState(false);

  const query = useQuery({
    queryKey: ["reminders", status],
    queryFn: () =>
      apiFetch<Paginated<Reminder>>(`/reminders?status=${status}&limit=50`),
    retry: false,
  });

  const genBirthdays = useMutation({
    mutationFn: () =>
      apiFetch<{ created: number; birthdaysFound: number }>(
        "/reminders/generate-birthdays",
        { method: "POST", body: JSON.stringify({}) },
      ),
    onSuccess: (r) => {
      toast.success(
        `${r.birthdaysFound} aniversário(s) no mês · ${r.created} novo(s) lembrete(s)`,
      );
      void qc.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Falha ao gerar"),
  });

  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      apiFetch(`/reminders/${id}/${action}`, { method: "POST" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["reminders"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Falha"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/reminders/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Lembrete removido");
      void qc.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Falha"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.4em] text-blood">
            Organização
          </p>
          <h1 className="mt-1 font-serif text-3xl text-parchment">Lembretes</h1>
        </div>
        <Button className="gap-1" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>

      <Button
        variant="outline"
        className="w-full gap-2"
        disabled={genBirthdays.isPending}
        onClick={() => genBirthdays.mutate()}
      >
        <Gift className="h-4 w-4" /> Gerar aniversários do mês
      </Button>

      <div className="flex rounded-md border border-border p-0.5">
        <Tab active={status === "pending"} onClick={() => setStatus("pending")}>
          Pendentes
        </Tab>
        <Tab active={status === "overdue"} onClick={() => setStatus("overdue")}>
          Atrasados
        </Tab>
        <Tab active={status === "completed"} onClick={() => setStatus("completed")}>
          Concluídos
        </Tab>
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <Card className="border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
          Não foi possível carregar. Verifique se o servidor está no ar.
        </Card>
      ) : query.data!.data.length === 0 ? (
        <Card className="border-dashed border-border bg-transparent p-8 text-center text-sm text-muted-foreground">
          Nada por aqui. ✦
        </Card>
      ) : (
        <div className="space-y-2">
          {query.data!.data.map((r) => (
            <Card key={r.id} className="flex items-center gap-3 border-border bg-card/60 p-3">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  r.isOverdue
                    ? "bg-destructive/15 text-destructive"
                    : r.type === "CLIENT_BIRTHDAY"
                      ? "bg-blood/15 text-blood"
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
                  {formatInTimeZone(new Date(r.dueDate), TZ, "dd/MM/yyyy")}
                  {r.priority === "HIGH" && (
                    <span className="ml-2 text-blood">alta</span>
                  )}
                  {r.isOverdue && <span className="ml-2 text-destructive">atrasado</span>}
                </p>
              </div>
              {r.isCompleted ? (
                <IconBtn onClick={() => act.mutate({ id: r.id, action: "reopen" })}>
                  <RotateCcw className="h-4 w-4" />
                </IconBtn>
              ) : (
                <IconBtn onClick={() => act.mutate({ id: r.id, action: "complete" })}>
                  <Check className="h-4 w-4 text-emerald-400" />
                </IconBtn>
              )}
              <IconBtn onClick={() => remove.mutate(r.id)}>
                <Trash2 className="h-4 w-4" />
              </IconBtn>
            </Card>
          ))}
        </div>
      )}

      <ReminderForm open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function ReminderForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("MEDIUM");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setPriority("MEDIUM");
    setDueDate(formatInTimeZone(new Date(), TZ, "yyyy-MM-dd'T'HH:mm"));
  }, [open]);

  const save = useMutation({
    mutationFn: () =>
      apiFetch("/reminders", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: description || undefined,
          dueDate: fromZonedTime(dueDate, TZ).toISOString(),
          priority,
        }),
      }),
    onSuccess: () => {
      toast.success("Lembrete criado ✦");
      void qc.invalidateQueries({ queryKey: ["reminders"] });
      onClose();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível salvar"),
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl text-parchment">
            Novo lembrete
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" placeholder="ex.: Arrumar cafeteira" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* min-w-0: sem isso o campo de data (largura intrínseca no Safari)
                estoura a coluna e invade a Prioridade no iPad. */}
            <div className="min-w-0 space-y-1.5">
              <Label>Vencimento</Label>
              <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-11" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Baixa</SelectItem>
                  <SelectItem value="MEDIUM">Média</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Detalhes (opcional)</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <SheetFooter className="px-0">
            <Button
              onClick={() => {
                if (title.trim().length < 2) return toast.error("Informe o título");
                if (!dueDate) return toast.error("Informe o vencimento");
                save.mutate();
              }}
              disabled={save.isPending}
              className="h-11 w-full"
            >
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded px-3 py-2 text-sm transition-colors",
        active ? "bg-secondary text-parchment" : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function IconBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-parchment"
    >
      {children}
    </button>
  );
}
