import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

// `unitsInStock` sai do update: é derivado da quantidade utilizável.
// Entrada de estoque é feita pelo endpoint de reposição (/restock);
// o consumo é feito pela comanda.
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['unitsInStock'] as const),
) {}
