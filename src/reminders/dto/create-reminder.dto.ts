import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ReminderPriority } from '@prisma/client';

export class CreateReminderDto {
  @ApiProperty({ example: 'Arrumar cafeteira' })
  @IsString()
  @MinLength(2, { message: 'Informe o título do lembrete' })
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Detalhes (opcional)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: '2026-07-25T10:00:00.000Z', description: 'Data/hora de vencimento (ISO 8601)' })
  @IsDateString({}, { message: 'Data inválida' })
  dueDate: string;

  @ApiPropertyOptional({ enum: ReminderPriority, default: ReminderPriority.MEDIUM })
  @IsOptional()
  @IsEnum(ReminderPriority)
  priority?: ReminderPriority;
}
