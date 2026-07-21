import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { QueryEvaluationsDto } from './dto/query-evaluations.dto';

const CLIENT_SELECT = {
  client: { select: { id: true, fullName: true, phone: true } },
  // Fotos da ficha (histórico antes/depois por etapa).
  photos: {
    orderBy: [{ stage: 'asc' }, { session: 'asc' }, { moment: 'asc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.ClientEvaluationInclude;

@Injectable()
export class EvaluationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEvaluationDto, createdById?: string) {
    const {
      clientId,
      evaluationDate,
      lastChemicalDate,
      signedAt,
      waterIntakeLiters,
      ...rest
    } = dto;

    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new BadRequestException('Cliente informado não existe');
    }

    return this.prisma.clientEvaluation.create({
      data: {
        ...rest,
        client: { connect: { id: clientId } },
        createdById,
        ...(evaluationDate ? { evaluationDate: new Date(evaluationDate) } : {}),
        ...(lastChemicalDate
          ? { lastChemicalDate: new Date(lastChemicalDate) }
          : {}),
        ...(signedAt ? { signedAt: new Date(signedAt) } : {}),
        ...(waterIntakeLiters !== undefined
          ? { waterIntakeLiters: new Prisma.Decimal(waterIntakeLiters) }
          : {}),
      },
      include: CLIENT_SELECT,
    });
  }

  async findAll(query: QueryEvaluationsDto) {
    const { clientId, focus, page, limit } = query;

    const where: Prisma.ClientEvaluationWhereInput = {
      ...(clientId ? { clientId } : {}),
      ...(focus ? { focus } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.clientEvaluation.findMany({
        where,
        orderBy: { evaluationDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: CLIENT_SELECT,
      }),
      this.prisma.clientEvaluation.count({ where }),
    ]);

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const evaluation = await this.prisma.clientEvaluation.findUnique({
      where: { id },
      include: CLIENT_SELECT,
    });
    if (!evaluation) {
      throw new NotFoundException('Ficha de avaliação não encontrada');
    }
    return evaluation;
  }

  async update(id: string, dto: UpdateEvaluationDto) {
    await this.findOne(id);

    const {
      evaluationDate,
      lastChemicalDate,
      signedAt,
      waterIntakeLiters,
      ...rest
    } = dto;

    return this.prisma.clientEvaluation.update({
      where: { id },
      data: {
        ...rest,
        ...(evaluationDate ? { evaluationDate: new Date(evaluationDate) } : {}),
        ...(lastChemicalDate
          ? { lastChemicalDate: new Date(lastChemicalDate) }
          : {}),
        ...(signedAt ? { signedAt: new Date(signedAt) } : {}),
        ...(waterIntakeLiters !== undefined
          ? { waterIntakeLiters: new Prisma.Decimal(waterIntakeLiters) }
          : {}),
      },
      include: CLIENT_SELECT,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.clientEvaluation.delete({ where: { id } });
    return { deleted: true, id };
  }
}
