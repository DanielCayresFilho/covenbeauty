import { Module } from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';
import { EvaluationPhotosService } from './photos.service';
import { EvaluationsController } from './evaluations.controller';

@Module({
  controllers: [EvaluationsController],
  providers: [EvaluationsService, EvaluationPhotosService],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
