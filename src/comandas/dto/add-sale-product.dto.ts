import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsUUID, Min } from 'class-validator';

/** Vende um produto na comanda (baixa de unidades, com preço). */
export class AddSaleProductDto {
  @ApiProperty({ description: 'Produto vendido' })
  @IsUUID('4', { message: 'Produto inválido' })
  productId: string;

  @ApiProperty({ example: 2, description: 'Quantidade de unidades vendidas' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}
