import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Bloqueio de agenda: reserva um intervalo do profissional sem cliente. */
export class CreateBlockDto {
  @ApiProperty({ description: 'Profissional cujo horário será bloqueado' })
  @IsUUID('4', { message: 'Profissional inválido' })
  professionalId: string;

  @ApiProperty({ example: '2026-08-01T12:00:00.000Z', description: 'Início (ISO 8601)' })
  @IsDateString({}, { message: 'Data/hora de início inválida' })
  startTime: string;

  @ApiProperty({ example: '2026-08-01T13:00:00.000Z', description: 'Fim (ISO 8601)' })
  @IsDateString({}, { message: 'Data/hora de fim inválida' })
  endTime: string;

  @ApiPropertyOptional({ description: 'Motivo do bloqueio (ex.: almoço, folga)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
