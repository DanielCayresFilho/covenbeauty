import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

/** Define (ou limpa) o saldo inicial de um mês do fluxo de caixa. */
export class SetOpeningDto {
  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 1, description: 'Mês (1-12)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiPropertyOptional({
    example: 615.0,
    description: 'Valor do saldo inicial. Omita/null para voltar ao automático (carryover).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number | null;
}
