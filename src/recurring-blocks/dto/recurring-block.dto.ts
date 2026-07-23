import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRecurringBlockDto {
  @ApiProperty({ description: 'Profissional bloqueado' })
  @IsUUID('4', { message: 'Profissional inválido' })
  professionalId: string;

  @ApiProperty({ example: 6, description: 'Dia da semana (0=Domingo .. 6=Sábado)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

  @ApiProperty({ example: 540, description: 'Início em minutos desde a meia-noite (ex.: 09h = 540)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute: number;

  @ApiProperty({ example: 660, description: 'Fim em minutos desde a meia-noite (ex.: 11h = 660)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute: number;

  @ApiPropertyOptional({ example: 'Almoço', description: 'Observação' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  note?: string;
}
