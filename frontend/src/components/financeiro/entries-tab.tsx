import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Combobox, type ComboItem } from "@/components/ui/combobox";
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
import { useMaskedMoney } from "@/lib/hidden-values";
import {
  BELOW_LINE_CATEGORIES,
  CATEGORY_LABEL,
  brl,
  type CashFlowCategory,
} from "./constants";

/** Grupo da aba. Espelha o `kind` aceito pelo backend. */
type Kind = "income" | "expense" | "movement";

/** Contas que cada aba oferece no formulário. */
const KIND_ACCOUNT_CATEGORIES: Record<Kind, CashFlowCategory[]> = {
  income: ["INCOME"],
  expense: ["VARIABLE_COST", "FIXED_EXPENSE", "PRO_LABORE", "INVESTMENT"],
  movement: [],
};

const KIND_LABEL: Record<Kind, { tab: string; novo: string; vazio: string }> = {
  income: {
    tab: "Entradas",
    novo: "Entrada",
    vazio: "Nenhuma entrada lançada ainda.",
  },
  expense: {
    tab: "Saídas",
    novo: "Saída",
    vazio: "Nenhuma saída lançada ainda.",
  },
  movement: {
    tab: "Movimentações",
    novo: "Movimentação",
    vazio: "Nenhuma distribuição, aplicação ou resgate lançado ainda.",
  },
};

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
  description: string | null;
}
interface Totals {
  entradas: string;
  saidas: string;
  proLabore: string;
  lucro: string;
  distribuicao: string;
  aplicacao: string;
  resgate: string;
}
interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; pages: number; totals: Totals };
}

const fmtDate = (iso: string) =>
  formatInTimeZone(new Date(iso), "UTC", "dd/MM/yyyy", { locale: ptBR });

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

interface Filters {
  from: string;
  to: string;
  clientId: string;
}
const EMPTY_FILTERS: Filters = { from: "", to: "", clientId: "" };

/**
 * Lançamentos separados por natureza — entradas, saídas e movimentações em
 * abas próprias, como eram as telas "Entradas Analíticas" e "Saídas
 * Analíticas" do sistema antigo.
 */
export function EntriesTab() {
  return (
    <Tabs defaultValue="income" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="income" className="gap-1.5">
          <ArrowUpRight className="h-4 w-4" /> Entradas
        </TabsTrigger>
        <TabsTrigger value="expense" className="gap-1.5">
          <ArrowDownRight className="h-4 w-4" /> Saídas
        </TabsTrigger>
        <TabsTrigger value="movement" className="gap-1.5">
          <ArrowLeftRight className="h-4 w-4" /> Movimentações
        </TabsTrigger>
      </TabsList>

      <TabsContent value="income" className="cb-fade-in">
        <EntryList kind="income" />
      </TabsContent>
      <TabsContent value="expense" className="cb-fade-in">
        <EntryList kind="expense" />
      </TabsContent>
      <TabsContent value="movement" className="cb-fade-in">
        <EntryList kind="movement" />
      </TabsContent>
    </Tabs>
  );
}

function EntryList({ kind }: { kind: Kind }) {
  const qc = useQueryClient();
  const fmt = useMaskedMoney(brl);
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
    const q = new URLSearchParams({ kind, page: String(page), limit: "20" });
    if (filters.from) q.set("from", filters.from);
    if (filters.to) q.set("to", filters.to);
    if (filters.clientId) q.set("clientId", filters.clientId);
    return q.toString();
  }, [kind, page, filters]);

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
  const labels = KIND_LABEL[kind];

  // Cada aba resume o que é seu — o pró-labore aparece separado das despesas
  // porque no fluxo ele não entra nas saídas.
  const cards =
    kind === "income"
      ? [{ label: "Total de entradas", value: totals?.entradas, tone: TONE.INCOME }]
      : kind === "expense"
        ? [
            { label: "Custos e despesas", value: totals?.saidas, tone: "text-rose-600 dark:text-rose-400" },
            { label: "Pró-labore", value: totals?.proLabore, tone: TONE.PRO_LABORE },
          ]
        : [
            { label: "Distribuição", value: totals?.distribuicao, tone: "text-foreground" },
            { label: "Aplicação", value: totals?.aplicacao, tone: "text-foreground" },
            { label: "Resgate", value: totals?.resgate, tone: "text-foreground" },
          ];

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "grid grid-cols-1 gap-3",
          cards.length === 2 && "sm:grid-cols-2",
          cards.length === 3 && "sm:grid-cols-3",
        )}
      >
        {cards.map((c) => (
          <Card
            key={c.label}
            className="flex items-center justify-between border-border bg-card/60 p-4"
          >
            <div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className={cn("mt-0.5 font-serif text-xl", c.tone)}>
                {c.value == null ? "—" : fmt(c.value)}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card/60 p-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
            <Plus className="h-4 w-4" /> {labels.novo}
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
          {hasFilters ? "Nenhum lançamento com esses filtros." : labels.vazio}
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">Data</th>
                <th className="px-3 py-2.5 text-left font-semibold">
                  {kind === "movement" ? "Movimentação" : "Conta"}
                </th>
                {kind !== "movement" && (
                  <th className="px-3 py-2.5 text-left font-semibold">Tipo</th>
                )}
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
                    {e.account?.name ?? CATEGORY_LABEL[e.category]}
                  </td>
                  {kind !== "movement" && (
                    <td
                      className={cn(
                        "whitespace-nowrap px-3 py-2.5 text-xs",
                        TONE[e.category],
                      )}
                    >
                      {CATEGORY_LABEL[e.category]}
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {e.client?.fullName ?? "—"}
                  </td>
                  <td className="max-w-56 truncate px-3 py-2.5 text-muted-foreground">
                    {e.description ?? "—"}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-2.5 text-right font-medium",
                      kind === "income"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : kind === "expense"
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-foreground",
                    )}
                  >
                    {kind === "income" ? "+" : kind === "expense" ? "−" : ""}
                    {fmt(e.amount)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
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
        kind={kind}
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

/** Formulário de criação e edição, já restrito às contas da aba. */
function EntryForm({
  kind,
  open,
  entry,
  clients,
  onClose,
}: {
  kind: Kind;
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
    setSource(entry ? (entry.accountId ?? `below:${entry.category}`) : "");
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

  const allowed = KIND_ACCOUNT_CATEGORIES[kind];
  const sourceItems: ComboItem[] =
    kind === "movement"
      ? BELOW_LINE_CATEGORIES.map((c) => ({
          value: `below:${c}`,
          label: CATEGORY_LABEL[c],
        }))
      : allowed.flatMap((cat) =>
          (accounts.data ?? [])
            .filter((a) => a.category === cat)
            .map((a) => ({
              value: a.id,
              label: a.name,
              // Numa aba com um tipo só, repetir o rótulo seria ruído.
              hint: allowed.length > 1 ? CATEGORY_LABEL[cat] : undefined,
            })),
        );

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        date,
        amount: Number(amount),
        clientId: clientId || null,
        description: description || undefined,
      };
      if (source.startsWith("below:")) body.category = source.slice(6);
      else body.accountId = source;

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
    if (!source) return toast.error("Escolha a conta");
    if (!date) return toast.error("Informe a data");
    if (!amount || Number(amount) <= 0) return toast.error("Valor inválido");
    save.mutate();
  }

  const labels = KIND_LABEL[kind];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl text-parchment">
            {entry ? `Editar ${labels.novo.toLowerCase()}` : `Nova ${labels.novo.toLowerCase()}`}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-1.5">
            <Label>{kind === "movement" ? "Movimentação" : "Conta"}</Label>
            <Combobox
              items={sourceItems}
              value={source}
              onChange={setSource}
              placeholder="Selecione"
              searchPlaceholder="Buscar..."
              className="h-11 w-full"
            />
            {kind !== "movement" && sourceItems.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhuma conta deste tipo. Cadastre na aba "Contas".
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
          <p className="text-xs text-muted-foreground">
            A data pode ser de qualquer dia — use para lançar movimentos de meses
            anteriores.
          </p>

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
