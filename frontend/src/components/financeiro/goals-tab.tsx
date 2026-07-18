import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { toast } from "sonner";
import { Plus, Trash2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { apiFetch, ApiError } from "@/lib/api";
import { brl } from "./constants";

interface Goal {
  id: string;
  name: string | null;
  startDate: string;
  endDate: string;
  targetAmount: string;
  progress: {
    achieved: string;
    target: string;
    remaining: string;
    percent: number;
    reached: boolean;
  };
}

const fmtDate = (iso: string) => formatInTimeZone(new Date(iso), "UTC", "dd/MM/yyyy");

export function GoalsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const query = useQuery({
    queryKey: ["goals"],
    queryFn: () => apiFetch<Goal[]>("/financial/goals"),
    retry: false,
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/financial/goals/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Meta removida");
      void qc.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível remover"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-1" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Meta
        </Button>
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <Card className="border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
          Não foi possível carregar. Verifique se o servidor está no ar.
        </Card>
      ) : query.data!.length === 0 ? (
        <Card className="border-dashed border-border bg-transparent p-8 text-center text-sm text-muted-foreground">
          Nenhuma meta ainda.
        </Card>
      ) : (
        <div className="space-y-3">
          {query.data!.map((g) => (
            <Card key={g.id} className="border-border bg-card/60 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm text-parchment">
                    {g.name || "Meta"}
                    {g.progress.reached && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> batida
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(g.startDate)} – {fmtDate(g.endDate)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove.mutate(g.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 space-y-1.5">
                <Progress value={Math.min(g.progress.percent, 100)} className="h-2" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-parchment">
                    {brl(g.progress.achieved)}{" "}
                    <span className="text-muted-foreground">/ {brl(g.progress.target)}</span>
                  </span>
                  <span className="text-blood">{g.progress.percent.toFixed(0)}%</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <GoalForm open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function GoalForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [target, setTarget] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setTarget("");
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(formatInTimeZone(first, "UTC", "yyyy-MM-dd"));
    setEndDate(formatInTimeZone(last, "UTC", "yyyy-MM-dd"));
  }, [open]);

  const save = useMutation({
    mutationFn: () =>
      apiFetch("/financial/goals", {
        method: "POST",
        body: JSON.stringify({
          name: name || undefined,
          startDate,
          endDate,
          targetAmount: Number(target),
        }),
      }),
    onSuccess: () => {
      toast.success("Meta criada ✦");
      void qc.invalidateQueries({ queryKey: ["goals"] });
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
            Nova meta
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-1.5">
            <Label>Nome (opcional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" placeholder="ex.: Meta de julho" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Valor-alvo de entradas (R$)</Label>
            <Input type="number" step="0.01" min="0" value={target} onChange={(e) => setTarget(e.target.value)} className="h-11" />
          </div>
          <SheetFooter className="px-0">
            <Button
              onClick={() => {
                if (!startDate || !endDate) return toast.error("Informe o período");
                if (!target || Number(target) <= 0) return toast.error("Valor-alvo inválido");
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
