import { Injectable } from '@nestjs/common';
import { CashFlowCategory, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { IncomeReportQuery } from './dto/income-report.query';
import { CashFlowQuery } from './dto/cash-flow.query';

const D0 = () => new Prisma.Decimal(0);
const money = (v: Prisma.Decimal) => v.toFixed(2);

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────── Parte 1: entradas por dia/semana/mês ───────────────

  async incomeByPeriod(query: IncomeReportQuery) {
    const { from, to, groupBy } = query;

    const entries = await this.prisma.financialEntry.findMany({
      where: {
        category: CashFlowCategory.INCOME,
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      select: { date: true, amount: true },
      orderBy: { date: 'asc' },
    });

    const buckets = new Map<string, Prisma.Decimal>();
    let total = D0();
    for (const e of entries) {
      const key = this.periodKey(e.date, groupBy);
      buckets.set(key, (buckets.get(key) ?? D0()).plus(e.amount));
      total = total.plus(e.amount);
    }

    const data = [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, sum]) => ({ period, total: money(sum) }));

    return { groupBy, from: from ?? null, to: to ?? null, total: money(total), data };
  }

  /** Resumo simples de um período: entradas, saídas por tipo e lucro. */
  async summary(from?: string, to?: string) {
    const grouped = await this.prisma.financialEntry.groupBy({
      by: ['category'],
      where:
        from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {},
      _sum: { amount: true },
    });

    const byCat = (c: CashFlowCategory) =>
      grouped.find((g) => g.category === c)?._sum.amount ?? D0();

    const income = byCat(CashFlowCategory.INCOME);
    const variableCost = byCat(CashFlowCategory.VARIABLE_COST);
    const fixedExpense = byCat(CashFlowCategory.FIXED_EXPENSE);
    const proLabore = byCat(CashFlowCategory.PRO_LABORE);
    const investment = byCat(CashFlowCategory.INVESTMENT);
    const expenses = variableCost
      .plus(fixedExpense)
      .plus(proLabore)
      .plus(investment);
    const netProfit = income.minus(expenses);

    return {
      from: from ?? null,
      to: to ?? null,
      income: money(income),
      variableCost: money(variableCost),
      fixedExpense: money(fixedExpense),
      proLabore: money(proLabore),
      investment: money(investment),
      expenses: money(expenses),
      netProfit: money(netProfit),
    };
  }

  // ─────────────── Parte 2: fluxo de caixa mensal ───────────────

  async cashFlow(query: CashFlowQuery) {
    const { year, openingBalance } = query;
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

    const entries = await this.prisma.financialEntry.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true, amount: true, category: true },
    });

    // Soma por mês e categoria.
    const months = Array.from({ length: 12 }, () => ({
      income: D0(),
      variableCost: D0(),
      fixedExpense: D0(),
      proLabore: D0(),
      investment: D0(),
      distribution: D0(),
      application: D0(),
      redemption: D0(),
    }));

    for (const e of entries) {
      const b = months[e.date.getUTCMonth()];
      switch (e.category) {
        case CashFlowCategory.INCOME:
          b.income = b.income.plus(e.amount);
          break;
        case CashFlowCategory.VARIABLE_COST:
          b.variableCost = b.variableCost.plus(e.amount);
          break;
        case CashFlowCategory.FIXED_EXPENSE:
          b.fixedExpense = b.fixedExpense.plus(e.amount);
          break;
        case CashFlowCategory.PRO_LABORE:
          b.proLabore = b.proLabore.plus(e.amount);
          break;
        case CashFlowCategory.INVESTMENT:
          b.investment = b.investment.plus(e.amount);
          break;
        case CashFlowCategory.PROFIT_DISTRIBUTION:
          b.distribution = b.distribution.plus(e.amount);
          break;
        case CashFlowCategory.APPLICATION:
          b.application = b.application.plus(e.amount);
          break;
        case CashFlowCategory.REDEMPTION:
          b.redemption = b.redemption.plus(e.amount);
          break;
      }
    }

    const totals = {
      entradas: D0(),
      saidas: D0(),
      custosVariaveis: D0(),
      despesasFixas: D0(),
      proLabore: D0(),
      investimentos: D0(),
      lucroLiquido: D0(),
      distribuicao: D0(),
      aplicacao: D0(),
      resgate: D0(),
    };

    let saldoInicial = new Prisma.Decimal(openingBalance);
    const monthsOut = months.map((b, i) => {
      const saidas = b.variableCost
        .plus(b.fixedExpense)
        .plus(b.proLabore)
        .plus(b.investment);
      const lucro = b.income.minus(saidas);
      const margem = b.income.greaterThan(0)
        ? lucro.div(b.income).mul(100).toDecimalPlaces(2).toNumber()
        : null;
      const si = saldoInicial;
      const saldoFinal = si
        .plus(lucro)
        .minus(b.distribution)
        .minus(b.application)
        .plus(b.redemption);
      saldoInicial = saldoFinal;

      totals.entradas = totals.entradas.plus(b.income);
      totals.saidas = totals.saidas.plus(saidas);
      totals.custosVariaveis = totals.custosVariaveis.plus(b.variableCost);
      totals.despesasFixas = totals.despesasFixas.plus(b.fixedExpense);
      totals.proLabore = totals.proLabore.plus(b.proLabore);
      totals.investimentos = totals.investimentos.plus(b.investment);
      totals.lucroLiquido = totals.lucroLiquido.plus(lucro);
      totals.distribuicao = totals.distribuicao.plus(b.distribution);
      totals.aplicacao = totals.aplicacao.plus(b.application);
      totals.resgate = totals.resgate.plus(b.redemption);

      return {
        month: i + 1,
        saldoInicial: money(si),
        entradas: money(b.income),
        saidas: money(saidas),
        custosVariaveis: money(b.variableCost),
        despesasFixas: money(b.fixedExpense),
        proLabore: money(b.proLabore),
        investimentos: money(b.investment),
        lucroLiquido: money(lucro),
        margemLucroLiquido: margem,
        distribuicaoLucros: money(b.distribution),
        aplicacao: money(b.application),
        resgate: money(b.redemption),
        saldoFinal: money(saldoFinal),
      };
    });

    const totalMargem = totals.entradas.greaterThan(0)
      ? totals.lucroLiquido.div(totals.entradas).mul(100).toDecimalPlaces(2).toNumber()
      : null;

    return {
      year,
      openingBalance: money(new Prisma.Decimal(openingBalance)),
      months: monthsOut,
      total: {
        entradas: money(totals.entradas),
        saidas: money(totals.saidas),
        custosVariaveis: money(totals.custosVariaveis),
        despesasFixas: money(totals.despesasFixas),
        proLabore: money(totals.proLabore),
        investimentos: money(totals.investimentos),
        lucroLiquido: money(totals.lucroLiquido),
        margemLucroLiquido: totalMargem,
        distribuicaoLucros: money(totals.distribuicao),
        aplicacao: money(totals.aplicacao),
        resgate: money(totals.resgate),
        saldoFinal: money(saldoInicial), // saldo final de dezembro
      },
    };
  }

  // ─────────────── Helpers ───────────────

  private periodKey(date: Date, groupBy: 'day' | 'week' | 'month'): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');

    if (groupBy === 'month') {
      return `${y}-${m}`;
    }
    if (groupBy === 'day') {
      return `${y}-${m}-${d}`;
    }
    // week: segunda-feira da semana (ISO)
    const dt = new Date(Date.UTC(y, date.getUTCMonth(), date.getUTCDate()));
    const dow = dt.getUTCDay(); // 0=Dom..6=Sáb
    const diff = dow === 0 ? -6 : 1 - dow;
    dt.setUTCDate(dt.getUTCDate() + diff);
    const wy = dt.getUTCFullYear();
    const wm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const wd = String(dt.getUTCDate()).padStart(2, '0');
    return `${wy}-${wm}-${wd}`;
  }
}
