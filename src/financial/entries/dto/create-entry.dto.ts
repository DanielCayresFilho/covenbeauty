import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateEntryDto {
  @ApiProperty({ example: '2026-07-01', description: 'Data do lançamento (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'Data inválida' })
  date: string;

  @ApiProperty({ example: 55.0, description: 'Valor (positivo)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor inválido' })
  @IsPositive({ message: 'O valor deve ser maior que zero' })
  amount: number;

  @ApiPropertyOptional({
    description: 'Conta do plano de contas. Para entradas/saídas por conta, informe aqui.',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Conta inválida' })
  accountId?: string;

  @ApiPropertyOptional({
    enum: CashFlowCategory,
    description:
      'Só para movimentações sem conta (PROFIT_DISTRIBUTION, APPLICATION, REDEMPTION). Com accountId, a categoria vem da conta.',
  })
  @IsOptional()
  @IsEnum(CashFlowCategory)
  category?: CashFlowCategory;

  @ApiPropertyOptional({ description: 'Cliente a quem o lançamento se refere' })
  @IsOptional()
  @IsUUID('4', { message: 'Cliente inválido' })
  clientId?: string;

  @ApiPropertyOptional({ example: 'Pix - Gleice', description: 'Descrição (opcional)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
