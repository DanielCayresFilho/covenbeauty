import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EvaluationForm } from "@/components/evaluations/evaluation-form";

export const Route = createFileRoute("/menu/clientes/$id/fichas/nova")({
  component: NovaFichaPage,
});

function NovaFichaPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const back = () =>
    navigate({ to: "/menu/clientes/$id/fichas", params: { id } });

  return (
    <AppShell>
      <div className="space-y-4">
        <button
          onClick={back}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-parchment"
        >
          <ArrowLeft className="h-4 w-4" /> Fichas
        </button>
        <h1 className="font-serif text-2xl text-parchment">Nova ficha</h1>
        <EvaluationForm clientId={id} evaluation={null} onSaved={back} />
      </div>
    </AppShell>
  );
}
