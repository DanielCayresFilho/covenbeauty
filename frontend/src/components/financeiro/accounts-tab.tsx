import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  ACCOUNT_CATEGORIES,
  CATEGORY_LABEL,
  type CashFlowCategory,
} from "./constants";

interface Account {
  id: string;
  name: string;
  category: CashFlowCategory;
  procedureId: string | null;
}

/** Cor de cada grupo — a mesma da planilha do fluxo. */
const GROUP_TONE: Record<string, string> = {
  INCOME: "text-emerald-600 dark:text-emerald-400",
  VARIABLE_COST: "text-orange-600 dark:text-orange-400",
  FIXED_EXPENSE: "text-sky-600 dark:text-sky-400",
  PRO_LABORE: "text-amber-600 dark:text-amber-400",
  INVESTMENT: "text-violet-600 dark:text-violet-400",
};

export function AccountsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Account | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Account | null>(null);

  const query = useQuery({
    queryKey: ["accounts"],
    queryFn: () => apiFetch<Account[]>("/financial/accounts"),
    retry: false,
  });

  const sync = useMutation({
    mutationFn: () =>
      apiFetch<{ created: number }>("/financial/accounts/sync-procedures", {
        method: "POST",
      }),
    onSuccess: (r) => {
      toast.success(
        r.created > 0
          ? `${r.created} conta(s) de entrada criada(s)`
          : "Todos os procedimentos já têm conta",
      );
      void qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Falha ao sincronizar"),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/financial/accounts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Conta removida");
      void qc.invalidateQueries({ queryKey: ["accounts"] });
      setToDelete(null);
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível remover"),
  });

  const groups = ACCOUNT_CATEGORIES.map((cat) => ({
    cat,
    items: (query.data ?? []).filter((a) => a.category === cat),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          className="gap-1"
          disabled={sync.isPending}
          onClick={() => sync.mutate()}
        >
          <RefreshCw className="h-4 w-4" /> Sincronizar procedimentos
        </Button>
        <Button className="gap-1" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Conta
        </Button>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : query.isError ? (
        <Card className="border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
          Não foi possível carregar. Verifique se o servidor está no ar.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {groups.map((g) => (
            <Card key={g.cat} className="border-border bg-card/60 p-4">
              <p className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em]">
                <span className={GROUP_TONE[g.cat]}>{CATEGORY_LABEL[g.cat]}</span>
                <span className="text-muted-foreground">
                  {g.items.length} {g.items.length === 1 ? "conta" : "contas"}
                </span>
              </p>
              {g.items.length === 0 ? (
                <p className="text-xs text-muted-foreground">— nenhuma —</p>
              ) : (
                <div className="space-y-1.5">
                  {g.items.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5"
                    >
                      <span className="min-w-0 truncate text-sm text-parchment">
                        {a.name}
                        {a.procedureId && (
                          <span className="ml-2 text-[0.65rem] text-muted-foreground">
                            (procedimento)
                          </span>
                        )}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          title="Renomear"
                          onClick={() => setEditing(a)}
                          className="p-1 text-muted-foreground hover:text-parchment"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Excluir"
                          onClick={() => setToDelete(a)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <AccountForm
        open={creating || !!editing}
        account={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{toDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Contas com lançamentos não podem ser excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && remove.mutate(toDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AccountForm({
  open,
  account,
  onClose,
}: {
  open: boolean;
  account: Account | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CashFlowCategory | "">("");

  useEffect(() => {
    if (!open) return;
    setName(account?.name ?? "");
    setCategory(account?.category ?? "");
  }, [open, account]);

  const save = useMutation({
    mutationFn: () =>
      account
        ? // O tipo não muda depois de criada (mudaria a categoria dos lançamentos).
          apiFetch(`/financial/accounts/${account.id}`, {
            method: "PATCH",
            body: JSON.stringify({ name }),
          })
        : apiFetch("/financial/accounts", {
            method: "POST",
            body: JSON.stringify({ name, category }),
          }),
    onSuccess: () => {
      toast.success(account ? "Conta renomeada ✦" : "Conta criada ✦");
      void qc.invalidateQueries({ queryKey: ["accounts"] });
      void qc.invalidateQueries({ queryKey: ["cash-flow"] });
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
            {account ? "Renomear conta" : "Nova conta"}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
              placeholder="ex.: Materiais"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as CashFlowCategory)}
              disabled={!!account}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {account && (
              <p className="text-xs text-muted-foreground">
                O tipo não muda depois de criada — os lançamentos já feitos
                mudariam de lugar no fluxo.
              </p>
            )}
          </div>
          <SheetFooter className="px-0">
            <Button
              onClick={() => {
                if (name.trim().length < 2) return toast.error("Informe o nome");
                if (!account && !category) return toast.error("Selecione o tipo");
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
