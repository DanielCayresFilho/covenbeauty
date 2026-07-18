import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ComandaStatus } from '@prisma/client';

export class QueryComandasDto {
  @ApiPropertyOptional({ enum: ComandaStatus })
  @IsOptional()
  @IsEnum(ComandaStatus)
  status?: ComandaStatus;

  @ApiPropertyOptional({ description: 'Filtra por cliente' })
  @IsOptional()
  @IsUUID('4')
  clientId?: string;

  @ApiPropertyOptional({ description: 'Filtra por profissional (via agendamento)' })
  @IsOptional()
  @IsUUID('4')
  professionalId?: string;

  @ApiPropertyOptional({ description: 'Abertas a partir de (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Abertas até (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 50;
}
