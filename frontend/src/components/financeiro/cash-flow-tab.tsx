import { Fragment, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useHiddenValues, useMaskedMoney } from "@/lib/hidden-values";
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
  proLaboreInput: string | null;
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
  total: Omit<MonthRow, "month" | "proLaboreInput">;
  breakdown: Record<string, AccountBreak[]>;
}

type RowKey = Exclude<keyof MonthRow, "month" | "saldoInicialManual" | "proLaboreInput">;

interface RowDef {
  key: RowKey;
  label: string;
  /** Faixa colorida da linha (classe utilitária cb-band-*). */
  band?: string;
  /** Cor do valor. */
  tone?: string;
  /** Nível de recuo: 0 = seção, 1 = subseção. */
  level?: 0 | 1;
  /** A linha abre para mostrar as contas que a compõem. */
  expandable?: boolean;
  /** A célula do mês é digitável. */
  editable?: "saldoInicial" | "proLabore";
  /** Só aparece quando esta seção-pai está aberta. */
  parent?: RowKey;
  percent?: boolean;
  strong?: boolean;
}

/**
 * A planilha, na mesma ordem e hierarquia da original: as saídas agrupam
 * custos variáveis, despesas fixas e investimentos; o pró-labore fica FORA
 * das saídas e só desce no saldo final.
 */
const ROWS: RowDef[] = [
  {
    key: "saldoInicial",
    label: "Saldo Inicial",
    band: "cb-band-balance",
    editable: "saldoInicial",
    strong: true,
  },
  {
    key: "entradas",
    label: "ENTRADAS DE DINHEIRO",
    band: "cb-band-income",
    tone: "text-emerald-600 dark:text-emerald-400",
    expandable: true,
    strong: true,
  },
  {
    key: "saidas",
    label: "SAÍDAS DE DINHEIRO",
    band: "cb-band-outflow",
    tone: "text-rose-600 dark:text-rose-400",
    expandable: true,
    strong: true,
  },
  {
    key: "custosVariaveis",
    label: "Custos Variáveis",
    band: "cb-band-variable",
    tone: "text-orange-600 dark:text-orange-400",
    level: 1,
    expandable: true,
    parent: "saidas",
  },
  {
    key: "despesasFixas",
    label: "Despesas Fixas",
    band: "cb-band-fixed",
    tone: "text-sky-600 dark:text-sky-400",
    level: 1,
    expandable: true,
    parent: "saidas",
  },
  {
    key: "investimentos",
    label: "Investimentos",
    band: "cb-band-investment",
    tone: "text-violet-600 dark:text-violet-400",
    level: 1,
    expandable: true,
    parent: "saidas",
  },
  {
    key: "proLabore",
    label: "Pró-labore",
    band: "cb-band-prolabore",
    tone: "text-amber-600 dark:text-amber-400",
    editable: "proLabore",
    expandable: true,
    strong: true,
  },
  {
    key: "lucroLiquido",
    label: "Lucro Líquido",
    band: "cb-band-profit",
    strong: true,
  },
  {
    key: "margemLucroLiquido",
    label: "Margem de Lucro (%)",
    band: "cb-band-margin",
    percent: true,
  },
  { key: "distribuicaoLucros", label: "Distribuição de Lucros" },
  { key: "aplicacao", label: "Aplicação" },
  { key: "resgate", label: "Resgate" },
  {
    key: "saldoFinal",
    label: "Saldo Final",
    band: "cb-band-balance",
    strong: true,
  },
];

/** Chave do detalhamento por conta devolvido pelo backend. */
const BREAKDOWN_KEY: Partial<Record<RowKey, string>> = {
  entradas: "entradas",
  custosVariaveis: "custosVariaveis",
  despesasFixas: "despesasFixas",
  investimentos: "investimentos",
  proLabore: "proLabore",
};

const brlRaw = (v: string | number | null) =>
  v == null ? "—" : `R$ ${money(v)}`;

/** Verde quando positivo, vermelho quando negativo. */
const signTone = (v: string | number | null) =>
  Number(v ?? 0) < 0
    ? "text-rose-600 dark:text-rose-400"
    : "text-emerald-600 dark:text-emerald-400";

export function CashFlowTab() {
  const qc = useQueryClient();
  const brl = useMaskedMoney(brlRaw);
  const { hidden } = useHiddenValues();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  // Seções abertas. As saídas já vêm abertas mostrando os três grupos; o
  // detalhamento por conta começa fechado, como na planilha original.
  const [open, setOpen] = useState<Set<string>>(new Set(["saidas"]));

  const years = Array.from({ length: 7 }, (_, i) => currentYear + 1 - i);

  const toggle = (key: string) =>
    setOpen((prev) => {
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

  // Saldo inicial e pró-labore digitados na planilha.
  const saveCell = useMutation({
    mutationFn: (vars: {
      month: number;
      field: "amount" | "proLabore";
      value: number | null;
    }) =>
      apiFetch("/financial/reports/cash-flow/opening", {
        method: "PUT",
        body: JSON.stringify({
          year,
          month: vars.month,
          [vars.field]: vars.value,
        }),
      }),
    onSuccess: () => {
      toast.success("Planilha atualizada ✦");
      void qc.invalidateQueries({ queryKey: ["cash-flow", year] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível salvar"),
  });

  const data = query.data;

  /** A linha aparece? (subseções somem quando a seção-pai está fechada) */
  const isVisible = (row: RowDef) => !row.parent || open.has(row.parent);

  // A margem também é escondida: sozinha ela já entrega a lucratividade.
  const pct = (v: number | null) =>
    hidden ? "••••" : v == null ? "—" : `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`;

  const cellValue = (row: RowDef, mo: MonthRow) =>
    row.percent ? pct(mo.margemLucroLiquido) : brl(mo[row.key] as string);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="h-10 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          title="Atualizar"
          disabled={query.isFetching}
          onClick={() => {
            void query.refetch();
            toast.info("Dados atualizados");
          }}
        >
          <RefreshCw className={cn("h-4 w-4", query.isFetching && "animate-spin")} />
        </Button>
      </div>

      <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
        <strong>Saldo Inicial</strong> e <strong>Pró-labore</strong> são
        digitáveis: clique na célula e digite. Saldo inicial em branco puxa o
        saldo final do mês anterior. Clique nas linhas com seta (▸) para abrir o
        detalhamento por conta. O pró-labore não entra nas saídas nem no lucro —
        ele só desce no saldo final.
      </p>

      {query.isLoading ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : query.isError || !data ? (
        <Card className="border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
          Não foi possível carregar. Verifique se o servidor está no ar.
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-right text-[0.82rem]">
            <thead>
              <tr className="bg-secondary">
                <th className="sticky left-0 z-10 min-w-52 bg-secondary px-3 py-2.5 text-left font-semibold text-foreground">
                  Descrição
                </th>
                {MONTHS.map((m) => (
                  <th
                    key={m}
                    className="min-w-[6rem] px-3 py-2.5 font-semibold uppercase text-muted-foreground"
                  >
                    {m}
                  </th>
                ))}
                <th className="cb-col-total min-w-28 px-3 py-2.5 font-semibold uppercase text-primary">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.filter(isVisible).map((row) => {
                const accounts = data.breakdown[BREAKDOWN_KEY[row.key] ?? ""] ?? [];
                const canExpand = !!row.expandable && accounts.length > 0;
                const isOpen = open.has(row.key);
                // Saídas abrem/fecham as três subseções, mesmo sem contas.
                const toggles = canExpand || row.key === "saidas";

                const tone =
                  row.key === "lucroLiquido" || row.key === "saldoFinal"
                    ? undefined // definido por mês, conforme o sinal
                    : (row.tone ?? "text-foreground/90");

                return (
                  <Fragment key={row.key}>
                    <tr className={cn("border-t border-border", row.band)}>
                      <td
                        className={cn(
                          "sticky left-0 z-10 px-3 py-2.5 text-left",
                          row.band ?? "bg-background",
                          row.level === 1 ? "pl-7" : "",
                          row.strong && "font-semibold",
                          row.tone ?? "text-foreground",
                        )}
                      >
                        {toggles ? (
                          <button
                            type="button"
                            onClick={() => toggle(row.key)}
                            className="flex items-center gap-1.5 text-left hover:opacity-80"
                          >
                            {isOpen ? (
                              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <span>{row.label}</span>
                            {accounts.length > 0 && (
                              <span className="text-[0.65rem] font-normal opacity-70">
                                ({accounts.length}{" "}
                                {accounts.length === 1 ? "conta" : "contas"})
                              </span>
                            )}
                          </button>
                        ) : (
                          row.label
                        )}
                      </td>

                      {data.months.map((mo) =>
                        // Com os valores escondidos a célula vira texto: não dá
                        // para editar às cegas.
                        row.editable && hidden ? (
                          <td
                            key={mo.month}
                            className={cn("px-3 py-2.5 font-semibold", tone)}
                          >
                            {brl(
                              row.editable === "saldoInicial"
                                ? mo.saldoInicial
                                : mo.proLabore,
                            )}
                          </td>
                        ) : row.editable ? (
                          <td key={mo.month} className="px-1.5 py-1.5">
                            <SheetCell
                              value={
                                row.editable === "saldoInicial"
                                  ? mo.saldoInicial
                                  : (mo.proLaboreInput ?? "")
                              }
                              highlighted={
                                row.editable === "saldoInicial"
                                  ? !!mo.saldoInicialManual
                                  : mo.proLaboreInput != null
                              }
                              title={
                                row.editable === "saldoInicial"
                                  ? "Saldo inicial — em branco puxa o mês anterior"
                                  : "Pró-labore do mês"
                              }
                              onSave={(value) =>
                                saveCell.mutate({
                                  month: mo.month,
                                  field:
                                    row.editable === "saldoInicial"
                                      ? "amount"
                                      : "proLabore",
                                  value,
                                })
                              }
                            />
                          </td>
                        ) : (
                          <td
                            key={mo.month}
                            className={cn(
                              "px-3 py-2.5",
                              row.strong && "font-semibold",
                              tone ??
                                signTone(
                                  mo[row.key] as string,
                                ),
                            )}
                          >
                            {cellValue(row, mo)}
                          </td>
                        ),
                      )}

                      <td
                        className={cn(
                          "cb-col-total px-3 py-2.5 font-semibold",
                          row.percent
                            ? "text-foreground"
                            : (tone ??
                              signTone(
                                data.total[row.key as keyof CashFlow["total"]] as string,
                              )),
                        )}
                      >
                        {row.percent
                          ? pct(data.total.margemLucroLiquido)
                          : brl(
                              data.total[
                                row.key as keyof CashFlow["total"]
                              ] as string,
                            )}
                      </td>
                    </tr>

                    {/* Contas que compõem a seção. */}
                    {canExpand &&
                      isOpen &&
                      accounts.map((acc) => (
                        <tr
                          key={row.key + acc.accountId}
                          className="cb-band-detail border-t border-border/40"
                        >
                          <td
                            className={cn(
                              "cb-band-detail sticky left-0 z-10 py-2 pr-3 text-left text-xs text-muted-foreground",
                              row.level === 1 ? "pl-12" : "pl-9",
                            )}
                          >
                            {acc.name}
                          </td>
                          {acc.months.map((v, i) => (
                            <td key={i} className="px-3 py-2 text-xs text-foreground/75">
                              {brl(v)}
                            </td>
                          ))}
                          <td className="cb-col-total px-3 py-2 text-xs font-medium text-foreground/90">
                            {brl(acc.total)}
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

/**
 * Célula digitável da planilha (saldo inicial / pró-labore). Salva ao sair do
 * campo ou no Enter; apagar tudo devolve a célula ao automático.
 */
function SheetCell({
  value,
  highlighted,
  title,
  onSave,
}: {
  value: string; // ex.: "615.00" ou "" quando vazio
  highlighted: boolean;
  title: string;
  onSave: (value: number | null) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      // Só avisa o servidor se já havia um valor gravado.
      if (highlighted) onSave(null);
      else setDraft(value);
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      setDraft(value);
      return;
    }
    // Só grava se mudou — senão focar numa célula automática (carryover) já a
    // transformaria em manual.
    if (parsed !== Number(value || 0)) onSave(parsed);
  };

  return (
    <input
      type="number"
      step="0.01"
      inputMode="decimal"
      value={draft}
      placeholder="—"
      title={title}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setDraft(value);
      }}
      className={cn(
        "w-full min-w-[5rem] rounded border border-transparent bg-transparent px-1.5 py-1 text-right text-[0.82rem] font-semibold outline-none",
        "hover:border-border focus:border-primary focus:bg-background",
        highlighted ? "text-primary" : "text-foreground",
      )}
    />
  );
}
