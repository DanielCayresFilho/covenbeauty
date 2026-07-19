import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { toast } from "sonner";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

const TZ = "America/Sao_Paulo";

interface Professional {
  id: string;
  fullName: string;
}
interface ProcedureItem {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
}
interface ClientItem {
  id: string;
  fullName: string;
  phone: string;
}

export interface EditAppt {
  id: string;
  type: "APPOINTMENT" | "BLOCK";
  startTime: string;
  endTime: string;
  notes: string | null;
  client: { id?: string; fullName: string } | null;
  professional: { id?: string; fullName: string } | null;
  professionalId?: string;
  clientId?: string | null;
  procedures: { procedureId?: string; nameSnapshot: string }[];
}

const toLocalInput = (iso: string) =>
  formatInTimeZone(new Date(iso), TZ, "yyyy-MM-dd'T'HH:mm");
const nowLocalInput = () =>
  formatInTimeZone(new Date(), TZ, "yyyy-MM-dd'T'HH:mm");

export function AppointmentForm({
  open,
  appt,
  onClose,
}: {
  open: boolean;
  appt: EditAppt | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!appt;

  const [type, setType] = useState<"APPOINTMENT" | "BLOCK">("APPOINTMENT");
  const [professionalId, setProfessionalId] = useState("");
  const [client, setClient] = useState<{ id: string; fullName: string } | null>(null);
  const [procedureIds, setProcedureIds] = useState<string[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");

  const professionals = useQuery({
    queryKey: ["professionals"],
    queryFn: () => apiFetch<Professional[]>("/users/professionals"),
    retry: false,
    enabled: open,
  });

  const procedures = useQuery({
    queryKey: ["procedures", "all"],
    queryFn: () =>
      apiFetch<{ data: ProcedureItem[] }>("/procedures?limit=100"),
    retry: false,
    enabled: open && type === "APPOINTMENT",
  });

  // Inicializa ao abrir.
  useEffect(() => {
    if (!open) return;
    setType(appt?.type ?? "APPOINTMENT");
    setProfessionalId(appt?.professional?.id ?? appt?.professionalId ?? "");
    setClient(
      appt?.client?.id
        ? { id: appt.client.id, fullName: appt.client.fullName }
        : null,
    );
    setProcedureIds(
      appt?.procedures
        ?.map((p) => p.procedureId)
        .filter((x): x is string => !!x) ?? [],
    );
    setStart(appt ? toLocalInput(appt.startTime) : nowLocalInput());
    setEnd(appt ? toLocalInput(appt.endTime) : "");
    setNotes(appt?.notes ?? "");
  }, [open, appt]);

  const selectedProcs = useMemo(
    () =>
      (procedures.data?.data ?? []).filter((p) => procedureIds.includes(p.id)),
    [procedures.data, procedureIds],
  );
  const totalMin = selectedProcs.reduce((s, p) => s + p.durationMinutes, 0);
  const totalPrice = selectedProcs.reduce((s, p) => s + Number(p.price), 0);
  const estEnd =
    start && totalMin
      ? formatInTimeZone(
          new Date(fromZonedTime(start, TZ).getTime() + totalMin * 60_000),
          TZ,
          "HH:mm",
        )
      : null;

  const save = useMutation({
    mutationFn: () => {
      const startISO = fromZonedTime(start, TZ).toISOString();
      if (type === "BLOCK") {
        const endISO = fromZonedTime(end, TZ).toISOString();
        return apiFetch("/appointments/block", {
          method: "POST",
          body: JSON.stringify({
            professionalId,
            startTime: startISO,
            endTime: endISO,
            notes: notes || undefined,
          }),
        });
      }
      const body = JSON.stringify({
        professionalId,
        clientId: client!.id,
        startTime: startISO,
        procedureIds,
        notes: notes || undefined,
      });
      return isEdit
        ? apiFetch(`/appointments/${appt!.id}`, { method: "PATCH", body })
        : apiFetch("/appointments", { method: "POST", body });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Agendamento atualizado ✦" : "Agendamento criado ✦");
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      onClose();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível salvar"),
  });

  function submit() {
    if (!professionalId) return toast.error("Selecione o profissional");
    if (!start) return toast.error("Informe a data e hora de início");
    if (type === "APPOINTMENT") {
      if (!client) return toast.error("Selecione o cliente");
      if (procedureIds.length === 0)
        return toast.error("Selecione ao menos um procedimento");
    } else {
      if (!end) return toast.error("Informe o fim do bloqueio");
      if (fromZonedTime(end, TZ) <= fromZonedTime(start, TZ))
        return toast.error("O fim deve ser após o início");
    }
    save.mutate();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl text-parchment">
            {isEdit ? "Editar agendamento" : "Novo na agenda"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          {!isEdit && (
            <div className="flex rounded-md border border-border p-0.5">
              <TabBtn active={type === "APPOINTMENT"} onClick={() => setType("APPOINTMENT")}>
                Atendimento
              </TabBtn>
              <TabBtn active={type === "BLOCK"} onClick={() => setType("BLOCK")}>
                Bloqueio
              </TabBtn>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Profissional</Label>
            <Select value={professionalId} onValueChange={setProfessionalId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {(professionals.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "APPOINTMENT" && (
            <>
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <ClientCombobox value={client} onChange={setClient} />
              </div>

              <div className="space-y-1.5">
                <Label>Procedimentos</Label>
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border p-1">
                  {(procedures.data?.data ?? []).length === 0 ? (
                    <p className="p-3 text-center text-xs text-muted-foreground">
                      Nenhum procedimento cadastrado.
                    </p>
                  ) : (
                    procedures.data!.data.map((p) => {
                      const on = procedureIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            setProcedureIds((ids) =>
                              on ? ids.filter((i) => i !== p.id) : [...ids, p.id],
                            )
                          }
                          className={cn(
                            "flex w-full items-center justify-between rounded px-2.5 py-2 text-left text-sm",
                            on ? "bg-secondary text-parchment" : "text-muted-foreground",
                          )}
                        >
                          <span className="min-w-0 truncate">
                            {p.name}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {p.durationMinutes}min
                            </span>
                          </span>
                          {on && <Check className="h-4 w-4 shrink-0 text-blood" />}
                        </button>
                      );
                    })
                  )}
                </div>
                {procedureIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Total: {totalMin}min ·{" "}
                    {totalPrice.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                    {estEnd && <> · fim ~{estEnd}</>}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Início</Label>
                <Input
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="h-11"
                />
              </div>
            </>
          )}

          {type === "BLOCK" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Input
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fim</Label>
                <Input
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{type === "BLOCK" ? "Motivo" : "Observação"} (opcional)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <SheetFooter className="px-0">
            <Button onClick={submit} disabled={save.isPending} className="h-11 w-full">
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ClientCombobox({
  value,
  onChange,
}: {
  value: { id: string; fullName: string } | null;
  onChange: (c: { id: string; fullName: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const clients = useQuery({
    queryKey: ["clients", "combo", debounced],
    queryFn: () =>
      apiFetch<{ data: ClientItem[] }>(
        `/clients?search=${encodeURIComponent(debounced)}&limit=20`,
      ),
    retry: false,
    enabled: open,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value ? value.fullName : "Selecionar cliente"}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar cliente..."
            value={q}
            onValueChange={setQ}
          />
          <CommandList>
            {clients.isLoading ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                Buscando...
              </div>
            ) : (clients.data?.data ?? []).length === 0 ? (
              <CommandEmpty>Nenhum cliente.</CommandEmpty>
            ) : (
              clients.data!.data.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={() => {
                    onChange({ id: c.id, fullName: c.fullName });
                    setOpen(false);
                  }}
                >
                  <div>
                    <p className="text-sm">{c.fullName}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                </CommandItem>
              ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function TabBtn({
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
        "flex-1 rounded px-3 py-2 text-sm transition-colors",
        active ? "bg-secondary text-parchment" : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
