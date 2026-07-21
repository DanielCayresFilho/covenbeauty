import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  AppointmentType,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateBlockDto } from './dto/create-block.dto';
import { CreateReturnDto } from './dto/create-return.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { computeFinancials } from './payment.config';

interface ProcedureSnapshot {
  procedureId: string;
  nameSnapshot: string;
  priceSnapshot: Prisma.Decimal;
  durationSnapshot: number;
}

/** Campos financeiros escritos no agendamento (compatível com create e update). */
interface FinancialData {
  subtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  installments: number;
  paymentMethod: PaymentMethod | null;
  feeRate: Prisma.Decimal | null;
  feeAmount: Prisma.Decimal | null;
  feePassedToClient: boolean;
  amountChargedToClient: Prisma.Decimal | null;
  netAmount: Prisma.Decimal | null;
}

const APPOINTMENT_INCLUDE = {
  professional: { select: { id: true, fullName: true } },
  client: { select: { id: true, fullName: true, phone: true } },
  procedures: true,
  comanda: { select: { id: true, status: true } },
} satisfies Prisma.AppointmentInclude;

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────── Atendimento ───────────────────────────

  async create(dto: CreateAppointmentDto, createdById: string) {
    await this.assertProfessional(dto.professionalId);
    await this.assertClient(dto.clientId);

    const snapshots = await this.loadProcedureSnapshots(dto.procedureIds);
    const start = new Date(dto.startTime);
    // Fim manual (ex.: tatuagem — duração variável) tem prioridade sobre a soma
    // das durações dos procedimentos.
    const end = dto.endTime
      ? new Date(dto.endTime)
      : this.addMinutes(start, this.totalDuration(snapshots));
    if (end <= start) {
      throw new BadRequestException('O fim deve ser após o início');
    }

    await this.assertNoOverlap(dto.professionalId, start, end);

    const financial = this.buildFinancialData(
      snapshots,
      dto.discount ?? 0,
      dto.paymentMethod,
      dto.installments ?? 1,
    );

    return this.prisma.appointment.create({
      data: {
        type: AppointmentType.APPOINTMENT,
        status: dto.status ?? AppointmentStatus.SCHEDULED,
        professionalId: dto.professionalId,
        clientId: dto.clientId,
        startTime: start,
        endTime: end,
        notes: dto.notes,
        sessionsPlanned: dto.sessionsPlanned,
        sessionNumber: dto.sessionNumber,
        createdById,
        ...(dto.depositAmount != null
          ? {
              depositAmount: new Prisma.Decimal(dto.depositAmount),
              depositPaidAt: dto.depositAmount > 0 ? new Date() : null,
            }
          : {}),
        ...financial,
        procedures: { create: snapshots },
      },
      include: APPOINTMENT_INCLUDE,
    });
  }

  // ─────────────────────────── Bloqueio ───────────────────────────

  async createBlock(dto: CreateBlockDto, createdById: string) {
    await this.assertProfessional(dto.professionalId);

    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (end <= start) {
      throw new BadRequestException('O fim do bloqueio deve ser após o início');
    }

    await this.assertNoOverlap(dto.professionalId, start, end);

    return this.prisma.appointment.create({
      data: {
        type: AppointmentType.BLOCK,
        professionalId: dto.professionalId,
        startTime: start,
        endTime: end,
        notes: dto.notes,
        createdById,
      },
      include: APPOINTMENT_INCLUDE,
    });
  }

  // ─────────────────────────── Retorno ───────────────────────────

  async createReturn(parentId: string, dto: CreateReturnDto, createdById: string) {
    const parent = await this.prisma.appointment.findUnique({
      where: { id: parentId },
      include: { procedures: true },
    });
    if (!parent) {
      throw new NotFoundException('Agendamento de origem não encontrado');
    }
    if (parent.type !== AppointmentType.APPOINTMENT) {
      throw new BadRequestException('Retorno só se aplica a atendimentos');
    }

    // Os procedimentos escolhidos devem pertencer ao agendamento de origem.
    const originProcedureIds = new Set(parent.procedures.map((p) => p.procedureId));
    const invalid = dto.procedureIds.filter((id) => !originProcedureIds.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException(
        'Há procedimentos que não pertencem ao agendamento de origem',
      );
    }

    const professionalId = dto.professionalId ?? parent.professionalId;
    await this.assertProfessional(professionalId);

    const snapshots = await this.loadProcedureSnapshots(dto.procedureIds);
    const start = new Date(dto.startTime);
    const end = this.addMinutes(start, this.totalDuration(snapshots));

    await this.assertNoOverlap(professionalId, start, end);

    // Cria o retorno; a origem fica COMPLETED (serviço realizado). O vínculo
    // fica pelo parentId do filho.
    const [, created] = await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: parent.id },
        data: { status: AppointmentStatus.COMPLETED },
      }),
      this.prisma.appointment.create({
        data: {
          type: AppointmentType.APPOINTMENT,
          status: AppointmentStatus.RETURN, // o filho é o retorno em si
          professionalId,
          clientId: parent.clientId,
          startTime: start,
          endTime: end,
          notes: dto.notes,
          parentId: parent.id,
          createdById,
          subtotal: snapshots.reduce(
            (acc, s) => acc.plus(s.priceSnapshot),
            new Prisma.Decimal(0),
          ),
          procedures: { create: snapshots },
        },
        include: APPOINTMENT_INCLUDE,
      }),
    ]);

    return created;
  }

  // ─────────────────────────── Consultas ───────────────────────────

  async findAll(query: QueryAppointmentsDto) {
    const { professionalId, clientId, status, type, from, to, page, limit } = query;

    const where: Prisma.AppointmentWhereInput = {
      ...(professionalId ? { professionalId } : {}),
      ...(clientId ? { clientId } : {}),
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(from || to
        ? {
            startTime: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        orderBy: { startTime: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: APPOINTMENT_INCLUDE,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { ...APPOINTMENT_INCLUDE, returns: true, parent: true },
    });
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }
    return appointment;
  }

  // ─────────────────────────── Atualização ───────────────────────────

  async update(id: string, dto: UpdateAppointmentDto) {
    const current = await this.prisma.appointment.findUnique({
      where: { id },
      include: { procedures: true },
    });
    if (!current) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    if (dto.professionalId) await this.assertProfessional(dto.professionalId);
    if (dto.clientId) await this.assertClient(dto.clientId);

    const data: Prisma.AppointmentUpdateInput = {};

    // Procedimentos e/ou horário: recalcula duração e fim.
    let snapshots: ProcedureSnapshot[] | null = null;
    if (dto.procedureIds) {
      if (current.type !== AppointmentType.APPOINTMENT) {
        throw new BadRequestException('Bloqueios não possuem procedimentos');
      }
      snapshots = await this.loadProcedureSnapshots(dto.procedureIds);
    }

    const professionalId = dto.professionalId ?? current.professionalId;
    const start = dto.startTime ? new Date(dto.startTime) : current.startTime;

    const durationSource =
      snapshots ??
      current.procedures.map((p) => ({ durationSnapshot: p.durationSnapshot }));
    const end =
      current.type === AppointmentType.BLOCK
        ? current.endTime
        : dto.endTime
          ? new Date(dto.endTime) // fim manual (ex.: tatuagem)
          : this.addMinutes(start, this.totalDurationOf(durationSource));

    if (dto.startTime || dto.procedureIds || dto.professionalId || dto.endTime) {
      if (end <= start) {
        throw new BadRequestException('O fim deve ser após o início');
      }
      await this.assertNoOverlap(professionalId, start, end, id);
      data.startTime = start;
      data.endTime = end;
    }

    if (dto.professionalId) data.professional = { connect: { id: dto.professionalId } };
    if (dto.clientId) data.client = { connect: { id: dto.clientId } };
    if (dto.status) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.sessionsPlanned !== undefined) data.sessionsPlanned = dto.sessionsPlanned;
    if (dto.sessionNumber !== undefined) data.sessionNumber = dto.sessionNumber;
    if (dto.depositAmount !== undefined) {
      data.depositAmount = new Prisma.Decimal(dto.depositAmount);
      data.depositPaidAt = dto.depositAmount > 0 ? new Date() : null;
    }

    if (snapshots) {
      // Substitui os procedimentos.
      data.procedures = {
        deleteMany: {},
        create: snapshots,
      };
    }

    // Recalcula o financeiro se pagamento/desconto/procedimentos mudaram.
    const touchesMoney =
      dto.paymentMethod !== undefined ||
      dto.discount !== undefined ||
      dto.installments !== undefined ||
      snapshots !== null;

    if (touchesMoney && current.type === AppointmentType.APPOINTMENT) {
      const effectiveSnapshots =
        snapshots ??
        current.procedures.map((p) => ({
          priceSnapshot: p.priceSnapshot,
        }));
      const method = dto.paymentMethod ?? current.paymentMethod ?? undefined;
      const discount =
        dto.discount ?? current.discount.toNumber();
      const installments = dto.installments ?? current.installments;
      Object.assign(
        data,
        this.buildFinancialData(effectiveSnapshots, discount, method, installments),
      );
    }

    return this.prisma.appointment.update({
      where: { id },
      data,
      include: APPOINTMENT_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.appointment.delete({ where: { id } });
    return { deleted: true, id };
  }

  // ─────────────────────────── Helpers ───────────────────────────

  private buildFinancialData(
    snapshots: { priceSnapshot: Prisma.Decimal }[],
    discount: Prisma.Decimal.Value,
    method: PaymentMethod | undefined,
    installments: number,
  ): FinancialData {
    const subtotal = snapshots.reduce(
      (acc, s) => acc.plus(s.priceSnapshot),
      new Prisma.Decimal(0),
    );

    // Sem forma de pagamento: só registramos subtotal e desconto.
    if (!method) {
      return {
        subtotal,
        discount: new Prisma.Decimal(discount),
        installments: 1,
        paymentMethod: null,
        feeRate: null,
        feeAmount: null,
        feePassedToClient: false,
        amountChargedToClient: null,
        netAmount: null,
      };
    }

    // Parcelas só fazem sentido no crédito.
    const effectiveInstallments =
      method === PaymentMethod.CREDIT ? installments : 1;

    const f = computeFinancials(subtotal, discount, method, effectiveInstallments);
    return {
      paymentMethod: method,
      installments: effectiveInstallments,
      subtotal: f.subtotal,
      discount: f.discount,
      feeRate: f.feeRate,
      feeAmount: f.feeAmount,
      feePassedToClient: f.feePassedToClient,
      amountChargedToClient: f.amountChargedToClient,
      netAmount: f.netAmount,
    };
  }

  private async loadProcedureSnapshots(
    procedureIds: string[],
  ): Promise<ProcedureSnapshot[]> {
    const procedures = await this.prisma.procedure.findMany({
      where: { id: { in: procedureIds } },
    });
    const byId = new Map(procedures.map((p) => [p.id, p]));

    return procedureIds.map((id) => {
      const p = byId.get(id);
      if (!p) {
        throw new BadRequestException(`Procedimento ${id} não encontrado`);
      }
      return {
        procedureId: p.id,
        nameSnapshot: p.name,
        priceSnapshot: p.price,
        durationSnapshot: p.durationMinutes,
      };
    });
  }

  private totalDuration(snapshots: ProcedureSnapshot[]): number {
    return snapshots.reduce((acc, s) => acc + s.durationSnapshot, 0);
  }

  private totalDurationOf(items: { durationSnapshot: number }[]): number {
    return items.reduce((acc, s) => acc + s.durationSnapshot, 0);
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60_000);
  }

  private async assertProfessional(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || !user.isActive || !user.isProfessional) {
      throw new BadRequestException('Profissional inválido ou inativo');
    }
  }

  private async assertClient(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) {
      throw new BadRequestException('Cliente informado não existe');
    }
  }

  /** Impede dois registros (atendimento ou bloqueio) sobrepostos no mesmo profissional. */
  private async assertNoOverlap(
    professionalId: string,
    start: Date,
    end: Date,
    excludeId?: string,
  ) {
    const overlap = await this.prisma.appointment.findFirst({
      where: {
        professionalId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        // sobrepõe se começa antes do fim do novo E termina depois do início do novo
        startTime: { lt: end },
        endTime: { gt: start },
      },
      select: { id: true, startTime: true, endTime: true },
    });

    if (overlap) {
      throw new ConflictException(
        'O profissional já possui um registro nesse horário',
      );
    }
  }
}
