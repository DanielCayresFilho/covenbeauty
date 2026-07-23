import { Module } from '@nestjs/common';
import { RecurringBlocksService } from './recurring-blocks.service';
import { RecurringBlocksController } from './recurring-blocks.controller';

@Module({
  controllers: [RecurringBlocksController],
  providers: [RecurringBlocksService],
  exports: [RecurringBlocksService],
})
export class RecurringBlocksModule {}
