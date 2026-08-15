import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CashFlowCategory, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { AuthUser } from '@/auth/decorators/current-user.decorator';
import { ownerWhere } from '@/common/ownership';
import { BELOW_LINE_CATEGORIES } from '../financial.constants';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { QueryEntriesDto } from './dto/query-entries.dto';

const ENTRY_INCLUDE = {
  account: { select: { id: true, name: true, category: true } },
  client: { select: { id: true, fullName: true } },
} satisfies Prisma.FinancialEntryInclude;

@Injectable()
export class EntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEntryDto, user: AuthUser) {
    const category = await this.resolveCategory(dto.accountId, dto.category, user);
    if (dto.clientId) await this.assertClient(dto.clientId, user);

    return this.prisma.financialEntry.create({
      data: {
        date: new Date(dto.date),
        category,
        amount: new Prisma.Decimal(dto.amount),
        accountId: dto.accountId,
        clientId: dto.clientId,
        description: dto.description,
        createdById: user.id,
        ownerId: user.id,
      },
      include: ENTRY_INCLUDE,
    });
  }

  async findAll(query: QueryEntriesDto, user: AuthUser) {
    const { category, accountId, clientId, from, to, page, limit } = query;

    const where: Prisma.FinancialEntryWhereInput = {
      ...ownerWhere(user),
      ...(category ? { category } : {}),
      ...(accountId ? { accountId } : {}),
      ...(clientId ? { clientId } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const [data, total, sums] = await this.prisma.$transaction([
      this.prisma.financialEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: ENTRY_INCLUDE,
      }),
      this.prisma.financialEntry.count({ where }),
      // Totais do filtro inteiro (não só da página) — alimenta os cards do topo.
      this.prisma.financialEntry.groupBy({
        by: ['category'],
        where,
        _sum: { amount: true },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        totals: this.summarize(sums),
      },
    };
  }

  async findOne(id: string, user: AuthUser) {
    const entry = await this.prisma.financialEntry.findFirst({
      where: { id, ...ownerWhere(user) },
      include: ENTRY_INCLUDE,
    });
    if (!entry) {
      throw new NotFoundException('Lançamento não encontrado');
    }
    return entry;
  }

  async update(id: string, dto: UpdateEntryDto, user: AuthUser) {
    const current = await this.findOne(id, user);

    if (current.comandaId) {
      throw new ConflictException(
        'Este lançamento veio de uma comanda. Reabra a comanda para alterá-lo.',
      );
    }
    if (dto.clientId) await this.assertClient(dto.clientId, user);

    // Trocar a conta (ou a movimentação) recalcula a categoria.
    const changingSource = dto.accountId !== undefined || dto.category !== undefined;
    const category = changingSource
      ? await this.resolveCategory(
          dto.accountId ?? undefined,
          dto.category ?? undefined,
          user,
        )
      : undefined;

    return this.prisma.financialEntry.update({
      where: { id },
      data: {
        date: dto.date ? new Date(dto.date) : undefined,
        amount:
          dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : undefined,
        accountId: changingSource ? (dto.accountId ?? null) : undefined,
        category,
        clientId: dto.clientId === undefined ? undefined : dto.clientId,
        description: dto.description,
      },
      include: ENTRY_INCLUDE,
    });
  }

  async remove(id: string, user: AuthUser) {
    const entry = await this.findOne(id, user);
    if (entry.comandaId) {
      throw new ConflictException(
        'Este lançamento veio de uma comanda. Reabra a comanda para removê-lo.',
      );
    }
    await this.prisma.financialEntry.delete({ where: { id } });
    return { deleted: true, id };
  }

  // ─────────────────────────── Helpers ───────────────────────────

  /** A categoria vem da conta; sem conta, só as movimentações abaixo da linha. */
  private async resolveCategory(
    accountId: string | undefined,
    category: CashFlowCategory | undefined,
    user: AuthUser,
  ): Promise<CashFlowCategory> {
    if (accountId) {
      const account = await this.prisma.financialAccount.findFirst({
        where: { id: accountId, ...ownerWhere(user) },
      });
      if (!account) {
        throw new BadRequestException('Conta informada não existe');
      }
      return account.category;
    }

    if (!category || !BELOW_LINE_CATEGORIES.includes(category)) {
      throw new BadRequestException(
        'Informe uma conta (accountId) ou uma categoria de movimentação (PROFIT_DISTRIBUTION, APPLICATION ou REDEMPTION)',
      );
    }
    return category;
  }

  private async assertClient(clientId: string, user: AuthUser) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, ...ownerWhere(user) },
      select: { id: true },
    });
    if (!client) {
      throw new BadRequestException('Cliente informado não existe');
    }
  }

  /** Entradas, saídas (sem pró-labore) e lucro do conjunto filtrado. */
  private summarize(
    sums: { category: CashFlowCategory; _sum: { amount: Prisma.Decimal | null } }[],
  ) {
    const zero = new Prisma.Decimal(0);
    const by = (c: CashFlowCategory) =>
      sums.find((s) => s.category === c)?._sum.amount ?? zero;

    const entradas = by(CashFlowCategory.INCOME);
    const proLabore = by(CashFlowCategory.PRO_LABORE);
    // Pró-labore fora das saídas, igual ao fluxo de caixa.
    const saidas = by(CashFlowCategory.VARIABLE_COST)
      .plus(by(CashFlowCategory.FIXED_EXPENSE))
      .plus(by(CashFlowCategory.INVESTMENT));

    return {
      entradas: entradas.toFixed(2),
      saidas: saidas.toFixed(2),
      proLabore: proLabore.toFixed(2),
      lucro: entradas.minus(saidas).toFixed(2),
    };
  }
}
