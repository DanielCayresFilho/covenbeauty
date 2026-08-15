import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CashFlowCategory, FixedExpense, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { AuthUser } from '@/auth/decorators/current-user.decorator';
import { ownerWhere } from '@/common/ownership';
import { salonDateOnly, utcDateString } from '@/common/salon-date';
import { CreateFixedExpenseDto } from './dto/create-fixed-expense.dto';
import { UpdateFixedExpenseDto } from './dto/update-fixed-expense.dto';
import { PayFixedExpenseDto } from './dto/pay-fixed-expense.dto';

/** Conta usada quando a despesa não aponta para nenhuma. */
const DEFAULT_ACCOUNT = 'Contas Fixas';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class FixedExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFixedExpenseDto, user: AuthUser) {
    if (dto.accountId) await this.assertExpenseAccount(dto.accountId, user);

    const expense = await this.prisma.fixedExpense.create({
      data: {
        name: dto.name.trim(),
        amount: new Prisma.Decimal(dto.amount),
        dueDay: dto.dueDay,
        description: dto.description,
        accountId: dto.accountId,
        ownerId: user.id,
      },
    });
    return this.decorate(expense);
  }

  /** Lista as despesas ativas, já com vencimento e situação do mês. */
  async findAll(user: AuthUser, includeInactive = false) {
    const expenses = await this.prisma.fixedExpense.findMany({
      where: {
        ...ownerWhere(user),
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ dueDay: 'asc' }, { name: 'asc' }],
    });

    const paidIds = await this.paidThisMonth(
      expenses.map((e) => e.id),
      user,
    );
    return expenses.map((e) => this.decorate(e, paidIds.has(e.id)));
  }

  /** Despesas que vencem nos próximos `days` dias e ainda não foram pagas. */
  async upcoming(user: AuthUser, days = 15) {
    const all = await this.findAll(user);
    return all
      .filter(
        (e) => !e.paidThisMonth && e.daysUntilDue >= 0 && e.daysUntilDue <= days,
      )
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }

  async findOne(id: string, user: AuthUser) {
    const expense = await this.getOrThrow(id, user);
    const paid = await this.paidThisMonth([id], user);
    return this.decorate(expense, paid.has(id));
  }

  async update(id: string, dto: UpdateFixedExpenseDto, user: AuthUser) {
    await this.getOrThrow(id, user);
    if (dto.accountId) await this.assertExpenseAccount(dto.accountId, user);

    const expense = await this.prisma.fixedExpense.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        amount:
          dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : undefined,
        dueDay: dto.dueDay,
        description: dto.description,
        accountId: dto.accountId,
        isActive: dto.isActive,
      },
    });
    return this.decorate(expense);
  }

  /** Desativa (não apaga: os pagamentos já lançados continuam no fluxo). */
  async remove(id: string, user: AuthUser) {
    await this.getOrThrow(id, user);
    await this.prisma.fixedExpense.update({
      where: { id },
      data: { isActive: false },
    });
    return { deleted: true, id };
  }

  /**
   * Registra o pagamento: cria o lançamento de despesa fixa no fluxo de caixa.
   * Recusa um segundo pagamento no mesmo mês de competência.
   */
  async pay(id: string, dto: PayFixedExpenseDto, user: AuthUser) {
    const expense = await this.getOrThrow(id, user);

    const date = dto.date
      ? new Date(`${dto.date}T00:00:00.000Z`)
      : salonDateOnly();
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Data inválida');
    }

    const existing = await this.prisma.financialEntry.findFirst({
      where: {
        fixedExpenseId: id,
        ...this.monthRange(date.getUTCFullYear(), date.getUTCMonth()),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'Esta despesa já foi paga neste mês. Remova o lançamento antes de pagar de novo.',
      );
    }

    const accountId =
      expense.accountId ?? (await this.defaultAccount(expense.ownerId));

    const entry = await this.prisma.financialEntry.create({
      data: {
        date,
        category: CashFlowCategory.FIXED_EXPENSE,
        amount:
          dto.amount !== undefined
            ? new Prisma.Decimal(dto.amount)
            : expense.amount,
        accountId,
        fixedExpenseId: expense.id,
        description: `Pagamento — ${expense.name}`,
        createdById: user.id,
        ownerId: expense.ownerId,
      },
      include: { account: { select: { id: true, name: true } } },
    });

    return { expense: this.decorate(expense, true), entry };
  }

  // ─────────────────────────── Helpers ───────────────────────────

  private async getOrThrow(id: string, user: AuthUser) {
    const expense = await this.prisma.fixedExpense.findFirst({
      where: { id, ...ownerWhere(user) },
    });
    if (!expense) {
      throw new NotFoundException('Despesa fixa não encontrada');
    }
    return expense;
  }

  private async assertExpenseAccount(accountId: string, user: AuthUser) {
    const account = await this.prisma.financialAccount.findFirst({
      where: { id: accountId, ...ownerWhere(user) },
      select: { category: true },
    });
    if (!account) {
      throw new BadRequestException('Conta informada não existe');
    }
    if (account.category !== CashFlowCategory.FIXED_EXPENSE) {
      throw new BadRequestException(
        'A conta da despesa fixa precisa ser do tipo "Despesa fixa"',
      );
    }
  }

  private async defaultAccount(ownerId: string) {
    const existing = await this.prisma.financialAccount.findFirst({
      where: {
        name: DEFAULT_ACCOUNT,
        category: CashFlowCategory.FIXED_EXPENSE,
        ownerId,
      },
      select: { id: true },
    });
    if (existing) return existing.id;

    const created = await this.prisma.financialAccount.create({
      data: {
        name: DEFAULT_ACCOUNT,
        category: CashFlowCategory.FIXED_EXPENSE,
        ownerId,
      },
      select: { id: true },
    });
    return created.id;
  }

  /** Ids das despesas que já têm pagamento lançado no mês corrente. */
  private async paidThisMonth(ids: string[], user: AuthUser) {
    if (ids.length === 0) return new Set<string>();

    const today = salonDateOnly();
    const paid = await this.prisma.financialEntry.findMany({
      where: {
        fixedExpenseId: { in: ids },
        ...ownerWhere(user),
        ...this.monthRange(today.getUTCFullYear(), today.getUTCMonth()),
      },
      select: { fixedExpenseId: true },
    });
    return new Set(paid.map((p) => p.fixedExpenseId!));
  }

  private monthRange(year: number, monthIndex: number) {
    return {
      date: {
        gte: new Date(Date.UTC(year, monthIndex, 1)),
        lt: new Date(Date.UTC(year, monthIndex + 1, 1)),
      },
    };
  }

  /** Anexa próximo vencimento, dias restantes e situação do mês. */
  private decorate(expense: FixedExpense, paidThisMonth = false) {
    const today = salonDateOnly();
    const nextDueDate = this.nextDueDate(expense.dueDay, today);
    const daysUntilDue = Math.round(
      (nextDueDate.getTime() - today.getTime()) / DAY_MS,
    );

    return {
      ...expense,
      amount: expense.amount.toFixed(2),
      nextDueDate: utcDateString(nextDueDate),
      daysUntilDue,
      overdue: daysUntilDue < 0,
      paidThisMonth,
    };
  }

  /**
   * Próximo vencimento a partir de hoje. Um dia 31 numa competência de 30 dias
   * cai no último dia do mês.
   */
  private nextDueDate(dueDay: number, today: Date) {
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();

    const forMonth = (y: number, m: number) => {
      const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      return new Date(Date.UTC(y, m, Math.min(dueDay, lastDay)));
    };

    const thisMonth = forMonth(year, month);
    return thisMonth >= today ? thisMonth : forMonth(year, month + 1);
  }
}
