import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

const SAFE_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  isProfessional: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  updateLastLogin(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      select: SAFE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  listProfessionals() {
    return this.prisma.user.findMany({
      where: { isProfessional: true, isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
    });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.findByEmail(dto.email.toLowerCase());
    if (existing) {
      throw new ConflictException('Já existe um usuário com este e-mail');
    }
    const passwordHash = await argon2.hash(dto.password, ARGON2_OPTIONS);
    return this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName.trim(),
        role: dto.role ?? Role.STAFF,
        isProfessional: dto.isProfessional ?? false,
      },
      select: SAFE_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const exists = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName?.trim(),
        isActive: dto.isActive,
        isProfessional: dto.isProfessional,
        role: dto.role,
      },
      select: SAFE_SELECT,
    });
  }
}
