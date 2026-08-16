import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useHiddenValues } from "@/lib/hidden-values";

/** Liga/desliga a máscara nos valores em dinheiro (fica salvo no navegador). */
export function HideValuesButton({ className }: { className?: string }) {
  const { hidden, toggle } = useHiddenValues();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      className={className}
      aria-pressed={hidden}
      title={hidden ? "Mostrar valores" : "Esconder valores"}
    >
      {hidden ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
      <span className="ml-1.5 hidden sm:inline">
        {hidden ? "Mostrar valores" : "Esconder valores"}
      </span>
    </Button>
  );
}
