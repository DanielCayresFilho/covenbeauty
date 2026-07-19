import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { AuthUser } from '@/auth/decorators/current-user.decorator';
import { isAdmin, ownerWhere } from '@/common/ownership';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientsDto } from './dto/query-clients.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateClientDto, user: AuthUser) {
    // Só o admin pode atribuir o cliente a outro profissional; os demais viram donos.
    const ownerId = isAdmin(user) && dto.ownerId ? dto.ownerId : user.id;
    return this.prisma.client.create({
      data: {
        fullName: dto.fullName.trim(),
        birthDate: new Date(dto.birthDate),
        phone: dto.phone,
        email: dto.email?.toLowerCase(),
        address: dto.address,
        notes: dto.notes,
        createdById: user.id,
        ownerId,
      },
    });
  }

  async findAll(query: QueryClientsDto, user: AuthUser) {
    const { search, page, limit } = query;

    const where: Prisma.ClientWhereInput = {
      ...ownerWhere(user),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        orderBy: { fullName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: AuthUser) {
    const client = await this.prisma.client.findFirst({
      where: { id, ...ownerWhere(user) },
    });
    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }
    return client;
  }

  async update(id: string, dto: UpdateClientDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.client.update({
      where: { id },
      data: {
        fullName: dto.fullName?.trim(),
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        phone: dto.phone,
        email: dto.email?.toLowerCase(),
        address: dto.address,
        notes: dto.notes,
        // Reatribuição de dono: exclusiva do admin.
        ownerId: isAdmin(user) ? dto.ownerId : undefined,
      },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    await this.prisma.client.delete({ where: { id } });
    return { deleted: true, id };
  }
}
