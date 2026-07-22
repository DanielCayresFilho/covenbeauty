import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { DecalqueService } from './decalque.service';
import { AppointmentsController } from './appointments.controller';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, DecalqueService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
