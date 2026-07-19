import {
  BadRequestException,
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

@Injectable()
export class EntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEntryDto, user: AuthUser) {
    let category: CashFlowCategory;

    if (dto.accountId) {
      // Lançamento por conta: a categoria vem da conta (do próprio profissional).
      const account = await this.prisma.financialAccount.findFirst({
        where: { id: dto.accountId, ...ownerWhere(user) },
      });
      if (!account) {
        throw new BadRequestException('Conta informada não existe');
      }
      category = account.category;
    } else {
      // Sem conta: só movimentações abaixo da linha.
      if (!dto.category || !BELOW_LINE_CATEGORIES.includes(dto.category)) {
        throw new BadRequestException(
          'Informe uma conta (accountId) ou uma categoria de movimentação (PROFIT_DISTRIBUTION, APPLICATION ou REDEMPTION)',
        );
      }
      category = dto.category;
    }

    return this.prisma.financialEntry.create({
      data: {
        date: new Date(dto.date),
        category,
        amount: new Prisma.Decimal(dto.amount),
        accountId: dto.accountId,
        description: dto.description,
        createdById: user.id,
        ownerId: user.id,
      },
      include: { account: true },
    });
  }

  async findAll(query: QueryEntriesDto, user: AuthUser) {
    const { category, accountId, from, to, page, limit } = query;

    const where: Prisma.FinancialEntryWhereInput = {
      ...ownerWhere(user),
      ...(category ? { category } : {}),
      ...(accountId ? { accountId } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.financialEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { account: true },
      }),
      this.prisma.financialEntry.count({ where }),
    ]);

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, user: AuthUser) {
    const entry = await this.prisma.financialEntry.findFirst({
      where: { id, ...ownerWhere(user) },
      include: { account: true },
    });
    if (!entry) {
      throw new NotFoundException('Lançamento não encontrado');
    }
    return entry;
  }

  async update(id: string, dto: UpdateEntryDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.financialEntry.update({
      where: { id },
      data: {
        date: dto.date ? new Date(dto.date) : undefined,
        amount: dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : undefined,
        description: dto.description,
      },
      include: { account: true },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    await this.prisma.financialEntry.delete({ where: { id } });
    return { deleted: true, id };
  }
}
