import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw } from "lucide-react";

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

export function AccountsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

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
      toast.success(`${r.created} conta(s) de entrada criada(s)`);
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
      <div className="flex justify-end gap-2">
        <Button variant="outline" className="gap-1" disabled={sync.isPending} onClick={() => sync.mutate()}>
          <RefreshCw className="h-4 w-4" /> Sincronizar procedimentos
        </Button>
        <Button className="gap-1" onClick={() => setOpen(true)}>
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
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.cat}>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-blood">
                {CATEGORY_LABEL[g.cat]}
              </p>
              {g.items.length === 0 ? (
                <p className="text-xs text-muted-foreground">— nenhuma —</p>
              ) : (
                <div className="space-y-1.5">
                  {g.items.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-md border border-border p-2.5"
                    >
                      <span className="truncate text-sm text-parchment">
                        {a.name}
                        {a.procedureId && (
                          <span className="ml-2 text-[0.65rem] text-muted-foreground">
                            (procedimento)
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove.mutate(a.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AccountForm open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function AccountForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CashFlowCategory | "">("");

  const save = useMutation({
    mutationFn: () =>
      apiFetch("/financial/accounts", {
        method: "POST",
        body: JSON.stringify({ name, category }),
      }),
    onSuccess: () => {
      toast.success("Conta criada ✦");
      void qc.invalidateQueries({ queryKey: ["accounts"] });
      setName("");
      setCategory("");
      onClose();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível criar"),
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl text-parchment">
            Nova conta
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" placeholder="ex.: Materiais" />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as CashFlowCategory)}>
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
          </div>
          <SheetFooter className="px-0">
            <Button
              onClick={() => {
                if (name.trim().length < 2) return toast.error("Informe o nome");
                if (!category) return toast.error("Selecione o tipo");
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
