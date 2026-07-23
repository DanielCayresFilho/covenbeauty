import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { AuthUser } from '@/auth/decorators/current-user.decorator';
import { ownerWhere } from '@/common/ownership';
import { CreateRecurringBlockDto } from './dto/recurring-block.dto';

@Injectable()
export class RecurringBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRecurringBlockDto, user: AuthUser) {
    if (dto.endMinute <= dto.startMinute) {
      throw new BadRequestException('O fim deve ser após o início');
    }
    const prof = await this.prisma.user.findUnique({
      where: { id: dto.professionalId },
      select: { isActive: true, isProfessional: true },
    });
    if (!prof || !prof.isActive || !prof.isProfessional) {
      throw new BadRequestException('Profissional inválido');
    }
    return this.prisma.recurringBlock.create({
      data: { ...dto, ownerId: user.id },
    });
  }

  findAll(user: AuthUser) {
    return this.prisma.recurringBlock.findMany({
      where: ownerWhere(user),
      orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
    });
  }

  async remove(id: string, user: AuthUser) {
    const block = await this.prisma.recurringBlock.findFirst({
      where: { id, ...ownerWhere(user) },
    });
    if (!block) {
      throw new NotFoundException('Bloqueio não encontrado');
    }
    await this.prisma.recurringBlock.delete({ where: { id } });
    return { deleted: true, id };
  }
}
