import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  CalendarCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { brl, MONTHS } from "@/components/financeiro/constants";
import { HideValuesButton } from "@/components/hide-values-button";
import { useMaskedMoney } from "@/lib/hidden-values";

export const Route = createFileRoute("/menu/metricas/")({
  component: MetricasPage,
});

interface MonthPoint {
  month: number;
  appointments: number;
  revenue: string;
}
interface Overview {
  year: number;
  totals: {
    appointments: number;
    closedComandas: number;
    revenue: string;
    newClients: number;
    averageTicket: string;
  };
  monthly: MonthPoint[];
  bestMonth: { month: number; appointments: number } | null;
  topSpenders: {
    clientId: string | null;
    fullName: string;
    totalSpent: string;
    visits: number;
  }[];
  topVisitors: {
    clientId: string | null;
    fullName: string;
    appointments: number;
  }[];
  topProcedures: { name: string; count: number; total: string }[];
}

function MetricasPage() {
  return (
    <AppShell>
      <Metricas />
    </AppShell>
  );
}

function Metricas() {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());

  const query = useQuery({
    queryKey: ["analytics", "overview", year],
    queryFn: () => apiFetch<Overview>(`/analytics/overview?year=${year}&limit=5`),
    retry: false,
    staleTime: 60_000,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.4em] text-blood">
            Desempenho
          </p>
          <h1 className="mt-1 font-serif text-3xl text-parchment">Métricas</h1>
        </div>
        <div className="flex items-center gap-2">
          <HideValuesButton />
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

      {query.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : query.isError ? (
        <Card className="border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
          Não foi possível carregar as métricas. Verifique se o servidor está no ar.
        </Card>
      ) : (
        <Overview data={query.data!} />
      )}
    </div>
  );
}

function Overview({ data }: { data: Overview }) {
  const fmt = useMaskedMoney(brl);
  const { totals, monthly, bestMonth } = data;
  const chartData = monthly.map((m) => ({
    mes: MONTHS[m.month - 1],
    agendamentos: m.appointments,
    faturamento: m.revenue,
    isBest: bestMonth?.month === m.month,
  }));
  const hasAppointments = totals.appointments > 0;

  return (
    <>
      {/* Números do ano */}
      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat label="Faturamento" value={fmt(totals.revenue)} />
        <Stat label="Atendimentos" value={String(totals.appointments)} />
        <Stat label="Ticket médio" value={fmt(totals.averageTicket)} />
        <Stat label="Clientes novos" value={String(totals.newClients)} />
      </section>

      {/* Desempenho mês a mês */}
      <section>
        <SectionTitle icon={TrendingUp}>Desempenho do ano</SectionTitle>
        <Card className="border-border bg-card/60 p-4">
          {bestMonth ? (
            <p className="mb-3 text-sm text-muted-foreground">
              Melhor mês:{" "}
              <strong className="text-parchment">
                {MONTHS[bestMonth.month - 1]}
              </strong>{" "}
              com{" "}
              <strong className="text-primary">
                {bestMonth.appointments} atendimento
                {bestMonth.appointments === 1 ? "" : "s"}
              </strong>
              .
            </p>
          ) : (
            <p className="mb-3 text-sm text-muted-foreground">
              Nenhum atendimento registrado em {data.year}.
            </p>
          )}

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="mes"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "var(--secondary)", opacity: 0.4 }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--foreground)",
                    fontSize: 13,
                  }}
                  labelStyle={{ color: "var(--muted-foreground)" }}
                  formatter={(value: number, _n, item) => [
                    `${value} atendimento${value === 1 ? "" : "s"} · ${fmt(
                      (item?.payload as { faturamento: string }).faturamento,
                    )}`,
                    "",
                  ]}
                />
                <Bar dataKey="agendamentos" radius={[4, 4, 0, 0]} maxBarSize={34}>
                  {chartData.map((d) => (
                    <Cell
                      key={d.mes}
                      fill={d.isBest ? "var(--primary)" : "var(--primary)"}
                      fillOpacity={d.isBest ? 1 : 0.45}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {!hasAppointments && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              O gráfico ganha vida assim que houver atendimentos no ano.
            </p>
          )}
        </Card>
      </section>

      {/* Top 5 clientes que mais gastaram */}
      <section>
        <SectionTitle icon={Crown}>Clientes que mais gastaram</SectionTitle>
        <RankList
          empty="Nenhuma comanda fechada neste ano ainda."
          items={data.topSpenders.map((c, i) => ({
            key: c.clientId ?? String(i),
            position: i + 1,
            title: c.fullName,
            subtitle: `${c.visits} atendimento${c.visits === 1 ? "" : "s"}`,
            value: fmt(c.totalSpent),
          }))}
        />
      </section>

      {/* Top 5 clientes com mais agendamentos */}
      <section>
        <SectionTitle icon={CalendarCheck}>Clientes mais frequentes</SectionTitle>
        <RankList
          empty="Nenhum agendamento neste ano ainda."
          items={data.topVisitors.map((c, i) => ({
            key: c.clientId ?? String(i),
            position: i + 1,
            title: c.fullName,
            subtitle: "agendamentos no ano",
            value: String(c.appointments),
          }))}
        />
      </section>

      {/* Procedimentos mais realizados */}
      <section>
        <SectionTitle icon={Sparkles}>Procedimentos mais realizados</SectionTitle>
        <RankList
          empty="Nenhum procedimento realizado neste ano ainda."
          items={data.topProcedures.map((p, i) => ({
            key: p.name + i,
            position: i + 1,
            title: p.name,
            subtitle: `${p.count}x · ${fmt(p.total)} no total`,
            value: `${p.count}x`,
          }))}
        />
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border bg-card/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-serif text-xl text-parchment">{value}</p>
    </Card>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof Crown;
  children: React.ReactNode;
}) {
  return (
    <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
      <Icon className="h-4 w-4 text-blood" />
      {children}
    </h2>
  );
}

interface RankItem {
  key: string;
  position: number;
  title: string;
  subtitle: string;
  value: string;
}

function RankList({ items, empty }: { items: RankItem[]; empty: string }) {
  if (items.length === 0) {
    return (
      <Card className="border-dashed border-border bg-transparent p-6 text-center text-sm text-muted-foreground">
        {empty}
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <Card
          key={it.key}
          className="flex items-center gap-3 border-border bg-card/60 p-3"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm text-blood">
            {it.position}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-parchment">{it.title}</p>
            <p className="truncate text-xs text-muted-foreground">{it.subtitle}</p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-parchment">
            {it.value}
          </span>
        </Card>
      ))}
    </div>
  );
}
