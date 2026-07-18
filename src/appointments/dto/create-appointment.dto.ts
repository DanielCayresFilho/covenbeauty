import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

  @ApiProperty({
    type: [String],
    description: 'IDs dos procedimentos (o fim é calculado pela soma das durações)',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Informe ao menos um procedimento' })
  @IsUUID('4', { each: true, message: 'Procedimento inválido' })
  procedureIds: string[];

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
