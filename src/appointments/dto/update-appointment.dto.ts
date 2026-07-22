import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AppointmentStatus, PaymentMethod } from '@prisma/client';

/**
 * Atualiza um agendamento. Alterar `startTime` ou `procedureIds` recalcula o
 * fim; alterar pagamento/desconto recalcula o detalhamento financeiro.
 */
export class UpdateAppointmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  professionalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  clientId?: string;

  @ApiPropertyOptional({ description: 'Início (ISO 8601) — reagendamento' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Fim manual (ISO 8601) — ex.: tatuagem' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Tatuagem: nº total de sessões' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  sessionsPlanned?: number;

  @ApiPropertyOptional({ description: 'Tatuagem: nº desta sessão' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  sessionNumber?: number;

  @ApiPropertyOptional({ description: 'Preço manual (R$) — ex.: tatuagem' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ type: [String], description: 'Substitui os procedimentos' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  procedureIds?: string[];

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  installments?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ description: 'Sinal pago (R$)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
