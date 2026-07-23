import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateProcedureCategoryDto } from './dto/create-procedure-category.dto';
import { UpdateProcedureCategoryDto } from './dto/update-procedure-category.dto';

@Injectable()
export class ProcedureCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProcedureCategoryDto) {
    try {
      return await this.prisma.procedureCategory.create({
        data: { name: dto.name.trim(), description: dto.description },
      });
    } catch (e) {
      throw this.handleUniqueName(e);
    }
  }

  findAll() {
    return this.prisma.procedureCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { procedures: true } } },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.procedureCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Categoria de procedimento não encontrada');
    }
    return category;
  }

  async update(id: string, dto: UpdateProcedureCategoryDto) {
    await this.findOne(id);
    try {
      return await this.prisma.procedureCategory.update({
        where: { id },
        data: { name: dto.name?.trim(), description: dto.description },
      });
    } catch (e) {
      throw this.handleUniqueName(e);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    // Checagem proativa: FK RESTRICT lança código 23001 (não mapeado para P2003).
    const linked = await this.prisma.procedure.count({ where: { categoryId: id } });
    if (linked > 0) {
      throw new ConflictException(
        'Não é possível excluir: há procedimentos vinculados a esta categoria',
      );
    }
    await this.prisma.procedureCategory.delete({ where: { id } });
    return { deleted: true, id };
  }

  private handleUniqueName(e: unknown): Error {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return new ConflictException('Já existe uma categoria com este nome');
    }
    return e instanceof Error ? e : new Error('Erro ao salvar categoria');
  }
}
