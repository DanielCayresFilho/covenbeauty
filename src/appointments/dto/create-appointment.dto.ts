import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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

export class CreateAppointmentDto {
  @ApiProperty({ description: 'Profissional (User com isProfessional=true)' })
  @IsUUID('4', { message: 'Profissional inválido' })
  professionalId: string;

  @ApiProperty({ description: 'Cliente do atendimento' })
  @IsUUID('4', { message: 'Cliente inválido' })
  clientId: string;

  @ApiProperty({ example: '2026-08-01T14:00:00.000Z', description: 'Início (ISO 8601)' })
  @IsDateString({}, { message: 'Data/hora de início inválida' })
  startTime: string;

  @ApiPropertyOptional({
    example: '2026-08-01T17:00:00.000Z',
    description:
      'Fim (ISO 8601). Opcional — se informado (ex.: tatuagem), sobrepõe a soma das durações.',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data/hora de fim inválida' })
  endTime?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'IDs dos procedimentos (o fim é a soma das durações). Opcional quando há tattooDescription.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Procedimento inválido' })
  procedureIds?: string[];

  @ApiPropertyOptional({
    example: 'Caveira no braço',
    description: 'Tatuagem: descrição livre (dispensa escolher procedimento).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tattooDescription?: string;

  @ApiPropertyOptional({ example: 3, description: 'Tatuagem: nº total de sessões planejadas' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  sessionsPlanned?: number;

  @ApiPropertyOptional({ example: 1, description: 'Tatuagem: qual sessão é este agendamento' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  sessionNumber?: number;

  @ApiPropertyOptional({
    example: 350,
    description:
      'Preço manual (R$). Ex.: tatuagem — sobrepõe o preço do procedimento.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Preço inválido' })
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ enum: AppointmentStatus, default: AppointmentStatus.SCHEDULED })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ enum: PaymentMethod, description: 'Forma de pagamento' })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 1, description: 'Parcelas (crédito)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  installments?: number;

  @ApiPropertyOptional({ example: 0, description: 'Desconto em R$' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Desconto inválido' })
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ example: 50, description: 'Sinal pago no agendamento (R$)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Sinal inválido' })
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional({ description: 'Observação' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
