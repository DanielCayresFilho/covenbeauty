import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { BIRTHDAYS_QUEUE } from '@/queue/queue.constants';
import { RemindersService } from './reminders.service';

@Processor(BIRTHDAYS_QUEUE)
export class BirthdaysProcessor extends WorkerHost {
  private readonly logger = new Logger(BirthdaysProcessor.name);

  constructor(private readonly reminders: RemindersService) {
    super();
  }

  async process(): Promise<void> {
    // Gera os aniversários do mês atual (idempotente).
    const result = await this.reminders.generateBirthdays({});
    this.logger.log(
      `Aniversários ${result.month}/${result.year}: ${result.birthdaysFound} no mês, ${result.created} lembrete(s) criado(s).`,
    );
  }
}
