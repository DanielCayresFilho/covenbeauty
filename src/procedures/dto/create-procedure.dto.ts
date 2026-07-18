import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProcedureDto {
  @ApiProperty({ example: 'Escova Progressiva' })
  @IsString()
  @MinLength(2, { message: 'Informe o nome do procedimento' })
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ description: 'Descrição (opcional)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'ID da categoria de procedimento' })
  @IsUUID('4', { message: 'Categoria inválida' })
  categoryId: string;

  @ApiProperty({ example: 90, description: 'Duração em minutos (usada na agenda)' })
  @Type(() => Number)
  @IsInt({ message: 'A duração deve ser em minutos inteiros' })
  @Min(1, { message: 'A duração deve ser de pelo menos 1 minuto' })
  @Max(1440, { message: 'A duração não pode exceder 24 horas (1440 min)' })
  durationMinutes: number;

  @ApiProperty({ example: 150.0, description: 'Preço' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Preço inválido' })
  @Min(0)
  price: number;
}
