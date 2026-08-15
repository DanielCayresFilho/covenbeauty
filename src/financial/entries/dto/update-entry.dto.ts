import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { CashFlowCategory } from '@prisma/client';

export class UpdateEntryDto {
  @ApiPropertyOptional({ description: 'Data (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Troca a conta do lançamento (a categoria passa a ser a dela)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Conta inválida' })
  accountId?: string;

  @ApiPropertyOptional({
    enum: CashFlowCategory,
    description: 'Só para movimentações sem conta (distribuição, aplicação, resgate)',
  })
  @IsOptional()
  @IsEnum(CashFlowCategory)
  category?: CashFlowCategory;

  @ApiPropertyOptional({ description: 'Cliente vinculado (null para desvincular)' })
  @IsOptional()
  @IsUUID('4', { message: 'Cliente inválido' })
  clientId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
