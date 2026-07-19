import { Fragment, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { MONTHS, money } from "./constants";

interface MonthRow {
  month: number;
  saldoInicial: string;
  saldoInicialManual?: boolean;
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
interface AccountBreak {
  accountId: string;
  name: string;
  months: string[]; // 12 valores (toFixed 2)
  total: string;
}
interface CashFlow {
  year: number;
  openingBalance: string;
  months: MonthRow[];
  total: Omit<MonthRow, "month" | "saldoInicial">;
  breakdown: Record<string, AccountBreak[]>;
}

// Categorias que expandem para mostrar as contas (procedimentos, despesas...).
const EXPANDABLE = new Set([
  "entradas",
  "custosVariaveis",
  "despesasFixas",
  "proLabore",
  "investimentos",
]);

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
  const qc = useQueryClient();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const query = useQuery({
    queryKey: ["cash-flow", year],
    queryFn: () =>
      apiFetch<CashFlow>(
        `/financial/reports/cash-flow?year=${year}&openingBalance=0`,
      ),
    retry: false,
  });

  // Saldo inicial manual por mês (salva e recalcula o fluxo).
  const saveOpening = useMutation({
    mutationFn: (vars: { month: number; amount: number | null }) =>
      apiFetch("/financial/reports/cash-flow/opening", {
        method: "PUT",
        body: JSON.stringify({ year, ...vars }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cash-flow", year] }),
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
      </div>

      <p className="text-[0.7rem] text-muted-foreground">
        Valores em R$. O <strong>Saldo Inicial</strong> de cada mês é editável
        (clique e digite); em branco, ele puxa o saldo final do mês anterior.
        Clique nas linhas com seta (▸) para ver o detalhamento por conta.
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
                const accounts = query.data!.breakdown[row.key] ?? [];
                const canExpand = EXPANDABLE.has(row.key) && accounts.length > 0;
                const isOpen = expanded.has(row.key);
                return (
                  <Fragment key={row.key}>
                    <tr className={cn("border-t border-border", rowBg)}>
                      <td
                        className={cn(
                          "sticky left-0 z-10 px-3 py-2.5 text-left",
                          stickyBg,
                          row.indent ? "pl-6 text-muted-foreground" : "text-foreground",
                          row.emphasis && "font-semibold",
                        )}
                      >
                        {canExpand ? (
                          <button
                            type="button"
                            onClick={() => toggle(row.key)}
                            className="flex items-center gap-1.5 text-left hover:text-primary"
                          >
                            {isOpen ? (
                              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <span>{row.label}</span>
                          </button>
                        ) : (
                          row.label
                        )}
                      </td>
                      {query.data!.months.map((mo) =>
                        row.key === "saldoInicial" ? (
                          <td key={mo.month} className="px-1.5 py-1.5">
                            <OpeningCell
                              value={mo.saldoInicial}
                              manual={!!mo.saldoInicialManual}
                              onSave={(amount) =>
                                saveOpening.mutate({ month: mo.month, amount })
                              }
                            />
                          </td>
                        ) : (
                          <td key={mo.month} className={cn("px-3 py-2.5", valCls)}>
                            {fmtCell(row, mo[row.key as keyof MonthRow] as string | number | null)}
                          </td>
                        ),
                      )}
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

                    {/* Sub-linhas: contas/procedimentos que somaram nesta categoria. */}
                    {canExpand &&
                      isOpen &&
                      accounts.map((acc) => (
                        <tr
                          key={row.key + acc.accountId}
                          className="border-t border-border/40 bg-background/60"
                        >
                          <td className="sticky left-0 z-10 bg-card/95 py-2 pl-10 pr-3 text-left text-xs text-muted-foreground">
                            {acc.name}
                          </td>
                          {acc.months.map((v, i) => (
                            <td key={i} className="px-3 py-2 text-xs text-foreground/75">
                              {money(v)}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-xs font-medium text-foreground/90">
                            {money(acc.total)}
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Célula editável do Saldo Inicial de um mês (salva ao sair do campo). */
function OpeningCell({
  value,
  manual,
  onSave,
}: {
  value: string; // ex.: "615.00"
  manual: boolean;
  onSave: (amount: number | null) => void;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);

  const commit = () => {
    const trimmed = v.trim();
    const amount = trimmed === "" ? null : Number(trimmed);
    if (amount !== null && Number.isNaN(amount)) {
      setV(value);
      return;
    }
    // Só salva se mudou de fato (compara com o valor formatado atual).
    if (Number(trimmed || 0) !== Number(value)) onSave(amount);
  };

  return (
    <input
      type="number"
      step="0.01"
      inputMode="decimal"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      title={manual ? "Saldo inicial manual (editado)" : "Automático — clique para editar"}
      className={cn(
        "w-full min-w-[4.5rem] rounded border border-transparent bg-transparent px-1.5 py-1 text-right text-[0.82rem] font-semibold text-foreground outline-none",
        "hover:border-border focus:border-primary focus:bg-secondary",
        manual && "text-primary",
      )}
    />
  );
}
