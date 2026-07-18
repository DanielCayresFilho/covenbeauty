import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

/** Período opcional; quando omitido, o service usa um padrão (mês/ano atual). */
export class AnalyticsPeriodQuery {
  @ApiPropertyOptional({ description: 'De (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Até (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
