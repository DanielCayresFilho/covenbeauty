import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MeasureUnit, ProductType } from '@prisma/client';

export class CreateProductDto {
  @ApiProperty({ example: 'Coloração 7.0 Louro Médio' })
  @IsString()
  @MinLength(2, { message: 'Informe o nome do produto' })
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ description: 'Descrição (opcional)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'ID da categoria' })
  @IsUUID('4', { message: 'Categoria inválida' })
  categoryId: string;

  @ApiProperty({ enum: ProductType, description: 'Uso interno ou venda' })
  @IsEnum(ProductType, { message: 'Tipo inválido (INTERNAL_USE ou SALE)' })
  type: ProductType;

  @ApiProperty({ example: 49.9, description: 'Preço (use 0 para uso interno)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Preço inválido' })
  @Min(0)
  price: number;

  @ApiProperty({ example: 1, description: 'Unidades/embalagens em estoque' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitsInStock: number;

  @ApiProperty({ example: 1000, description: 'Quantidade por unidade (ex.: 1000)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Quantidade inválida' })
  @IsPositive({ message: 'A quantidade por unidade deve ser maior que zero' })
  quantityPerUnit: number;

  @ApiProperty({ enum: MeasureUnit, description: 'Unidade de medida (ML ou G)' })
  @IsEnum(MeasureUnit, { message: 'Unidade de medida inválida (ML ou G)' })
  measureUnit: MeasureUnit;
}
