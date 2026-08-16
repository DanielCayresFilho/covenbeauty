import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Check, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { brl, type CashFlowCategory } from "./constants";

interface FixedExpense {
  id: string;
  name: string;
  amount: string;
  dueDay: number;
  description: string | null;
  accountId: string | null;
  nextDueDate: string; // YYYY-MM-DD
  daysUntilDue: number;
  overdue: boolean;
  paidThisMonth: boolean;
}
interface Account {
  id: string;
  name: string;
  category: CashFlowCategory;
}

const fmtDue = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

/** Texto e cor do prazo — vermelho quando atrasa, âmbar na reta final. */
function dueLabel(e: FixedExpense) {
  if (e.paidThisMonth)
    return { text: "Pago neste mês", tone: "text-emerald-600 dark:text-emerald-400" };
  if (e.overdue)
    return { text: "Vencida", tone: "text-rose-600 dark:text-rose-400" };
  if (e.daysUntilDue === 0)
    return { text: "Vence hoje", tone: "text-rose-600 dark:text-rose-400" };
  if (e.daysUntilDue <= 7)
    return {
      text: `Vence em ${e.daysUntilDue} dia(s)`,
      tone: "text-amber-600 dark:text-amber-400",
    };
  return {
    text: `Vence em ${e.daysUntilDue} dia(s)`,
    tone: "text-muted-foreground",
  };
}

export function FixedExpensesTab() {
  const qc = useQueryClient();
  const fmt = useMaskedMoney(brl);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<FixedExpense | null>(null);
  const [toDelete, setToDelete] = useState<FixedExpense | null>(null);
  const [toPay, setToPay] = useState<FixedExpense | null>(null);

  const query = useQuery({
    queryKey: ["fixed-expenses"],
    queryFn: () => apiFetch<FixedExpense[]>("/financial/fixed-expenses"),
    retry: false,
  });

  const pay = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/financial/fixed-expenses/${id}/pay`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      toast.success("Pagamento lançado no fluxo ✦");
      void qc.invalidateQueries({ queryKey: ["fixed-expenses"] });
      void qc.invalidateQueries({ queryKey: ["entries"] });
      void qc.invalidateQueries({ queryKey: ["cash-flow"] });
      setToPay(null);
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível pagar"),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/financial/fixed-expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Despesa desativada");
      void qc.invalidateQueries({ queryKey: ["fixed-expenses"] });
      setToDelete(null);
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível remover"),
  });

  const expenses = query.data ?? [];
  const monthlyTotal = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const pending = expenses.filter((e) => !e.paidThisMonth);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="border-border bg-card/60 p-4">
          <p className="text-xs text-muted-foreground">Total mensal</p>
          <p className="mt-0.5 font-serif text-xl text-sky-600 dark:text-sky-400">
            {fmt(monthlyTotal)}
          </p>
        </Card>
        <Card className="flex items-center justify-between border-border bg-card/60 p-4">
          <div>
            <p className="text-xs text-muted-foreground">A pagar neste mês</p>
            <p className="mt-0.5 font-serif text-xl text-parchment">
              {pending.length} de {expenses.length}
            </p>
          </div>
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
        </Card>
      </div>

      <div className="flex justify-end">
        <Button className="gap-1" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Despesa fixa
        </Button>
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <Card className="border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
          Não foi possível carregar. Verifique se o servidor está no ar.
        </Card>
      ) : expenses.length === 0 ? (
        <Card className="border-dashed border-border bg-transparent p-8 text-center text-sm text-muted-foreground">
          Nenhuma despesa fixa cadastrada. Aluguel, energia, internet, softwares…
        </Card>
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => {
            const due = dueLabel(e);
            return (
              <Card
                key={e.id}
                className="flex flex-wrap items-center gap-3 border-border bg-card/60 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-parchment">{e.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Todo dia {e.dueDay} · próximo {fmtDue(e.nextDueDate)}
                    {e.description ? ` · ${e.description}` : ""}
                  </p>
                </div>

                <span className={cn("shrink-0 text-xs", due.tone)}>{due.text}</span>

                <span className="shrink-0 text-sm font-medium text-sky-600 dark:text-sky-400">
                  {fmt(e.amount)}
                </span>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant={e.paidThisMonth ? "outline" : "default"}
                    disabled={e.paidThisMonth || pay.isPending}
                    onClick={() => setToPay(e)}
                    className="gap-1"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {e.paidThisMonth ? "Pago" : "Pagar"}
                  </Button>
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
                    title="Desativar"
                    onClick={() => setToDelete(e)}
                    className="p-1.5 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ExpenseForm
        open={creating || !!editing}
        expense={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <AlertDialog open={!!toPay} onOpenChange={(o) => !o && setToPay(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pagar "{toPay?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Lança {toPay ? fmt(toPay.amount) : ""} como despesa fixa no fluxo de
              caixa, com a data de hoje.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toPay && pay.mutate(toPay.id)}>
              Confirmar pagamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar "{toDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Ela sai da lista, mas os pagamentos já lançados continuam no fluxo
              de caixa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && remove.mutate(toDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ExpenseForm({
  open,
  expense,
  onClose,
}: {
  open: boolean;
  expense: FixedExpense | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(expense?.name ?? "");
    setAmount(expense?.amount ?? "");
    setDueDay(expense ? String(expense.dueDay) : "");
    setAccountId(expense?.accountId ?? "");
    setDescription(expense?.description ?? "");
  }, [open, expense]);

  // Só contas de despesa fixa podem receber o pagamento.
  const accounts = useQuery({
    queryKey: ["accounts", "FIXED_EXPENSE"],
    queryFn: () =>
      apiFetch<Account[]>("/financial/accounts?category=FIXED_EXPENSE"),
    retry: false,
    enabled: open,
  });

  const accountItems: ComboItem[] = [
    { value: "", label: 'Padrão ("Contas Fixas")' },
    ...(accounts.data ?? []).map((a) => ({ value: a.id, label: a.name })),
  ];

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name,
        amount: Number(amount),
        dueDay: Number(dueDay),
        accountId: accountId || undefined,
        description: description || undefined,
      };
      return expense
        ? apiFetch(`/financial/fixed-expenses/${expense.id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          })
        : apiFetch("/financial/fixed-expenses", {
            method: "POST",
            body: JSON.stringify(body),
          });
    },
    onSuccess: () => {
      toast.success(expense ? "Despesa atualizada ✦" : "Despesa cadastrada ✦");
      void qc.invalidateQueries({ queryKey: ["fixed-expenses"] });
      onClose();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível salvar"),
  });

  function submit() {
    if (name.trim().length < 2) return toast.error("Informe o nome da despesa");
    if (!amount || Number(amount) <= 0) return toast.error("Valor inválido");
    const day = Number(dueDay);
    if (!Number.isInteger(day) || day < 1 || day > 31)
      return toast.error("Dia do vencimento vai de 1 a 31");
    save.mutate();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl text-parchment">
            {expense ? "Editar despesa fixa" : "Nova despesa fixa"}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
              placeholder="ex.: Aluguel"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label>Dia do vencimento</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="h-11"
                placeholder="10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Conta do fluxo</Label>
            <Combobox
              items={accountItems}
              value={accountId}
              onChange={setAccountId}
              placeholder='Padrão ("Contas Fixas")'
              searchPlaceholder="Buscar conta..."
              className="h-11 w-full"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Observação (opcional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-11"
              placeholder="ex.: boleto chega por e-mail"
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
