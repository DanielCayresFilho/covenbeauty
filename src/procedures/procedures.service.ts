import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { QueryProceduresDto } from './dto/query-procedures.dto';

@Injectable()
export class ProceduresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProcedureDto) {
    await this.assertCategoryExists(dto.categoryId);

    return this.prisma.procedure.create({
      data: {
        name: dto.name.trim(),
        description: dto.description,
        categoryId: dto.categoryId,
        durationMinutes: dto.durationMinutes,
        price: new Prisma.Decimal(dto.price),
      },
      include: { category: true },
    });
  }

  async findAll(query: QueryProceduresDto) {
    const { search, categoryId, page, limit } = query;

    const where: Prisma.ProcedureWhereInput = {
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(categoryId ? { categoryId } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.procedure.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { category: true },
      }),
      this.prisma.procedure.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const procedure = await this.prisma.procedure.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!procedure) {
      throw new NotFoundException('Procedimento não encontrado');
    }
    return procedure;
  }

  async update(id: string, dto: UpdateProcedureDto) {
    await this.findOne(id);
    if (dto.categoryId) {
      await this.assertCategoryExists(dto.categoryId);
    }

    return this.prisma.procedure.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description,
        categoryId: dto.categoryId,
        durationMinutes: dto.durationMinutes,
        price:
          dto.price !== undefined ? new Prisma.Decimal(dto.price) : undefined,
      },
      include: { category: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.procedure.delete({ where: { id } });
    return { deleted: true, id };
  }

  private async assertCategoryExists(categoryId: string) {
    const exists = await this.prisma.procedureCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!exists) {
      throw new BadRequestException('Categoria informada não existe');
    }
  }
}
