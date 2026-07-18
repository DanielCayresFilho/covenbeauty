import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  BIRTHDAYS_QUEUE,
  GENERATE_BIRTHDAYS_JOB,
} from '@/queue/queue.constants';

@Injectable()
export class BirthdaysScheduler implements OnModuleInit {
  private readonly logger = new Logger(BirthdaysScheduler.name);

  constructor(@InjectQueue(BIRTHDAYS_QUEUE) private readonly queue: Queue) {}

  onModuleInit() {
    // Todo dia 1º às 06:00 (horário de Brasília). Idempotente (upsert).
    // Fire-and-forget para não bloquear o boot se o Redis ainda não subiu.
    void this.queue
      .upsertJobScheduler(
        'monthly-birthdays',
        { pattern: '0 6 1 * *', tz: 'America/Sao_Paulo' },
        { name: GENERATE_BIRTHDAYS_JOB },
      )
      .then(() =>
        this.logger.log(
          'Cron de aniversários registrado (todo dia 1º às 06:00).',
        ),
      )
      .catch((e) =>
        this.logger.error(`Falha ao registrar o cron de aniversários: ${String(e)}`),
      );
  }
}
