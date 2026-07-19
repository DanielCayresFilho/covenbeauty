import { Injectable } from '@nestjs/common';
import { CashFlowCategory, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { AuthUser } from '@/auth/decorators/current-user.decorator';
import { ownerWhere } from '@/common/ownership';
import { IncomeReportQuery } from './dto/income-report.query';
import { CashFlowQuery } from './dto/cash-flow.query';
import { SetOpeningDto } from './dto/set-opening.dto';

const D0 = () => new Prisma.Decimal(0);
const money = (v: Prisma.Decimal) => v.toFixed(2);

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────── Parte 1: entradas por dia/semana/mês ───────────────

  async incomeByPeriod(query: IncomeReportQuery, user: AuthUser) {
    const { from, to, groupBy } = query;

    const entries = await this.prisma.financialEntry.findMany({
      where: {
        category: CashFlowCategory.INCOME,
        ...ownerWhere(user),
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
  async summary(user: AuthUser, from?: string, to?: string) {
    const grouped = await this.prisma.financialEntry.groupBy({
      by: ['category'],
      where: {
        ...ownerWhere(user),
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
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

  async cashFlow(query: CashFlowQuery, user: AuthUser) {
    const { year, openingBalance } = query;
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

    const [entries, openings] = await Promise.all([
      this.prisma.financialEntry.findMany({
        where: { date: { gte: start, lte: end }, ...ownerWhere(user) },
        select: {
          date: true,
          amount: true,
          category: true,
          accountId: true,
          account: { select: { name: true } },
        },
      }),
      this.prisma.cashFlowOpening.findMany({
        where: { year, ...ownerWhere(user) },
        select: { month: true, amount: true },
      }),
    ]);

    // Saldos iniciais manuais por mês (override); ausência = carryover.
    const openingByMonth = new Map(openings.map((o) => [o.month, o.amount]));

    // Detalhamento por conta (para expandir cada categoria: procedimentos que
    // sincronizaram, despesas etc.), com 12 meses + total por conta.
    const breakdown = this.buildBreakdown(entries);

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

    let prevFinal = new Prisma.Decimal(openingBalance);
    const monthsOut = months.map((b, i) => {
      const monthNum = i + 1;
      const saidas = b.variableCost
        .plus(b.fixedExpense)
        .plus(b.proLabore)
        .plus(b.investment);
      const lucro = b.income.minus(saidas);
      const margem = b.income.greaterThan(0)
        ? lucro.div(b.income).mul(100).toDecimalPlaces(2).toNumber()
        : null;
      // Saldo inicial: override manual do mês, senão carryover (saldo final anterior).
      const override = openingByMonth.get(monthNum);
      const si =
        override ?? (i === 0 ? new Prisma.Decimal(openingBalance) : prevFinal);
      const saldoFinal = si
        .plus(lucro)
        .minus(b.distribution)
        .minus(b.application)
        .plus(b.redemption);
      prevFinal = saldoFinal;

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
        month: monthNum,
        saldoInicial: money(si),
        saldoInicialManual: openingByMonth.has(monthNum),
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
        saldoFinal: money(prevFinal), // saldo final de dezembro
      },
      breakdown,
    };
  }

  /** Define (ou limpa, quando amount é null) o saldo inicial de um mês. */
  async setOpening(user: AuthUser, dto: SetOpeningDto) {
    const { year, month, amount } = dto;
    if (amount === null || amount === undefined) {
      await this.prisma.cashFlowOpening.deleteMany({
        where: { ownerId: user.id, year, month },
      });
      return { year, month, cleared: true };
    }
    const value = new Prisma.Decimal(amount);
    await this.prisma.cashFlowOpening.upsert({
      where: { ownerId_year_month: { ownerId: user.id, year, month } },
      create: { ownerId: user.id, year, month, amount: value },
      update: { amount: value },
    });
    return { year, month, amount: money(value) };
  }

  /**
   * Detalha cada categoria em contas (12 meses + total por conta), para o
   * fluxo poder expandir/ocultar as entradas, custos variáveis, etc.
   */
  private buildBreakdown(
    entries: {
      date: Date;
      amount: Prisma.Decimal;
      category: CashFlowCategory;
      accountId: string | null;
      account: { name: string } | null;
    }[],
  ): Record<string, { accountId: string; name: string; months: string[]; total: string }[]> {
    const CAT_TO_KEY: Partial<Record<CashFlowCategory, string>> = {
      [CashFlowCategory.INCOME]: 'entradas',
      [CashFlowCategory.VARIABLE_COST]: 'custosVariaveis',
      [CashFlowCategory.FIXED_EXPENSE]: 'despesasFixas',
      [CashFlowCategory.PRO_LABORE]: 'proLabore',
      [CashFlowCategory.INVESTMENT]: 'investimentos',
    };

    // key -> accountKey -> { name, months[12], total }
    const map = new Map<
      string,
      Map<string, { name: string; months: Prisma.Decimal[]; total: Prisma.Decimal }>
    >();

    for (const e of entries) {
      const key = CAT_TO_KEY[e.category];
      if (!key) continue; // categorias abaixo da linha não expandem
      if (!map.has(key)) map.set(key, new Map());
      const accounts = map.get(key)!;
      const accKey = e.accountId ?? '__none__';
      if (!accounts.has(accKey)) {
        accounts.set(accKey, {
          name: e.account?.name ?? 'Sem conta',
          months: Array.from({ length: 12 }, () => D0()),
          total: D0(),
        });
      }
      const row = accounts.get(accKey)!;
      const m = e.date.getUTCMonth();
      row.months[m] = row.months[m].plus(e.amount);
      row.total = row.total.plus(e.amount);
    }

    const out: Record<
      string,
      { accountId: string; name: string; months: string[]; total: string }[]
    > = {};
    for (const [key, accounts] of map) {
      out[key] = [...accounts.entries()]
        .map(([accountId, r]) => ({
          accountId,
          name: r.name,
          months: r.months.map((v) => money(v)),
          total: money(r.total),
        }))
        .sort((a, b) => Number(b.total) - Number(a.total));
    }
    return out;
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
