import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { toast } from "sonner";
import { ShoppingBag } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { apiFetch, ApiError } from "@/lib/api";

export const Route = createFileRoute("/menu/comandas/")({
  component: ComandasPage,
});

const TZ = "America/Sao_Paulo";
const brl = (v: string | number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface ComandaItem {
  id: string;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
  total: string | null;
  amountDue: string | null;
  client: { fullName: string } | null;
  appointment: {
    startTime: string;
    professional: { fullName: string } | null;
  } | null;
}
interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; pages: number };
}

function ComandasPage() {
  return (
    <AppShell>
      <Comandas />
    </AppShell>
  );
}

function Comandas() {
  const [status, setStatus] = useState<"OPEN" | "CLOSED">("OPEN");
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["comandas", status],
    queryFn: () =>
      apiFetch<Paginated<ComandaItem>>(`/comandas?status=${status}&limit=50`),
    retry: false,
  });

  const newSale = useMutation({
    mutationFn: () =>
      apiFetch<{ id: string }>("/comandas/sale", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSuccess: (c) => navigate({ to: "/menu/comandas/$id", params: { id: c.id } }),
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível abrir a venda"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.4em] text-blood">
            Operação
          </p>
          <h1 className="mt-1 font-serif text-3xl text-parchment">Comandas</h1>
        </div>
        <Button
          className="gap-2"
          disabled={newSale.isPending}
          onClick={() => newSale.mutate()}
        >
          <ShoppingBag className="h-4 w-4" /> Nova venda
        </Button>
      </div>

      <div className="flex rounded-md border border-border p-0.5">
        <Tab active={status === "OPEN"} onClick={() => setStatus("OPEN")}>
          Abertas
        </Tab>
        <Tab active={status === "CLOSED"} onClick={() => setStatus("CLOSED")}>
          Fechadas
        </Tab>
      </div>

      <p className="text-xs text-muted-foreground">
        Comanda de atendimento: toque num agendamento na Agenda → "Abrir comanda".
        Venda de balcão: use "Nova venda" acima.
      </p>

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
          {status === "OPEN" ? "Nenhuma comanda aberta." : "Nenhuma comanda fechada."}
        </Card>
      ) : (
        <div className="space-y-2">
          {query.data!.data.map((c) => (
            <Link
              key={c.id}
              to="/menu/comandas/$id"
              params={{ id: c.id }}
              className="block"
            >
              <Card className="flex items-center gap-3 border-border bg-card/60 p-3 transition-colors hover:border-blood/50">
                <span
                  className={cn(
                    "h-9 w-1 shrink-0 rounded-full",
                    c.status === "OPEN" ? "bg-emerald-400" : "bg-muted-foreground/40",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-parchment">
                    {c.client?.fullName ?? "Cliente"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatInTimeZone(new Date(c.openedAt), TZ, "dd/MM HH:mm")}
                    {c.appointment?.professional
                      ? ` · ${c.appointment.professional.fullName}`
                      : " · Venda"}
                  </p>
                </div>
                {(c.amountDue ?? c.total) && (
                  <span className="shrink-0 text-sm text-parchment">
                    {brl(c.amountDue ?? c.total!)}
                  </span>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Tab({
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
