import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CashFlowCategory,
  FinancialGoal,
  GoalPeriod,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { AuthUser } from '@/auth/decorators/current-user.decorator';
import { ownerWhere } from '@/common/ownership';
import { salonDateOnly } from '@/common/salon-date';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

/** Alvos usados na primeira meta automática de cada período. */
const DEFAULT_TARGET: Record<'WEEKLY' | 'MONTHLY', number> = {
  WEEKLY: 500,
  MONTHLY: 2000,
};

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGoalDto, ownerId: string) {
    const period = dto.period ?? GoalPeriod.CUSTOM;
    const { startDate, endDate } = this.resolveRange(period, dto);

    return this.prisma.financialGoal.create({
      data: {
        name: dto.name,
        period,
        startDate,
        endDate,
        targetAmount: new Prisma.Decimal(dto.targetAmount),
        createdById: ownerId,
        ownerId,
      },
    });
  }

  async findAll(user: AuthUser) {
    // A meta da semana e a do mês se renovam sozinhas, como no sistema antigo.
    await this.ensureCurrentPeriodGoals(user);

    const goals = await this.prisma.financialGoal.findMany({
      where: ownerWhere(user),
      orderBy: [{ endDate: 'desc' }, { startDate: 'desc' }],
    });
    return Promise.all(goals.map((g) => this.withProgress(g, user)));
  }

  async findOne(id: string, user: AuthUser) {
    const goal = await this.prisma.financialGoal.findFirst({
      where: { id, ...ownerWhere(user) },
    });
    if (!goal) {
      throw new NotFoundException('Meta não encontrada');
    }
    return this.withProgress(goal, user);
  }

  async update(id: string, dto: UpdateGoalDto, user: AuthUser) {
    await this.ensureExists(id, user);
    const goal = await this.prisma.financialGoal.update({
      where: { id },
      data: {
        name: dto.name,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        targetAmount:
          dto.targetAmount !== undefined
            ? new Prisma.Decimal(dto.targetAmount)
            : undefined,
      },
    });
    return this.withProgress(goal, user);
  }

  async remove(id: string, user: AuthUser) {
    await this.ensureExists(id, user);
    await this.prisma.financialGoal.delete({ where: { id } });
    return { deleted: true, id };
  }

  // ─────────────────────────── Helpers ───────────────────────────

  /**
   * Garante que existem metas cobrindo a semana e o mês correntes. O alvo é
   * herdado da última meta do mesmo período (ou o padrão, na primeira vez).
   */
  private async ensureCurrentPeriodGoals(user: AuthUser) {
    const today = salonDateOnly();

    for (const period of [GoalPeriod.WEEKLY, GoalPeriod.MONTHLY] as const) {
      const { startDate, endDate } = this.periodRange(period, today);

      const covering = await this.prisma.financialGoal.findFirst({
        where: {
          period,
          startDate: { lte: today },
          endDate: { gte: today },
          ...ownerWhere(user),
        },
        select: { id: true },
      });
      if (covering) continue;

      const previous = await this.prisma.financialGoal.findFirst({
        where: { period, ...ownerWhere(user) },
        orderBy: { endDate: 'desc' },
        select: { targetAmount: true },
      });

      await this.prisma.financialGoal.create({
        data: {
          period,
          startDate,
          endDate,
          targetAmount:
            previous?.targetAmount ?? new Prisma.Decimal(DEFAULT_TARGET[period]),
          createdById: user.id,
          ownerId: user.id,
        },
      });
    }
  }

  /** Datas da meta: derivadas do período, ou as informadas em CUSTOM. */
  private resolveRange(period: GoalPeriod, dto: CreateGoalDto) {
    if (period === GoalPeriod.CUSTOM) {
      if (!dto.startDate || !dto.endDate) {
        throw new BadRequestException(
          'Informe a data inicial e a final da meta',
        );
      }
      const startDate = new Date(dto.startDate);
      const endDate = new Date(dto.endDate);
      if (endDate < startDate) {
        throw new BadRequestException('A data final deve ser após a inicial');
      }
      return { startDate, endDate };
    }
    return this.periodRange(period, salonDateOnly());
  }

  /** Semana (segunda a domingo) ou mês corrente que contém `today`. */
  private periodRange(period: GoalPeriod, today: Date) {
    if (period === GoalPeriod.WEEKLY) {
      const dow = today.getUTCDay(); // 0=Dom
      const toMonday = dow === 0 ? 6 : dow - 1;
      const startDate = new Date(today);
      startDate.setUTCDate(startDate.getUTCDate() - toMonday);
      const endDate = new Date(startDate);
      endDate.setUTCDate(endDate.getUTCDate() + 6);
      return { startDate, endDate };
    }

    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();
    return {
      startDate: new Date(Date.UTC(year, month, 1)),
      endDate: new Date(Date.UTC(year, month + 1, 0)),
    };
  }

  /** Anexa o progresso da meta (entradas realizadas no período). */
  private async withProgress(goal: FinancialGoal, user: AuthUser) {
    const agg = await this.prisma.financialEntry.aggregate({
      where: {
        category: CashFlowCategory.INCOME,
        date: { gte: goal.startDate, lte: goal.endDate },
        ...ownerWhere(user),
      },
      _sum: { amount: true },
    });

    const achieved = agg._sum.amount ?? new Prisma.Decimal(0);
    const target = goal.targetAmount;
    const remaining = Prisma.Decimal.max(
      target.minus(achieved),
      new Prisma.Decimal(0),
    );
    const percent = target.greaterThan(0)
      ? achieved.div(target).mul(100).toDecimalPlaces(2).toNumber()
      : 0;

    return {
      ...goal,
      progress: {
        achieved: achieved.toFixed(2),
        target: target.toFixed(2),
        remaining: remaining.toFixed(2),
        percent,
        reached: achieved.greaterThanOrEqualTo(target),
      },
    };
  }

  private async ensureExists(id: string, user: AuthUser) {
    const exists = await this.prisma.financialGoal.findFirst({
      where: { id, ...ownerWhere(user) },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Meta não encontrada');
    }
  }
}
