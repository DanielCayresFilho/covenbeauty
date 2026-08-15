import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { GoalPeriod } from '@prisma/client';

export class CreateGoalDto {
  @ApiPropertyOptional({ example: 'Meta de julho', description: 'Nome (opcional)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    enum: GoalPeriod,
    default: GoalPeriod.CUSTOM,
    description:
      'WEEKLY/MONTHLY usam a semana/mês corrente e se renovam sozinhas; CUSTOM exige as datas.',
  })
  @IsOptional()
  @IsEnum(GoalPeriod)
  period?: GoalPeriod;

  @ApiPropertyOptional({
    example: '2026-07-01',
    description: 'Início do período (YYYY-MM-DD). Obrigatório em CUSTOM.',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data inicial inválida' })
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-07-31',
    description: 'Fim do período (YYYY-MM-DD). Obrigatório em CUSTOM.',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data final inválida' })
  endDate?: string;

  @ApiProperty({ example: 5000, description: 'Valor-alvo de entradas (R$)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor-alvo inválido' })
  @IsPositive({ message: 'O valor-alvo deve ser maior que zero' })
  targetAmount: number;
}
