import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  NOTIFICATIONS_QUEUE,
  NotificationJob,
  WelcomeClientPayload,
} from './queue.constants';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case NotificationJob.WelcomeClient: {
        const data = job.data as WelcomeClientPayload;
        // TODO: integrar com provedor de e-mail/WhatsApp.
        this.logger.log(
          `🔮 Boas-vindas ao Coven Beauty enviadas para ${data.fullName} <${data.email}>`,
        );
        break;
      }
      default:
        this.logger.warn(`Job desconhecido na fila: ${job.name}`);
    }
    return Promise.resolve();
  }
}
