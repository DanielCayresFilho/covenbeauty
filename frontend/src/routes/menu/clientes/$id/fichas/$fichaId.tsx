import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  EvaluationForm,
  type EvaluationData,
} from "@/components/evaluations/evaluation-form";
import { EvaluationPhotos } from "@/components/evaluations/evaluation-photos";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/menu/clientes/$id/fichas/$fichaId")({
  component: FichaDetailPage,
});

function FichaDetailPage() {
  const { id, fichaId } = Route.useParams();
  const navigate = useNavigate();
  const back = () =>
    navigate({ to: "/menu/clientes/$id/fichas", params: { id } });

  const query = useQuery({
    queryKey: ["evaluation", fichaId],
    queryFn: () => apiFetch<EvaluationData>(`/evaluations/${fichaId}`),
    retry: false,
  });

  return (
    <AppShell>
      <div className="space-y-4">
        <button
          onClick={back}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-parchment"
        >
          <ArrowLeft className="h-4 w-4" /> Fichas
        </button>
        <h1 className="font-serif text-2xl text-parchment">Ficha de avaliação</h1>

        {query.isLoading ? (
          <Skeleton className="h-96 rounded-lg" />
        ) : query.isError || !query.data ? (
          <Card className="border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
            Não foi possível carregar a ficha.
          </Card>
        ) : (
          <>
            <EvaluationPhotos evaluationId={fichaId} />
            <EvaluationForm clientId={id} evaluation={query.data} onSaved={back} />
          </>
        )}
      </div>
    </AppShell>
  );
}
