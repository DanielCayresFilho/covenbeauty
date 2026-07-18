import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CashFlowCategory, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateAccountDto) {
    return this.prisma.financialAccount.create({
      data: { name: dto.name.trim(), category: dto.category },
    });
  }

  findAll(category?: CashFlowCategory) {
    return this.prisma.financialAccount.findMany({
      where: category ? { category } : {},
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const account = await this.prisma.financialAccount.findUnique({ where: { id } });
    if (!account) {
      throw new NotFoundException('Conta não encontrada');
    }
    return account;
  }

  async update(id: string, dto: UpdateAccountDto) {
    await this.findOne(id);
    return this.prisma.financialAccount.update({
      where: { id },
      data: { name: dto.name?.trim(), isActive: dto.isActive },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      await this.prisma.financialAccount.delete({ where: { id } });
      return { deleted: true, id };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        throw new ConflictException(
          'Não é possível excluir: há lançamentos nesta conta. Inative-a.',
        );
      }
      throw e;
    }
  }

  /**
   * Traz os procedimentos para o plano de contas como contas de entrada
   * (uma conta INCOME por procedimento que ainda não tenha).
   */
  async syncProcedures() {
    const procedures = await this.prisma.procedure.findMany({
      where: { isActive: true, financialAccount: null },
      select: { id: true, name: true },
    });

    if (procedures.length === 0) {
      return { created: 0 };
    }

    const result = await this.prisma.financialAccount.createMany({
      data: procedures.map((p) => ({
        name: p.name,
        category: CashFlowCategory.INCOME,
        procedureId: p.id,
      })),
    });

    return { created: result.count };
  }
}
