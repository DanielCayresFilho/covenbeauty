import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight, Pencil, Plus, Trash2, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Combobox, type ComboItem } from "@/components/ui/combobox";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_CATEGORIES,
  BELOW_LINE_CATEGORIES,
  CATEGORY_LABEL,
  brl,
  type CashFlowCategory,
} from "./constants";

interface Account {
  id: string;
  name: string;
  category: CashFlowCategory;
}
interface Client {
  id: string;
  fullName: string;
}
interface Entry {
  id: string;
  date: string;
  category: CashFlowCategory;
  amount: string;
  accountId: string | null;
  account: { id: string; name: string; category: CashFlowCategory } | null;
  clientId: string | null;
  client: { id: string; fullName: string } | null;
  comandaId: string | null;
  description: string | null;
}
interface Paginated<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pages: number;
    totals: { entradas: string; saidas: string; proLabore: string; lucro: string };
  };
}

const fmtDate = (iso: string) =>
  formatInTimeZone(new Date(iso), "UTC", "dd/MM/yyyy", { locale: ptBR });

const isIncome = (c: CashFlowCategory) => c === "INCOME";
const isExpense = (c: CashFlowCategory) =>
  ["VARIABLE_COST", "FIXED_EXPENSE", "PRO_LABORE", "INVESTMENT"].includes(c);

const TONE: Record<CashFlowCategory, string> = {
  INCOME: "text-emerald-600 dark:text-emerald-400",
  VARIABLE_COST: "text-orange-600 dark:text-orange-400",
  FIXED_EXPENSE: "text-sky-600 dark:text-sky-400",
  PRO_LABORE: "text-amber-600 dark:text-amber-400",
  INVESTMENT: "text-violet-600 dark:text-violet-400",
  PROFIT_DISTRIBUTION: "text-muted-foreground",
  APPLICATION: "text-muted-foreground",
  REDEMPTION: "text-muted-foreground",
};

/** Estado dos filtros do topo. */
interface Filters {
  from: string;
  to: string;
  category: string;
  clientId: string;
}
const EMPTY_FILTERS: Filters = { from: "", to: "", category: "", clientId: "" };

export function EntriesTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Entry | null>(null);

  const setFilter = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const clients = useQuery({
    queryKey: ["clients", "options"],
    queryFn: () => apiFetch<{ data: Client[] }>("/clients?limit=100"),
    retry: false,
  });

  const params = useMemo(() => {
    const q = new URLSearchParams({ page: String(page), limit: "20" });
    if (filters.from) q.set("from", filters.from);
    if (filters.to) q.set("to", filters.to);
    if (filters.category) q.set("category", filters.category);
    if (filters.clientId) q.set("clientId", filters.clientId);
    return q.toString();
  }, [page, filters]);

  const query = useQuery({
    queryKey: ["entries", params],
    queryFn: () => apiFetch<Paginated<Entry>>(`/financial/entries?${params}`),
    retry: false,
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/financial/entries/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Lançamento removido");
      void qc.invalidateQueries({ queryKey: ["entries"] });
      void qc.invalidateQueries({ queryKey: ["cash-flow"] });
      setToDelete(null);
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível remover"),
  });

  const totals = query.data?.meta.totals;
  const clientItems: ComboItem[] = (clients.data?.data ?? []).map((c) => ({
    value: c.id,
    label: c.fullName,
  }));

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-4">
      {/* Resumo do que está filtrado (não só da página). */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Entradas"
          value={totals?.entradas}
          icon={<ArrowUpRight className="h-5 w-5" />}
          tone="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Saídas"
          value={totals?.saidas}
          icon={<ArrowDownRight className="h-5 w-5" />}
          tone="text-rose-600 dark:text-rose-400"
        />
        <StatCard
          label="Lucro"
          value={totals?.lucro}
          icon={<Wallet className="h-5 w-5" />}
          tone={
            Number(totals?.lucro ?? 0) < 0
              ? "text-rose-600 dark:text-rose-400"
              : "text-emerald-600 dark:text-emerald-400"
          }
        />
      </div>

      {/* Filtros */}
      <Card className="border-border bg-card/60 p-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Data inicial</Label>
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => setFilter({ from: e.target.value })}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Data final</Label>
            <Input
              type="date"
              value={filters.to}
              onChange={(e) => setFilter({ to: e.target.value })}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo</Label>
            <Select
              value={filters.category || "all"}
              onValueChange={(v) => setFilter({ category: v === "all" ? "" : v })}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {[...ACCOUNT_CATEGORIES, ...BELOW_LINE_CATEGORIES].map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cliente</Label>
            <Combobox
              items={[{ value: "", label: "Todos os clientes" }, ...clientItems]}
              value={filters.clientId}
              onChange={(v) => setFilter({ clientId: v })}
              placeholder="Todos os clientes"
              searchPlaceholder="Buscar cliente..."
              className="h-10 w-full"
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasFilters}
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              setPage(1);
            }}
          >
            Limpar filtros
          </Button>
          <Button className="gap-1" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Lançamento
          </Button>
        </div>
      </Card>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <Card className="border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
          Não foi possível carregar. Verifique se o servidor está no ar.
        </Card>
      ) : query.data!.data.length === 0 ? (
        <Card className="border-dashed border-border bg-transparent p-8 text-center text-sm text-muted-foreground">
          {hasFilters
            ? "Nenhum lançamento com esses filtros."
            : "Nenhum lançamento ainda."}
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">Data</th>
                <th className="px-3 py-2.5 text-left font-semibold">Conta</th>
                <th className="px-3 py-2.5 text-left font-semibold">Tipo</th>
                <th className="px-3 py-2.5 text-left font-semibold">Cliente</th>
                <th className="px-3 py-2.5 text-left font-semibold">Descrição</th>
                <th className="px-3 py-2.5 text-right font-semibold">Valor</th>
                <th className="px-3 py-2.5 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {query.data!.data.map((e) => (
                <tr key={e.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                    {fmtDate(e.date)}
                  </td>
                  <td className="px-3 py-2.5 text-parchment">
                    {e.account?.name ?? "—"}
                  </td>
                  <td className={cn("whitespace-nowrap px-3 py-2.5 text-xs", TONE[e.category])}>
                    {CATEGORY_LABEL[e.category]}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {e.client?.fullName ?? "—"}
                  </td>
                  <td className="max-w-56 truncate px-3 py-2.5 text-muted-foreground">
                    {e.description ?? "—"}
                    {e.comandaId && (
                      <span className="ml-1.5 text-[0.65rem] uppercase tracking-wide text-blood">
                        comanda
                      </span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-2.5 text-right font-medium",
                      isIncome(e.category)
                        ? "text-emerald-600 dark:text-emerald-400"
                        : isExpense(e.category)
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-foreground",
                    )}
                  >
                    {isIncome(e.category) ? "+" : isExpense(e.category) ? "−" : ""}
                    {brl(e.amount)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    {/* Lançamento de comanda só muda reabrindo a comanda. */}
                    {e.comandaId ? (
                      <span className="text-xs text-muted-foreground">automático</span>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => setEditing(e)}
                          className="p-1.5 text-muted-foreground hover:text-parchment"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Excluir"
                          onClick={() => setToDelete(e)}
                          className="p-1.5 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {query.data && query.data.meta.pages > 1 && (
        <div className="flex items-center justify-between pt-1 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-muted-foreground">
            {page} / {query.data.meta.pages} · {query.data.meta.total} lançamento(s)
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= query.data.meta.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      <EntryForm
        open={creating || !!editing}
        entry={editing}
        clients={clientItems}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Ele sai do fluxo de caixa. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && remove.mutate(toDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value?: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <Card className="flex items-center justify-between border-border bg-card/60 p-4">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("mt-0.5 font-serif text-xl", tone)}>
          {value == null ? "—" : brl(value)}
        </p>
      </div>
      <span className={cn("opacity-70", tone)}>{icon}</span>
    </Card>
  );
}

/** Formulário de criação e edição (a mesma folha, como no sistema antigo). */
function EntryForm({
  open,
  entry,
  clients,
  onClose,
}: {
  open: boolean;
  entry: Entry | null;
  clients: ComboItem[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [source, setSource] = useState(""); // accountId ou "below:CATEGORY"
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setSource(
      entry
        ? (entry.accountId ?? `below:${entry.category}`)
        : "",
    );
    setDate(
      entry
        ? formatInTimeZone(new Date(entry.date), "UTC", "yyyy-MM-dd")
        : formatInTimeZone(new Date(), "America/Sao_Paulo", "yyyy-MM-dd"),
    );
    setAmount(entry ? entry.amount : "");
    setClientId(entry?.clientId ?? "");
    setDescription(entry?.description ?? "");
  }, [open, entry]);

  const accounts = useQuery({
    queryKey: ["accounts"],
    queryFn: () => apiFetch<Account[]>("/financial/accounts"),
    retry: false,
    enabled: open,
  });

  // Contas agrupadas por tipo + as movimentações abaixo da linha, num único
  // seletor com busca (o antigo tinha um campo "pesquisar categoria").
  const sourceItems: ComboItem[] = [
    ...ACCOUNT_CATEGORIES.flatMap((cat) =>
      (accounts.data ?? [])
        .filter((a) => a.category === cat)
        .map((a) => ({ value: a.id, label: a.name, hint: CATEGORY_LABEL[cat] })),
    ),
    ...BELOW_LINE_CATEGORIES.map((c) => ({
      value: `below:${c}`,
      label: CATEGORY_LABEL[c],
      hint: "Movimentação",
    })),
  ];

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        date,
        amount: Number(amount),
        clientId: clientId || null,
        description: description || undefined,
      };
      if (source.startsWith("below:")) {
        body.category = source.slice(6);
        body.accountId = undefined;
      } else {
        body.accountId = source;
      }
      return entry
        ? apiFetch(`/financial/entries/${entry.id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          })
        : apiFetch("/financial/entries", {
            method: "POST",
            body: JSON.stringify(body),
          });
    },
    onSuccess: () => {
      toast.success(entry ? "Lançamento atualizado ✦" : "Lançamento registrado ✦");
      void qc.invalidateQueries({ queryKey: ["entries"] });
      void qc.invalidateQueries({ queryKey: ["cash-flow"] });
      void qc.invalidateQueries({ queryKey: ["goals"] });
      onClose();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível salvar"),
  });

  function submit() {
    if (!source) return toast.error("Escolha a conta ou movimentação");
    if (!date) return toast.error("Informe a data");
    if (!amount || Number(amount) <= 0) return toast.error("Valor inválido");
    save.mutate();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl text-parchment">
            {entry ? "Editar lançamento" : "Novo lançamento"}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-1.5">
            <Label>Conta / movimentação</Label>
            <Combobox
              items={sourceItems}
              value={source}
              onChange={setSource}
              placeholder="Selecione"
              searchPlaceholder="Buscar conta..."
              className="h-11 w-full"
            />
            {sourceItems.length === BELOW_LINE_CATEGORIES.length && (
              <p className="text-xs text-muted-foreground">
                Cadastre contas na aba "Contas".
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Cliente (opcional)</Label>
            <Combobox
              items={[{ value: "", label: "Nenhum cliente" }, ...clients]}
              value={clientId}
              onChange={setClientId}
              placeholder="Nenhum cliente"
              searchPlaceholder="Buscar cliente..."
              className="h-11 w-full"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição (opcional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-11"
              placeholder="ex.: Pix - Gleice"
            />
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
