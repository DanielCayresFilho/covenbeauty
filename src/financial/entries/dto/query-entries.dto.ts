import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { CashFlowCategory } from '@prisma/client';

export class QueryEntriesDto {
  @ApiPropertyOptional({ enum: CashFlowCategory })
  @IsOptional()
  @IsEnum(CashFlowCategory)
  category?: CashFlowCategory;

  @ApiPropertyOptional({ description: 'Filtra por conta' })
  @IsOptional()
  @IsUUID('4')
  accountId?: string;

  @ApiPropertyOptional({ description: 'De (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Até (YYYY-MM-DD)' })
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
