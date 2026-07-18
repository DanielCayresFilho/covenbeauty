import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CashFlowQuery {
  @ApiPropertyOptional({ example: 2026, description: 'Ano do fluxo de caixa' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number = new Date().getUTCFullYear();

  @ApiPropertyOptional({ example: 0, description: 'Saldo inicial de janeiro (R$)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  openingBalance = 0;
}
