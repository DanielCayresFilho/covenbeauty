import { Module } from '@nestjs/common';
import { ProcedureCategoriesService } from './procedure-categories.service';
import { ProcedureCategoriesController } from './procedure-categories.controller';

@Module({
  controllers: [ProcedureCategoriesController],
  providers: [ProcedureCategoriesService],
  exports: [ProcedureCategoriesService],
})
export class ProcedureCategoriesModule {}
