import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

/** Abre uma comanda de VENDA (balcão, sem agendamento). */
export class CreateSaleDto {
  @ApiPropertyOptional({ description: 'Cliente (opcional na venda de balcão)' })
  @IsOptional()
  @IsUUID('4', { message: 'Cliente inválido' })
  clientId?: string;
}
