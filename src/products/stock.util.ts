import { Prisma } from '@prisma/client';

/**
 * Deriva o número de embalagens (unitsInStock) a partir da quantidade
 * utilizável, assumindo consumo sequencial (esvazia uma antes de abrir outra):
 *
 *   unitsInStock = ceil(usableQuantity / quantityPerUnit)
 *
 * Ex.: 900ml de embalagens de 1000ml → 1 unidade; 2100ml → 3 unidades.
 */
export function deriveUnitsInStock(
  usableQuantity: Prisma.Decimal,
  quantityPerUnit: Prisma.Decimal,
): number {
  if (quantityPerUnit.lessThanOrEqualTo(0)) {
    return 0;
  }
  const usable = Prisma.Decimal.max(usableQuantity, new Prisma.Decimal(0));
  return Math.ceil(usable.div(quantityPerUnit).toNumber());
}
