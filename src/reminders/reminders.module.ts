import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { RemindersController } from './reminders.controller';
import { BirthdaysProcessor } from './birthdays.processor';
import { BirthdaysScheduler } from './birthdays.scheduler';

@Module({
  controllers: [RemindersController],
  providers: [RemindersService, BirthdaysProcessor, BirthdaysScheduler],
  exports: [RemindersService],
})
export class RemindersModule {}
