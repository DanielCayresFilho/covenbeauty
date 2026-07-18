import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProcedureCategoryDto {
  @ApiProperty({ example: 'Cabelo', description: 'Nome da categoria de procedimento' })
  @IsString()
  @MinLength(2, { message: 'Informe o nome da categoria' })
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ description: 'Descrição (opcional)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
