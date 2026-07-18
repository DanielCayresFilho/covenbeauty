import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Plus, FileText } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/menu/clientes/$id/fichas/")({
  component: FichasPage,
});

interface Client {
  id: string;
  fullName: string;
}
interface Evaluation {
  id: string;
  evaluationDate: string;
  focus: "FACIAL" | "CAPILLARY" | "BOTH";
}
interface Paginated<T> {
  data: T[];
}

const FOCUS_LABEL: Record<string, string> = {
  FACIAL: "Facial",
  CAPILLARY: "Capilar",
  BOTH: "Facial + Capilar",
};

function FichasPage() {
  return (
    <AppShell>
      <Fichas />
    </AppShell>
  );
}

function Fichas() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const client = useQuery({
    queryKey: ["client", id],
    queryFn: () => apiFetch<Client>(`/clients/${id}`),
    retry: false,
  });

  const evals = useQuery({
    queryKey: ["evaluations", id],
    queryFn: () =>
      apiFetch<Paginated<Evaluation>>(`/evaluations?clientId=${id}&limit=50`),
    retry: false,
  });

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate({ to: "/menu/clientes" })}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-parchment"
      >
        <ArrowLeft className="h-4 w-4" /> Clientes
      </button>

      <div className="flex items-start justify-between">
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.4em] text-blood">
            Fichas de avaliação
          </p>
          <h1 className="mt-1 font-serif text-2xl text-parchment">
            {client.data?.fullName ?? "Cliente"}
          </h1>
        </div>
        <Button
          className="gap-1"
          onClick={() =>
            navigate({ to: "/menu/clientes/$id/fichas/nova", params: { id } })
          }
        >
          <Plus className="h-4 w-4" /> Nova
        </Button>
      </div>

      {evals.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : evals.isError ? (
        <Card className="border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
          Não foi possível carregar. Verifique se o servidor está no ar.
        </Card>
      ) : evals.data!.data.length === 0 ? (
        <Card className="border-dashed border-border bg-transparent p-8 text-center text-sm text-muted-foreground">
          Nenhuma ficha ainda. Crie a primeira avaliação.
        </Card>
      ) : (
        <div className="space-y-2">
          {evals.data!.data.map((e) => (
            <Link
              key={e.id}
              to="/menu/clientes/$id/fichas/$fichaId"
              params={{ id, fichaId: e.id }}
              className="block"
            >
              <Card className="flex items-center gap-3 border-border bg-card/60 p-3 transition-colors hover:border-blood/50">
                <FileText className="h-5 w-5 shrink-0 text-blood" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-parchment">
                    {formatInTimeZone(new Date(e.evaluationDate), "UTC", "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {FOCUS_LABEL[e.focus]}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
