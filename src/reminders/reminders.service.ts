import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Reminder, ReminderType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { QueryRemindersDto } from './dto/query-reminders.dto';
import { GenerateBirthdaysDto } from './dto/generate-birthdays.dto';

const REMINDER_INCLUDE = {
  client: { select: { id: true, fullName: true, phone: true } },
} satisfies Prisma.ReminderInclude;

type ReminderWithClient = Reminder & {
  client?: { id: string; fullName: string; phone: string } | null;
};

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReminderDto, createdById?: string) {
    const reminder = await this.prisma.reminder.create({
      data: {
        title: dto.title.trim(),
        description: dto.description,
        dueDate: new Date(dto.dueDate),
        priority: dto.priority,
        createdById,
      },
      include: REMINDER_INCLUDE,
    });
    return this.decorate(reminder);
  }

  async findAll(query: QueryRemindersDto) {
    const { status, type, priority, from, to, page, limit } = query;
    const now = new Date();

    const where: Prisma.ReminderWhereInput = {
      ...(type ? { type } : {}),
      ...(priority ? { priority } : {}),
      ...(from || to
        ? {
            dueDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(status === 'pending' ? { completedAt: null } : {}),
      ...(status === 'completed' ? { completedAt: { not: null } } : {}),
      ...(status === 'overdue'
        ? { completedAt: null, dueDate: { lt: now } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.reminder.findMany({
        where,
        orderBy: [{ completedAt: 'asc' }, { dueDate: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: REMINDER_INCLUDE,
      }),
      this.prisma.reminder.count({ where }),
    ]);

    return {
      data: data.map((r) => this.decorate(r, now)),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const reminder = await this.prisma.reminder.findUnique({
      where: { id },
      include: REMINDER_INCLUDE,
    });
    if (!reminder) {
      throw new NotFoundException('Lembrete não encontrado');
    }
    return this.decorate(reminder);
  }

  async update(id: string, dto: UpdateReminderDto) {
    await this.ensureExists(id);
    const reminder = await this.prisma.reminder.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        priority: dto.priority,
      },
      include: REMINDER_INCLUDE,
    });
    return this.decorate(reminder);
  }

  async complete(id: string) {
    const current = await this.ensureExists(id);
    const reminder = current.completedAt
      ? await this.prisma.reminder.findUniqueOrThrow({
          where: { id },
          include: REMINDER_INCLUDE,
        })
      : await this.prisma.reminder.update({
          where: { id },
          data: { completedAt: new Date() },
          include: REMINDER_INCLUDE,
        });
    return this.decorate(reminder);
  }

  async reopen(id: string) {
    await this.ensureExists(id);
    const reminder = await this.prisma.reminder.update({
      where: { id },
      data: { completedAt: null },
      include: REMINDER_INCLUDE,
    });
    return this.decorate(reminder);
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.reminder.delete({ where: { id } });
    return { deleted: true, id };
  }

  /**
   * Gera lembretes de aniversário dos clientes do mês (idempotente: não
   * duplica graças ao índice único [clientId, type, dueDate]).
   */
  async generateBirthdays(dto: GenerateBirthdaysDto) {
    const now = new Date();
    const month = dto.month ?? now.getUTCMonth() + 1; // 1-12
    const year = dto.year ?? now.getUTCFullYear();

    const clients = await this.prisma.client.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, birthDate: true },
    });

    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    const rows = clients
      .filter((c) => c.birthDate.getUTCMonth() + 1 === month)
      .map((c) => {
        const day = Math.min(c.birthDate.getUTCDate(), daysInMonth);
        return {
          type: ReminderType.CLIENT_BIRTHDAY,
          clientId: c.id,
          title: `Aniversário de ${c.fullName}`,
          description: 'Enviar mensagem de aniversário para o cliente 🎂',
          dueDate: new Date(Date.UTC(year, month - 1, day)),
        };
      });

    if (rows.length === 0) {
      return { month, year, birthdaysFound: 0, created: 0 };
    }

    const result = await this.prisma.reminder.createMany({
      data: rows,
      skipDuplicates: true,
    });

    return {
      month,
      year,
      birthdaysFound: rows.length,
      created: result.count,
    };
  }

  private async ensureExists(id: string): Promise<Reminder> {
    const reminder = await this.prisma.reminder.findUnique({ where: { id } });
    if (!reminder) {
      throw new NotFoundException('Lembrete não encontrado');
    }
    return reminder;
  }

  /** Anexa a situação e o atraso (vencido e não concluído). */
  private decorate(reminder: ReminderWithClient, now = new Date()) {
    const isCompleted = reminder.completedAt !== null;
    const isOverdue = !isCompleted && reminder.dueDate < now;
    const daysOverdue = isOverdue
      ? Math.floor((now.getTime() - reminder.dueDate.getTime()) / 86_400_000)
      : 0;
    return {
      ...reminder,
      isCompleted,
      isOverdue,
      daysOverdue,
      status: isCompleted ? 'completed' : isOverdue ? 'overdue' : 'pending',
    };
  }
}
