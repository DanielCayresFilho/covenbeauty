import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CashFlowCategory, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { AuthUser } from '@/auth/decorators/current-user.decorator';
import { ownerWhere } from '@/common/ownership';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateAccountDto, ownerId: string) {
    return this.prisma.financialAccount.create({
      data: { name: dto.name.trim(), category: dto.category, ownerId },
    });
  }

  findAll(user: AuthUser, category?: CashFlowCategory) {
    return this.prisma.financialAccount.findMany({
      where: { ...ownerWhere(user), ...(category ? { category } : {}) },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, user: AuthUser) {
    const account = await this.prisma.financialAccount.findFirst({
      where: { id, ...ownerWhere(user) },
    });
    if (!account) {
      throw new NotFoundException('Conta não encontrada');
    }
    return account;
  }

  async update(id: string, dto: UpdateAccountDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.financialAccount.update({
      where: { id },
      data: { name: dto.name?.trim(), isActive: dto.isActive },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    const linked = await this.prisma.financialEntry.count({
      where: { accountId: id },
    });
    if (linked > 0) {
      throw new ConflictException(
        'Não é possível excluir: há lançamentos nesta conta. Inative-a.',
      );
    }
    await this.prisma.financialAccount.delete({ where: { id } });
    return { deleted: true, id };
  }

  /**
   * Traz os procedimentos para o plano de contas como contas de entrada
   * (uma conta INCOME por procedimento que ainda não tenha).
   */
  async syncProcedures(user: AuthUser) {
    const procedures = await this.prisma.procedure.findMany({
      where: { isActive: true, financialAccount: null, ...ownerWhere(user) },
      select: { id: true, name: true, ownerId: true },
    });

    if (procedures.length === 0) {
      return { created: 0 };
    }

    const result = await this.prisma.financialAccount.createMany({
      data: procedures.map((p) => ({
        name: p.name,
        category: CashFlowCategory.INCOME,
        procedureId: p.id,
        ownerId: p.ownerId ?? user.id, // conta de entrada pertence ao dono do procedimento
      })),
    });

    return { created: result.count };
  }
}
