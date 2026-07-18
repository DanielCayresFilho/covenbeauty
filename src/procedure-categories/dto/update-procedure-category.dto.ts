import { PartialType } from '@nestjs/swagger';
import { CreateProcedureCategoryDto } from './create-procedure-category.dto';

export class UpdateProcedureCategoryDto extends PartialType(
  CreateProcedureCategoryDto,
) {}
