import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateGoalDto {
  @ApiPropertyOptional({ example: 'Meta de julho', description: 'Nome (opcional)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiProperty({ example: '2026-07-01', description: 'Início do período (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'Data inicial inválida' })
  startDate: string;

  @ApiProperty({ example: '2026-07-31', description: 'Fim do período (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'Data final inválida' })
  endDate: string;

  @ApiProperty({ example: 5000, description: 'Valor-alvo de entradas (R$)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor-alvo inválido' })
  @IsPositive({ message: 'O valor-alvo deve ser maior que zero' })
  targetAmount: number;
}
