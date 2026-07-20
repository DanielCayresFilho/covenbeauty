import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Consulta anual das métricas (padrão: ano atual, top 5). */
export class AnalyticsYearQuery {
  @ApiPropertyOptional({ example: 2026, description: 'Ano (padrão: atual)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ example: 5, description: 'Tamanho dos rankings (padrão 5)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 5;
}
