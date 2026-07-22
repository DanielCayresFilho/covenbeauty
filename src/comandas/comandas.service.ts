import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  AppointmentType,
  ComandaStatus,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { computeFinancials } from '@/appointments/payment.config';
import { deriveUnitsInStock } from '@/products/stock.util';
import { OpenComandaDto } from './dto/open-comanda.dto';
import { AddComandaProcedureDto } from './dto/add-procedure.dto';
import { AddComandaProductDto } from './dto/add-product.dto';
import { CloseComandaDto } from './dto/close-comanda.dto';
import { QueryComandasDto } from './dto/query-comandas.dto';

const COMANDA_INCLUDE = {
  client: { select: { id: true, fullName: true, phone: true } },
  appointment: {
    select: {
      id: true,
      startTime: true,
      depositAmount: true,
      status: true,
      decalqueFilename: true,
      sessionsPlanned: true,
      sessionNumber: true,
      professional: { select: { id: true, fullName: true } },
    },
  },
  procedures: true,
  products: true,
} satisfies Prisma.ComandaInclude;

@Injectable()
export class ComandasService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────── Abertura ───────────────────────────

  async open(dto: OpenComandaDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      include: { procedures: true, comanda: { select: { id: true } } },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }
    if (appointment.type !== AppointmentType.APPOINTMENT) {
      throw new BadRequestException('Bloqueios não geram comanda');
    }
    if (appointment.comanda) {
      throw new ConflictException('Este agendamento já possui uma comanda');
    }

    // Abre a comanda copiando os procedimentos planejados do agendamento.
    return this.prisma.comanda.create({
      data: {
        appointmentId: appointment.id,
        clientId: appointment.clientId,
        procedures: {
          create: appointment.procedures.map((p) => ({
            procedureId: p.procedureId,
            nameSnapshot: p.nameSnapshot,
            priceSnapshot: p.priceSnapshot,
            durationSnapshot: p.durationSnapshot,
          })),
        },
      },
      include: COMANDA_INCLUDE,
    });
  }

  // ─────────────────────────── Consultas ───────────────────────────

  async findAll(query: QueryComandasDto) {
    const { status, clientId, professionalId, from, to, page, limit } = query;

    const where: Prisma.ComandaWhereInput = {
      ...(status ? { status } : {}),
      ...(clientId ? { clientId } : {}),
      ...(professionalId ? { appointment: { professionalId } } : {}),
      ...(from || to
        ? {
            openedAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.comanda.findMany({
        where,
        orderBy: { openedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: COMANDA_INCLUDE,
      }),
      this.prisma.comanda.count({ where }),
    ]);

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const comanda = await this.prisma.comanda.findUnique({
      where: { id },
      include: COMANDA_INCLUDE,
    });
    if (!comanda) {
      throw new NotFoundException('Comanda não encontrada');
    }
    return { ...comanda, summary: this.buildSummary(comanda) };
  }

  // ─────────────────────── Procedimentos da comanda ───────────────────────

  async addProcedure(comandaId: string, dto: AddComandaProcedureDto) {
    await this.assertOpen(comandaId);

    const procedure = await this.prisma.procedure.findUnique({
      where: { id: dto.procedureId },
    });
    if (!procedure) {
      throw new BadRequestException('Procedimento não encontrado');
    }

    await this.prisma.comandaProcedure.create({
      data: {
        comandaId,
        procedureId: procedure.id,
        nameSnapshot: procedure.name,
        priceSnapshot: procedure.price,
        durationSnapshot: procedure.durationMinutes,
      },
    });

    return this.findOne(comandaId);
  }

  async removeProcedure(comandaId: string, itemId: string) {
    await this.assertOpen(comandaId);

    const item = await this.prisma.comandaProcedure.findUnique({
      where: { id: itemId },
    });
    if (!item || item.comandaId !== comandaId) {
      throw new NotFoundException('Item não encontrado nesta comanda');
    }

    await this.prisma.comandaProcedure.delete({ where: { id: itemId } });
    return this.findOne(comandaId);
  }

  // ─────────────────────── Produtos consumidos ───────────────────────

  async addProduct(comandaId: string, dto: AddComandaProductDto) {
    await this.assertOpen(comandaId);

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new BadRequestException('Produto não encontrado');
    }

    const quantity = new Prisma.Decimal(dto.quantityUsed);
    if (quantity.greaterThan(product.usableQuantity)) {
      throw new BadRequestException(
        `Estoque utilizável insuficiente: disponível ${product.usableQuantity.toString()} ${product.measureUnit}`,
      );
    }

    // Dá baixa na quantidade utilizável e reajusta as unidades derivadas.
    const usableQuantity = product.usableQuantity.minus(quantity);

    await this.prisma.$transaction([
      this.prisma.comandaProduct.create({
        data: {
          comandaId,
          productId: product.id,
          nameSnapshot: product.name,
          quantityUsed: quantity,
          measureUnit: product.measureUnit,
        },
      }),
      this.prisma.product.update({
        where: { id: product.id },
        data: {
          usableQuantity,
          unitsInStock: deriveUnitsInStock(usableQuantity, product.quantityPerUnit),
        },
      }),
    ]);

    return this.findOne(comandaId);
  }

  async removeProduct(comandaId: string, itemId: string) {
    await this.assertOpen(comandaId);

    const item = await this.prisma.comandaProduct.findUnique({
      where: { id: itemId },
    });
    if (!item || item.comandaId !== comandaId) {
      throw new NotFoundException('Item não encontrado nesta comanda');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: item.productId },
    });

    // Estorna a quantidade ao estoque utilizável e reajusta as unidades.
    const ops: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.comandaProduct.delete({ where: { id: itemId } }),
    ];
    if (product) {
      const usableQuantity = product.usableQuantity.plus(item.quantityUsed);
      ops.unshift(
        this.prisma.product.update({
          where: { id: product.id },
          data: {
            usableQuantity,
            unitsInStock: deriveUnitsInStock(usableQuantity, product.quantityPerUnit),
          },
        }),
      );
    }
    await this.prisma.$transaction(ops);

    return this.findOne(comandaId);
  }

  // ─────────────────────────── Fechamento ───────────────────────────

  async close(comandaId: string, dto: CloseComandaDto, userId?: string) {
    const comanda = await this.prisma.comanda.findUnique({
      where: { id: comandaId },
      include: {
        procedures: true,
        appointment: {
          select: { id: true, depositAmount: true, professionalId: true },
        },
      },
    });
    if (!comanda) {
      throw new NotFoundException('Comanda não encontrada');
    }
    if (comanda.status === ComandaStatus.CLOSED) {
      throw new ConflictException('Comanda já está fechada');
    }
    if (comanda.procedures.length === 0) {
      throw new BadRequestException('A comanda não possui procedimentos');
    }

    const subtotal = comanda.procedures.reduce(
      (acc, p) => acc.plus(p.priceSnapshot),
      new Prisma.Decimal(0),
    );
    const discount = new Prisma.Decimal(dto.discount ?? 0);
    const total = Prisma.Decimal.max(subtotal.minus(discount), new Prisma.Decimal(0));

    const deposit = comanda.appointment.depositAmount;
    const amountDue = Prisma.Decimal.max(total.minus(deposit), new Prisma.Decimal(0));

    const installments =
      dto.paymentMethod === PaymentMethod.CREDIT ? dto.installments ?? 1 : 1;

    // Taxa incide sobre o que o cliente paga agora (amountDue).
    const f = computeFinancials(amountDue, 0, dto.paymentMethod, installments);

    // Prepara o retorno (validado ANTES de fechar, para não fechar em caso de erro).
    const returnPlan = dto.willReturn
      ? await this.prepareReturn(comanda, dto)
      : null;

    const { closed, returnAppointment } = await this.prisma.$transaction(
      async (tx) => {
        const closedComanda = await tx.comanda.update({
          where: { id: comandaId },
          data: {
            status: ComandaStatus.CLOSED,
            closedAt: new Date(),
            discount,
            subtotal,
            depositAmount: deposit,
            total,
            amountDue,
            paymentMethod: dto.paymentMethod,
            installments,
            feeRate: f.feeRate,
            feeAmount: f.feeAmount,
            netAmount: f.netAmount,
            notes: dto.notes,
          },
          include: COMANDA_INCLUDE,
        });

        // Fechar a comanda conclui o atendimento.
        await tx.appointment.update({
          where: { id: comanda.appointmentId },
          data: { status: AppointmentStatus.COMPLETED },
        });

        // Cria o agendamento de retorno (se informado), ligado à origem.
        let created: unknown = null;
        if (returnPlan) {
          created = await tx.appointment.create({
            data: {
              type: AppointmentType.APPOINTMENT,
              status: AppointmentStatus.RETURN, // o filho é o retorno em si
              professionalId: returnPlan.professionalId,
              clientId: comanda.clientId,
              startTime: returnPlan.start,
              endTime: returnPlan.end,
              parentId: comanda.appointmentId,
              subtotal: returnPlan.subtotal,
              notes: dto.notes,
              createdById: userId,
              procedures: { create: returnPlan.snapshots },
            },
            include: {
              professional: { select: { id: true, fullName: true } },
              procedures: true,
            },
          });
        }

        return { closed: closedComanda, returnAppointment: created };
      },
    );

    return {
      ...closed,
      summary: this.buildSummary(closed),
      returnAppointment,
    };
  }

  /** Valida e monta o agendamento de retorno a partir dos procedimentos da comanda. */
  private async prepareReturn(
    comanda: {
      appointment: { professionalId: string };
      procedures: {
        procedureId: string | null;
        nameSnapshot: string;
        priceSnapshot: Prisma.Decimal;
        durationSnapshot: number;
      }[];
    },
    dto: CloseComandaDto,
  ) {
    if (!dto.returnDate || !dto.returnProcedureIds?.length) {
      throw new BadRequestException(
        'Para o retorno, informe a data e os procedimentos',
      );
    }

    // Cada procedimento do retorno deve pertencer à comanda.
    const byProcedureId = new Map(
      comanda.procedures.map((p) => [p.procedureId, p]),
    );
    const snapshots = dto.returnProcedureIds.map((procedureId) => {
      const s = byProcedureId.get(procedureId);
      if (!s) {
        throw new BadRequestException(
          'Há procedimentos de retorno que não pertencem à comanda',
        );
      }
      return {
        procedureId: s.procedureId,
        nameSnapshot: s.nameSnapshot,
        priceSnapshot: s.priceSnapshot,
        durationSnapshot: s.durationSnapshot,
      };
    });

    const professionalId =
      dto.returnProfessionalId ?? comanda.appointment.professionalId;
    if (dto.returnProfessionalId) {
      const prof = await this.prisma.user.findUnique({
        where: { id: professionalId },
      });
      if (!prof || !prof.isActive || !prof.isProfessional) {
        throw new BadRequestException('Profissional do retorno inválido');
      }
    }

    const start = new Date(dto.returnDate);
    const totalMinutes = snapshots.reduce((a, s) => a + s.durationSnapshot, 0);
    const end = new Date(start.getTime() + totalMinutes * 60_000);

    // Conflito de horário do profissional no retorno.
    const overlap = await this.prisma.appointment.findFirst({
      where: {
        professionalId,
        startTime: { lt: end },
        endTime: { gt: start },
      },
      select: { id: true },
    });
    if (overlap) {
      throw new ConflictException(
        'O profissional já possui um registro no horário do retorno',
      );
    }

    const subtotal = snapshots.reduce(
      (acc, s) => acc.plus(s.priceSnapshot),
      new Prisma.Decimal(0),
    );

    return { professionalId, start, end, snapshots, subtotal };
  }

  // ─────────────────────────── Remoção ───────────────────────────

  async remove(id: string) {
    const comanda = await this.prisma.comanda.findUnique({
      where: { id },
      include: { products: true },
    });
    if (!comanda) {
      throw new NotFoundException('Comanda não encontrada');
    }
    if (comanda.status === ComandaStatus.CLOSED) {
      throw new ConflictException('Não é possível excluir uma comanda fechada');
    }

    // Soma o que cada produto tem a estornar (pode haver o mesmo produto 2x).
    const restoreByProduct = new Map<string, Prisma.Decimal>();
    for (const p of comanda.products) {
      restoreByProduct.set(
        p.productId,
        (restoreByProduct.get(p.productId) ?? new Prisma.Decimal(0)).plus(
          p.quantityUsed,
        ),
      );
    }

    // Estorna o estoque de cada produto e reajusta as unidades, depois exclui.
    await this.prisma.$transaction(async (tx) => {
      for (const [productId, restored] of restoreByProduct) {
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) continue;
        const usableQuantity = product.usableQuantity.plus(restored);
        await tx.product.update({
          where: { id: productId },
          data: {
            usableQuantity,
            unitsInStock: deriveUnitsInStock(usableQuantity, product.quantityPerUnit),
          },
        });
      }
      await tx.comanda.delete({ where: { id } });
    });

    return { deleted: true, id };
  }

  // ─────────────────────────── Helpers ───────────────────────────

  private async assertOpen(comandaId: string) {
    const comanda = await this.prisma.comanda.findUnique({
      where: { id: comandaId },
      select: { id: true, status: true },
    });
    if (!comanda) {
      throw new NotFoundException('Comanda não encontrada');
    }
    if (comanda.status !== ComandaStatus.OPEN) {
      throw new ConflictException('A comanda está fechada');
    }
  }

  /** Prévia dos valores enquanto a comanda está aberta (sinal já abatido). */
  private buildSummary(comanda: {
    discount: Prisma.Decimal;
    procedures: { priceSnapshot: Prisma.Decimal }[];
    appointment: { depositAmount: Prisma.Decimal };
  }) {
    const subtotal = comanda.procedures.reduce(
      (acc, p) => acc.plus(p.priceSnapshot),
      new Prisma.Decimal(0),
    );
    const total = Prisma.Decimal.max(
      subtotal.minus(comanda.discount),
      new Prisma.Decimal(0),
    );
    const deposit = comanda.appointment.depositAmount;
    const amountDue = Prisma.Decimal.max(
      total.minus(deposit),
      new Prisma.Decimal(0),
    );

    return {
      subtotal: subtotal.toFixed(2),
      discount: comanda.discount.toFixed(2),
      total: total.toFixed(2),
      depositPaid: deposit.toFixed(2),
      amountDue: amountDue.toFixed(2),
    };
  }
}
