import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  AppointmentType,
  ComandaStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { AuthUser } from '@/auth/decorators/current-user.decorator';
import {
  comandaOwnerWhere,
  ownerWhere,
  professionalWhere,
} from '@/common/ownership';
import { AnalyticsPeriodQuery } from './dto/analytics-period.query';
import { TopClientsQuery } from './dto/top-clients.query';
import { AnalyticsYearQuery } from './dto/analytics-year.query';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resumo do período (padrão: mês atual). */
  async summary(query: AnalyticsPeriodQuery, user: AuthUser) {
    const { start, end } = this.resolveRange(query.from, query.to, 'month');
    const apptScope = professionalWhere(user);
    const comandaScope = comandaOwnerWhere(user);

    const [
      newClients,
      totalAppointments,
      completedAppointments,
      returns,
      blocks,
      revenueAgg,
    ] = await this.prisma.$transaction([
      this.prisma.client.count({
        where: { createdAt: { gte: start, lte: end }, ...ownerWhere(user) },
      }),
      this.prisma.appointment.count({
        where: {
          type: AppointmentType.APPOINTMENT,
          startTime: { gte: start, lte: end },
          ...apptScope,
        },
      }),
      this.prisma.appointment.count({
        where: {
          type: AppointmentType.APPOINTMENT,
          status: AppointmentStatus.COMPLETED,
          startTime: { gte: start, lte: end },
          ...apptScope,
        },
      }),
      this.prisma.appointment.count({
        where: {
          type: AppointmentType.APPOINTMENT,
          parentId: { not: null },
          startTime: { gte: start, lte: end },
          ...apptScope,
        },
      }),
      this.prisma.appointment.count({
        where: {
          type: AppointmentType.BLOCK,
          startTime: { gte: start, lte: end },
          ...apptScope,
        },
      }),
      this.prisma.comanda.aggregate({
        where: {
          status: ComandaStatus.CLOSED,
          closedAt: { gte: start, lte: end },
          ...comandaScope,
        },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    const revenue = revenueAgg._sum.total ?? new Prisma.Decimal(0);
    const closedComandas = revenueAgg._count;
    const averageTicket =
      closedComandas > 0 ? revenue.div(closedComandas) : new Prisma.Decimal(0);

    return {
      period: { from: start.toISOString(), to: end.toISOString() },
      newClients,
      totalAppointments,
      completedAppointments,
      returns,
      blocks,
      closedComandas,
      revenue: revenue.toFixed(2),
      averageTicket: averageTicket.toFixed(2),
    };
  }

  /** Clientes que mais gastaram (padrão: ano atual), por comandas fechadas. */
  async topClients(query: TopClientsQuery, user: AuthUser) {
    const { start, end } = this.resolveRange(query.from, query.to, 'year');

    const grouped = await this.prisma.comanda.groupBy({
      by: ['clientId'],
      where: {
        status: ComandaStatus.CLOSED,
        closedAt: { gte: start, lte: end },
        clientId: { not: null },
        ...comandaOwnerWhere(user),
      },
      _sum: { total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take: query.limit,
    });

    const clientIds = grouped
      .map((g) => g.clientId)
      .filter((id): id is string => id !== null);

    const clients = await this.prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, fullName: true, phone: true },
    });
    const byId = new Map(clients.map((c) => [c.id, c]));

    return {
      period: { from: start.toISOString(), to: end.toISOString() },
      data: grouped.map((g) => ({
        clientId: g.clientId,
        fullName: byId.get(g.clientId!)?.fullName ?? null,
        phone: byId.get(g.clientId!)?.phone ?? null,
        totalSpent: (g._sum.total ?? new Prisma.Decimal(0)).toFixed(2),
        visits: g._count,
      })),
    };
  }

  /**
   * Painel de métricas do ano: rankings de clientes, desempenho mês a mês e
   * procedimentos mais realizados. Tudo escopado ao profissional logado.
   */
  async overview(query: AnalyticsYearQuery, user: AuthUser) {
    const year = query.year ?? new Date().getUTCFullYear();
    const limit = query.limit ?? 5;
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const apptScope = professionalWhere(user);
    const comandaScope = comandaOwnerWhere(user);

    const closedComandaWhere = {
      status: ComandaStatus.CLOSED,
      closedAt: { gte: start, lte: end },
      ...comandaScope,
    };

    const [
      appointments,
      closedComandas,
      newClients,
      spendGrouped,
      visitsGrouped,
      procGrouped,
    ] = await Promise.all([
      // Agendamentos do ano (para o gráfico mensal).
      this.prisma.appointment.findMany({
        where: {
          type: AppointmentType.APPOINTMENT,
          startTime: { gte: start, lte: end },
          ...apptScope,
        },
        select: { startTime: true },
      }),
      // Comandas fechadas (faturamento mensal + total).
      this.prisma.comanda.findMany({
        where: closedComandaWhere,
        select: { closedAt: true, total: true },
      }),
      this.prisma.client.count({
        where: { createdAt: { gte: start, lte: end }, ...ownerWhere(user) },
      }),
      // Top clientes por gasto (comandas fechadas).
      this.prisma.comanda.groupBy({
        by: ['clientId'],
        where: { ...closedComandaWhere, clientId: { not: null } },
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: 'desc' } },
        take: limit,
      }),
      // Top clientes por número de agendamentos.
      this.prisma.appointment.groupBy({
        by: ['clientId'],
        where: {
          type: AppointmentType.APPOINTMENT,
          startTime: { gte: start, lte: end },
          clientId: { not: null },
          ...apptScope,
        },
        _count: true,
        orderBy: { _count: { clientId: 'desc' } },
        take: limit,
      }),
      // Procedimentos mais realizados (dentro de comandas fechadas).
      this.prisma.comandaProcedure.groupBy({
        by: ['nameSnapshot'],
        where: { comanda: closedComandaWhere },
        _count: true,
        _sum: { priceSnapshot: true },
        orderBy: { _count: { nameSnapshot: 'desc' } },
        take: limit,
      }),
    ]);

    // ── Série mensal (12 posições) ──
    const monthlyAppointments = Array.from({ length: 12 }, () => 0);
    for (const a of appointments) {
      monthlyAppointments[a.startTime.getUTCMonth()] += 1;
    }
    const monthlyRevenue = Array.from({ length: 12 }, () => new Prisma.Decimal(0));
    let revenue = new Prisma.Decimal(0);
    for (const c of closedComandas) {
      const total = c.total ?? new Prisma.Decimal(0);
      revenue = revenue.plus(total);
      if (c.closedAt) {
        monthlyRevenue[c.closedAt.getUTCMonth()] =
          monthlyRevenue[c.closedAt.getUTCMonth()].plus(total);
      }
    }
    const monthly = monthlyAppointments.map((count, i) => ({
      month: i + 1,
      appointments: count,
      revenue: monthlyRevenue[i].toFixed(2),
    }));

    const bestIdx = monthlyAppointments.reduce(
      (best, v, i) => (v > monthlyAppointments[best] ? i : best),
      0,
    );
    const bestMonth =
      monthlyAppointments[bestIdx] > 0
        ? { month: bestIdx + 1, appointments: monthlyAppointments[bestIdx] }
        : null;

    // ── Nomes dos clientes dos dois rankings ──
    const clientIds = [
      ...new Set(
        [...spendGrouped, ...visitsGrouped]
          .map((g) => g.clientId)
          .filter((id): id is string => id !== null),
      ),
    ];
    const clients = await this.prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, fullName: true, phone: true },
    });
    const byId = new Map(clients.map((c) => [c.id, c]));

    return {
      year,
      totals: {
        appointments: appointments.length,
        closedComandas: closedComandas.length,
        revenue: revenue.toFixed(2),
        newClients,
        averageTicket:
          closedComandas.length > 0
            ? revenue.div(closedComandas.length).toFixed(2)
            : '0.00',
      },
      monthly,
      bestMonth,
      topSpenders: spendGrouped.map((g) => ({
        clientId: g.clientId,
        fullName: byId.get(g.clientId!)?.fullName ?? 'Cliente removido',
        totalSpent: (g._sum.total ?? new Prisma.Decimal(0)).toFixed(2),
        visits: g._count,
      })),
      topVisitors: visitsGrouped.map((g) => ({
        clientId: g.clientId,
        fullName: byId.get(g.clientId!)?.fullName ?? 'Cliente removido',
        appointments: g._count,
      })),
      topProcedures: procGrouped.map((g) => ({
        name: g.nameSnapshot,
        count: g._count,
        total: (g._sum.priceSnapshot ?? new Prisma.Decimal(0)).toFixed(2),
      })),
    };
  }

  /** Resolve o intervalo; se não informado, usa o mês ou ano atual (UTC). */
  private resolveRange(
    from: string | undefined,
    to: string | undefined,
    fallback: 'month' | 'year',
  ): { start: Date; end: Date } {
    if (from || to) {
      return {
        start: from ? new Date(from) : new Date(0),
        end: to ? new Date(to) : new Date(),
      };
    }
    const now = new Date();
    const y = now.getUTCFullYear();
    if (fallback === 'year') {
      return {
        start: new Date(Date.UTC(y, 0, 1)),
        end: new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999)),
      };
    }
    const m = now.getUTCMonth();
    return {
      start: new Date(Date.UTC(y, m, 1)),
      end: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)),
    };
  }
}
