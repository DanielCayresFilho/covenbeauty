import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { MONTHS, money } from "./constants";

interface MonthRow {
  month: number;
  saldoInicial: string;
  entradas: string;
  saidas: string;
  custosVariaveis: string;
  despesasFixas: string;
  proLabore: string;
  investimentos: string;
  lucroLiquido: string;
  margemLucroLiquido: number | null;
  distribuicaoLucros: string;
  aplicacao: string;
  resgate: string;
  saldoFinal: string;
}
interface CashFlow {
  year: number;
  openingBalance: string;
  months: MonthRow[];
  total: Omit<MonthRow, "month" | "saldoInicial">;
}

type RowKey = keyof Omit<MonthRow, "month" | "margemLucroLiquido">;
interface RowDef {
  key: RowKey | "margemLucroLiquido";
  label: string;
  indent?: boolean;
  emphasis?: "profit" | "balance";
  percent?: boolean;
}

const ROWS: RowDef[] = [
  { key: "saldoInicial", label: "Saldo Inicial", emphasis: "balance" },
  { key: "entradas", label: "Entradas de Dinheiro" },
  { key: "saidas", label: "Saídas de Dinheiro" },
  { key: "custosVariaveis", label: "Custos Variáveis", indent: true },
  { key: "despesasFixas", label: "Despesas Fixas", indent: true },
  { key: "proLabore", label: "Pró-labore", indent: true },
  { key: "investimentos", label: "Investimentos", indent: true },
  { key: "lucroLiquido", label: "Lucro Líquido", emphasis: "profit" },
  { key: "margemLucroLiquido", label: "Margem de Lucro %", percent: true },
  { key: "distribuicaoLucros", label: "Distribuição de Lucros" },
  { key: "aplicacao", label: "Aplicação" },
  { key: "resgate", label: "Resgate" },
  { key: "saldoFinal", label: "Saldo Final", emphasis: "balance" },
];

const fmtCell = (row: RowDef, value: string | number | null) => {
  if (row.percent) {
    return value == null
      ? "—"
      : `${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`;
  }
  return money(value as string);
};

export function CashFlowTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [openingInput, setOpeningInput] = useState("0");
  const [opening, setOpening] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setOpening(Number(openingInput) || 0), 400);
    return () => clearTimeout(t);
  }, [openingInput]);

  const query = useQuery({
    queryKey: ["cash-flow", year, opening],
    queryFn: () =>
      apiFetch<CashFlow>(
        `/financial/reports/cash-flow?year=${year}&openingBalance=${opening}`,
      ),
    retry: false,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-16 text-center font-serif text-xl text-parchment">
            {year}
          </span>
          <Button variant="outline" size="icon" onClick={() => setYear((y) => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Saldo inicial de janeiro (R$)</Label>
          <Input
            type="number"
            step="0.01"
            value={openingInput}
            onChange={(e) => setOpeningInput(e.target.value)}
            className="h-9 w-40"
          />
        </div>
      </div>

      <p className="text-[0.7rem] text-muted-foreground">
        Valores em R$. Arraste a tabela para o lado para ver todos os meses.
      </p>

      {query.isLoading ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : query.isError ? (
        <Card className="border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
          Não foi possível carregar. Verifique se o servidor está no ar.
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-right text-[0.82rem]">
            <thead>
              <tr className="bg-secondary">
                <th className="sticky left-0 z-10 min-w-44 bg-secondary px-3 py-2.5 text-left font-semibold text-foreground">
                  Linha
                </th>
                {MONTHS.map((m) => (
                  <th key={m} className="min-w-[5.5rem] px-3 py-2.5 font-semibold text-muted-foreground">
                    {m}
                  </th>
                ))}
                <th className="min-w-24 bg-primary/15 px-3 py-2.5 font-semibold text-primary">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                // Fundos SÓLIDOS (a 1ª coluna é fixa; transparência vazaria ao rolar).
                const stickyBg = row.emphasis ? "bg-secondary" : "bg-card";
                const rowBg = row.emphasis ? "bg-secondary" : "bg-background";
                const valCls =
                  row.emphasis === "profit"
                    ? "font-semibold text-primary"
                    : row.emphasis === "balance"
                      ? "font-semibold text-foreground"
                      : "text-foreground/90";
                return (
                  <tr key={row.key} className={cn("border-t border-border", rowBg)}>
                    <td
                      className={cn(
                        "sticky left-0 z-10 px-3 py-2.5 text-left",
                        stickyBg,
                        row.indent ? "pl-6 text-muted-foreground" : "text-foreground",
                        row.emphasis && "font-semibold",
                      )}
                    >
                      {row.label}
                    </td>
                    {query.data!.months.map((mo) => (
                      <td key={mo.month} className={cn("px-3 py-2.5", valCls)}>
                        {fmtCell(row, mo[row.key as keyof MonthRow] as string | number | null)}
                      </td>
                    ))}
                    <td className={cn("px-3 py-2.5 font-medium", valCls)}>
                      {row.key === "saldoInicial"
                        ? "—"
                        : fmtCell(
                            row,
                            query.data!.total[
                              row.key as keyof CashFlow["total"]
                            ] as string | number | null,
                          )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
