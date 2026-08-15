import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateFixedExpenseDto } from './create-fixed-expense.dto';

export class UpdateFixedExpenseDto extends PartialType(CreateFixedExpenseDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
