import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class RestockProductDto {
  @ApiProperty({ example: 2, description: 'Quantas embalagens estão entrando no estoque' })
  @Type(() => Number)
  @IsInt({ message: 'Informe um número inteiro de embalagens' })
  @Min(1, { message: 'A reposição deve ser de ao menos 1 embalagem' })
  units: number;
}
