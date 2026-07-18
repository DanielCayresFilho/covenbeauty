import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { ReminderPriority, ReminderType } from '@prisma/client';

export class QueryRemindersDto {
  @ApiPropertyOptional({
    enum: ['pending', 'completed', 'overdue'],
    description: 'Filtra por situação',
  })
  @IsOptional()
  @IsIn(['pending', 'completed', 'overdue'])
  status?: 'pending' | 'completed' | 'overdue';

  @ApiPropertyOptional({ enum: ReminderType, description: 'Filtra por tipo' })
  @IsOptional()
  @IsEnum(ReminderType)
  type?: ReminderType;

  @ApiPropertyOptional({ enum: ReminderPriority })
  @IsOptional()
  @IsEnum(ReminderPriority)
  priority?: ReminderPriority;

  @ApiPropertyOptional({ description: 'Vencimento de (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Vencimento até (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 50;
}
