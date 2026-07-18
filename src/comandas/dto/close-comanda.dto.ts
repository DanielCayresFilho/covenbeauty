import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CloseComandaDto {
  @ApiProperty({ enum: PaymentMethod, description: 'Forma de pagamento do cliente' })
  @IsEnum(PaymentMethod, { message: 'Forma de pagamento inválida' })
  paymentMethod: PaymentMethod;

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

  @ApiPropertyOptional({ description: 'Observação do fechamento' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  // ── Retorno (o profissional informa no fechamento) ──

  @ApiPropertyOptional({ default: false, description: 'Haverá retorno?' })
  @IsOptional()
  @IsBoolean()
  willReturn?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'Procedimentos do retorno (subconjunto dos da comanda). Obrigatório se willReturn',
  })
  @ValidateIf((o: CloseComandaDto) => o.willReturn === true)
  @IsArray()
  @ArrayMinSize(1, { message: 'Selecione ao menos um procedimento para o retorno' })
  @IsUUID('4', { each: true, message: 'Procedimento inválido' })
  returnProcedureIds?: string[];

  @ApiPropertyOptional({ description: 'Data/hora do retorno (ISO 8601). Obrigatório se willReturn' })
  @ValidateIf((o: CloseComandaDto) => o.willReturn === true)
  @IsDateString({}, { message: 'Data/hora do retorno inválida' })
  returnDate?: string;

  @ApiPropertyOptional({ description: 'Profissional do retorno (padrão: o mesmo do atendimento)' })
  @IsOptional()
  @IsUUID('4', { message: 'Profissional inválido' })
  returnProfessionalId?: string;
}
