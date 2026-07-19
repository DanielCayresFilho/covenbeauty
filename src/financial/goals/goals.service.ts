import { Injectable, NotFoundException } from '@nestjs/common';
import { CashFlowCategory, FinancialGoal, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { AuthUser } from '@/auth/decorators/current-user.decorator';
import { ownerWhere } from '@/common/ownership';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateGoalDto, ownerId: string) {
    return this.prisma.financialGoal.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        targetAmount: new Prisma.Decimal(dto.targetAmount),
        createdById: ownerId,
        ownerId,
      },
    });
  }

  async findAll(user: AuthUser) {
    const goals = await this.prisma.financialGoal.findMany({
      where: ownerWhere(user),
      orderBy: { startDate: 'desc' },
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
