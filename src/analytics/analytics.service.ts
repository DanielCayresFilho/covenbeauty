import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  AppointmentType,
  ComandaStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AnalyticsPeriodQuery } from './dto/analytics-period.query';
import { TopClientsQuery } from './dto/top-clients.query';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resumo do período (padrão: mês atual). */
  async summary(query: AnalyticsPeriodQuery) {
    const { start, end } = this.resolveRange(query.from, query.to, 'month');

    const [
      newClients,
      totalAppointments,
      completedAppointments,
      returns,
      blocks,
      revenueAgg,
    ] = await this.prisma.$transaction([
      this.prisma.client.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.appointment.count({
        where: {
          type: AppointmentType.APPOINTMENT,
          startTime: { gte: start, lte: end },
        },
      }),
      this.prisma.appointment.count({
        where: {
          type: AppointmentType.APPOINTMENT,
          status: AppointmentStatus.COMPLETED,
          startTime: { gte: start, lte: end },
        },
      }),
      this.prisma.appointment.count({
        where: {
          type: AppointmentType.APPOINTMENT,
          parentId: { not: null },
          startTime: { gte: start, lte: end },
        },
      }),
      this.prisma.appointment.count({
        where: {
          type: AppointmentType.BLOCK,
          startTime: { gte: start, lte: end },
        },
      }),
      this.prisma.comanda.aggregate({
        where: {
          status: ComandaStatus.CLOSED,
          closedAt: { gte: start, lte: end },
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
  async topClients(query: TopClientsQuery) {
    const { start, end } = this.resolveRange(query.from, query.to, 'year');

    const grouped = await this.prisma.comanda.groupBy({
      by: ['clientId'],
      where: {
        status: ComandaStatus.CLOSED,
        closedAt: { gte: start, lte: end },
        clientId: { not: null },
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
