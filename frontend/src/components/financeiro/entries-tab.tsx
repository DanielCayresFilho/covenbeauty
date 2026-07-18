import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
interface Entry {
  id: string;
  date: string;
  category: CashFlowCategory;
  amount: string;
  accountId: string | null;
  account: { id: string; name: string } | null;
  description: string | null;
}
interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; pages: number };
}

const fmtDate = (iso: string) =>
  formatInTimeZone(new Date(iso), "UTC", "dd/MM/yyyy", { locale: ptBR });
const isIncome = (c: CashFlowCategory) => c === "INCOME";
const isExpense = (c: CashFlowCategory) =>
  ["VARIABLE_COST", "FIXED_EXPENSE", "PRO_LABORE", "INVESTMENT"].includes(c);

export function EntriesTab() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Entry | null>(null);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["entries", page],
    queryFn: () =>
      apiFetch<Paginated<Entry>>(`/financial/entries?page=${page}&limit=20`),
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-1" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Lançamento
        </Button>
      </div>

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
          Nenhum lançamento ainda.
        </Card>
      ) : (
        <div className="space-y-2">
          {query.data!.data.map((e) => (
            <Card key={e.id} className="flex items-center gap-3 border-border bg-card/60 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-parchment">
                  {e.account?.name ?? CATEGORY_LABEL[e.category]}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {fmtDate(e.date)}
                  {e.description ? ` · ${e.description}` : ""}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 text-sm",
                  isIncome(e.category)
                    ? "text-emerald-400"
                    : isExpense(e.category)
                      ? "text-destructive"
                      : "text-parchment",
                )}
              >
                {isIncome(e.category) ? "+" : isExpense(e.category) ? "−" : ""}
                {brl(e.amount)}
              </span>
              <button
                type="button"
                onClick={() => setToDelete(e)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      {query.data && query.data.meta.pages > 1 && (
        <div className="flex items-center justify-between pt-1 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-muted-foreground">
            {page} / {query.data.meta.pages}
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

      <EntryForm open={open} onClose={() => setOpen(false)} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover lançamento?</AlertDialogTitle>
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

function EntryForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [source, setSource] = useState(""); // accountId ou "below:CATEGORY"
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setSource("");
    setAmount("");
    setDescription("");
    setDate(formatInTimeZone(new Date(), "America/Sao_Paulo", "yyyy-MM-dd"));
  }, [open]);

  const accounts = useQuery({
    queryKey: ["accounts"],
    queryFn: () => apiFetch<Account[]>("/financial/accounts"),
    retry: false,
    enabled: open,
  });

  const grouped = ACCOUNT_CATEGORIES.map((cat) => ({
    cat,
    items: (accounts.data ?? []).filter((a) => a.category === cat),
  })).filter((g) => g.items.length > 0);

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        date,
        amount: Number(amount),
        description: description || undefined,
      };
      if (source.startsWith("below:")) {
        body.category = source.slice(6);
      } else {
        body.accountId = source;
      }
      return apiFetch("/financial/entries", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      toast.success("Lançamento registrado ✦");
      void qc.invalidateQueries({ queryKey: ["entries"] });
      void qc.invalidateQueries({ queryKey: ["cash-flow"] });
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
            Novo lançamento
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-1.5">
            <Label>Conta / movimentação</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {grouped.map((g) => (
                  <SelectGroup key={g.cat}>
                    <SelectLabel>{CATEGORY_LABEL[g.cat]}</SelectLabel>
                    {g.items.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
                <SelectGroup>
                  <SelectLabel>Movimentações</SelectLabel>
                  {BELOW_LINE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={`below:${c}`}>
                      {CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {grouped.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Cadastre contas na aba "Plano de Contas".
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
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
            <Label>Descrição (opcional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-11" placeholder="ex.: Pix - Gleice" />
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
