import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  sessionsPlanned?: number | null;
  sessionNumber?: number | null;
  subtotal?: string | null;
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
  const [isTattoo, setIsTattoo] = useState(false);
  const [tattooFree, setTattooFree] = useState(true); // descrição livre (padrão)
  const [tattooDesc, setTattooDesc] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [client, setClient] = useState<{ id: string; fullName: string } | null>(null);
  const [procedureIds, setProcedureIds] = useState<string[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [sessionsPlanned, setSessionsPlanned] = useState("");
  const [sessionNumber, setSessionNumber] = useState("");
  const [price, setPrice] = useState("");
  const [procSearch, setProcSearch] = useState("");
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
    const tattoo = !!appt?.sessionsPlanned || appt?.sessionNumber != null;
    setIsTattoo(tattoo);
    // Linha de texto livre = procedimento sem procedureId. Nova tatuagem: livre por padrão.
    const freeLine =
      (appt?.procedures?.length ?? 0) > 0 && !appt?.procedures?.[0]?.procedureId;
    setTattooFree(freeLine || !appt);
    setTattooDesc(freeLine ? (appt?.procedures?.[0]?.nameSnapshot ?? "") : "");
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
    setSessionsPlanned(appt?.sessionsPlanned ? String(appt.sessionsPlanned) : "");
    setSessionNumber(appt?.sessionNumber ? String(appt.sessionNumber) : "");
    setPrice(tattoo && appt?.subtotal != null ? String(Number(appt.subtotal)) : "");
    setProcSearch("");
    setNotes(appt?.notes ?? "");
  }, [open, appt]);

  const allProcs = procedures.data?.data ?? [];
  const filteredProcs = useMemo(() => {
    const q = procSearch.trim().toLowerCase();
    if (!q) return allProcs;
    return allProcs.filter((p) => p.name.toLowerCase().includes(q));
  }, [allProcs, procSearch]);
  const selectedProcs = useMemo(
    () => allProcs.filter((p) => procedureIds.includes(p.id)),
    [allProcs, procedureIds],
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
      const tattooLivre = isTattoo && tattooFree;
      const body = JSON.stringify({
        professionalId,
        clientId: client!.id,
        startTime: startISO,
        // Descrição livre não manda procedimentos; caso contrário, os escolhidos.
        ...(tattooLivre
          ? { tattooDescription: tattooDesc.trim() }
          : { procedureIds }),
        notes: notes || undefined,
        // Tatuagem: fim manual + sessões + preço manual.
        ...(isTattoo
          ? {
              endTime: fromZonedTime(end, TZ).toISOString(),
              sessionsPlanned: sessionsPlanned ? Number(sessionsPlanned) : undefined,
              sessionNumber: sessionNumber ? Number(sessionNumber) : undefined,
              price: price ? Number(price) : undefined,
            }
          : {}),
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
      if (isTattoo && tattooFree) {
        if (!tattooDesc.trim())
          return toast.error("Descreva a tatuagem (ex.: Caveira no braço)");
      } else if (procedureIds.length === 0) {
        return toast.error(
          isTattoo ? "Escolha o tipo de tatuagem" : "Selecione ao menos um procedimento",
        );
      }
      if (isTattoo) {
        if (!end) return toast.error("Informe o horário de fim da tatuagem");
        if (fromZonedTime(end, TZ) <= fromZonedTime(start, TZ))
          return toast.error("O fim deve ser após o início");
        if (!price || Number(price) <= 0)
          return toast.error("Informe o preço da tatuagem");
      }
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
              <TabBtn
                active={type === "APPOINTMENT" && !isTattoo}
                onClick={() => {
                  setType("APPOINTMENT");
                  setIsTattoo(false);
                }}
              >
                Atendimento
              </TabBtn>
              <TabBtn
                active={isTattoo}
                onClick={() => {
                  setType("APPOINTMENT");
                  setIsTattoo(true);
                }}
              >
                Tatuagem
              </TabBtn>
              <TabBtn
                active={type === "BLOCK"}
                onClick={() => {
                  setType("BLOCK");
                  setIsTattoo(false);
                }}
              >
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

              {isTattoo && (
                <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                  <Label className="text-sm">Escrever a tatuagem manualmente</Label>
                  <Switch checked={tattooFree} onCheckedChange={setTattooFree} />
                </div>
              )}

              {isTattoo && tattooFree ? (
                <div className="space-y-1.5">
                  <Label>Descrição da tatuagem</Label>
                  <Input
                    value={tattooDesc}
                    onChange={(e) => setTattooDesc(e.target.value)}
                    placeholder="ex.: Caveira no braço"
                    className="h-11"
                  />
                </div>
              ) : (
              <div className="space-y-1.5">
                <Label>
                  {isTattoo ? "Tipo de tatuagem" : "Procedimentos"}
                </Label>
                {allProcs.length > 0 && (
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={procSearch}
                      onChange={(e) => setProcSearch(e.target.value)}
                      placeholder="Buscar procedimento..."
                      className="h-10 pl-8"
                    />
                  </div>
                )}
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border p-1">
                  {allProcs.length === 0 ? (
                    <p className="p-3 text-center text-xs text-muted-foreground">
                      Nenhum procedimento cadastrado.
                    </p>
                  ) : filteredProcs.length === 0 ? (
                    <p className="p-3 text-center text-xs text-muted-foreground">
                      Nada encontrado para “{procSearch}”.
                    </p>
                  ) : (
                    filteredProcs.map((p) => {
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
                            {!isTattoo && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {p.durationMinutes}min
                              </span>
                            )}
                          </span>
                          {on && <Check className="h-4 w-4 shrink-0 text-blood" />}
                        </button>
                      );
                    })
                  )}
                </div>
                {!isTattoo && procedureIds.length > 0 && (
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
              )}

              {isTattoo && (
                <div className="space-y-1.5">
                  <Label>Preço da tatuagem (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    placeholder="ex.: 350,00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    O valor é manual (não vem do procedimento) e vai para a comanda.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Início</Label>
                <Input
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="h-11"
                />
              </div>

              {isTattoo && (
                <>
                  <div className="space-y-1.5">
                    <Label>Fim (a tatuagem não tem duração fixa)</Label>
                    <Input
                      type="datetime-local"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <Label>Sessão atual</Label>
                      <Input
                        type="number"
                        min="1"
                        inputMode="numeric"
                        placeholder="ex.: 1"
                        value={sessionNumber}
                        onChange={(e) => setSessionNumber(e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <Label>Total de sessões</Label>
                      <Input
                        type="number"
                        min="1"
                        inputMode="numeric"
                        placeholder="ex.: 3"
                        value={sessionsPlanned}
                        onChange={(e) => setSessionsPlanned(e.target.value)}
                        className="h-11"
                      />
                    </div>
                  </div>
                </>
              )}
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
