import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsPositive, IsUUID } from 'class-validator';

export class AddComandaProductDto {
  @ApiProperty({ description: 'Produto consumido no atendimento' })
  @IsUUID('4', { message: 'Produto inválido' })
  productId: string;

  @ApiProperty({ example: 150, description: 'Quantidade utilizada (na medida do produto, ex.: 150ml)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Quantidade inválida' })
  @IsPositive({ message: 'A quantidade deve ser maior que zero' })
  quantityUsed: number;
}
