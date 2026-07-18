import { PaymentMethod } from '@prisma/client';
import { Prisma } from '@prisma/client';

/**
 * Tabela de taxas das formas de pagamento (em %).
 *
 * ⚠️ FINANCEIRO: estes valores alimentam o cálculo de líquido do salão.
 * Ajuste aqui quando a maquininha mudar as taxas.
 */

// Débito: taxa única.
export const DEBIT_FEE_PERCENT = 2.79;

// Crédito por número de parcelas (taxa ABSORVIDA pelo salão).
export const CREDIT_FEE_PERCENT: Record<number, number> = {
  1: 5.99,
  2: 11.39,
  3: 12.49,
};

// Acima disso o salão recebe o valor CHEIO, sem taxa e sem acréscimo ao
// cliente (comporta-se como PIX). Regra definida pelo negócio.
export const CREDIT_ABSORBED_MAX_INSTALLMENTS = 3;

// PIX e dinheiro não têm taxa.
export const NO_FEE_METHODS: PaymentMethod[] = [
  PaymentMethod.PIX,
  PaymentMethod.CASH,
];

export interface FinancialBreakdown {
  subtotal: Prisma.Decimal; // soma dos procedimentos
  discount: Prisma.Decimal;
  feeRate: Prisma.Decimal | null; // % aplicado (null = taxa ainda não configurada)
  feeAmount: Prisma.Decimal | null;
  feePassedToClient: boolean;
  amountChargedToClient: Prisma.Decimal; // quanto o cliente paga
  netAmount: Prisma.Decimal; // quanto o salão recebe líquido
}

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);
const money = (v: Prisma.Decimal) => v.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

/**
 * Resolve a taxa (%) para o método/parcelas. Retorna null quando a taxa
 * ainda não foi configurada (ex.: crédito acima de 3x sem valor cadastrado).
 */
export function resolveFeeRate(
  method: PaymentMethod,
  installments: number,
): { rate: Prisma.Decimal | null; passedToClient: boolean } {
  if (NO_FEE_METHODS.includes(method)) {
    return { rate: D(0), passedToClient: false };
  }
  if (method === PaymentMethod.DEBIT) {
    return { rate: D(DEBIT_FEE_PERCENT), passedToClient: false };
  }
  // Crédito acima de 3x: sem taxa para o salão (recebe cheio, como PIX).
  if (installments > CREDIT_ABSORBED_MAX_INSTALLMENTS) {
    return { rate: D(0), passedToClient: false };
  }
  // Crédito até 3x: taxa absorvida pelo salão.
  const configured = CREDIT_FEE_PERCENT[installments];
  return {
    rate: configured !== undefined ? D(configured) : null,
    passedToClient: false,
  };
}

/**
 * Calcula o detalhamento financeiro de um agendamento.
 *
 * Regras:
 * - total = subtotal - desconto (nunca negativo)
 * - débito e crédito ≤3x: taxa ABSORVIDA pelo salão — cliente paga o total,
 *   salão recebe total - taxa.
 * - crédito >3x, PIX e dinheiro: taxa 0 — cliente paga o total, salão recebe
 *   o valor cheio.
 */
export function computeFinancials(
  subtotalValue: Prisma.Decimal.Value,
  discountValue: Prisma.Decimal.Value,
  method: PaymentMethod,
  installments: number,
): FinancialBreakdown {
  const subtotal = money(D(subtotalValue));
  const discount = money(D(discountValue));
  const total = money(Prisma.Decimal.max(subtotal.minus(discount), D(0)));

  const { rate, passedToClient } = resolveFeeRate(method, installments);

  // Taxa ainda não configurada (crédito >3x sem valor cadastrado).
  if (rate === null) {
    return {
      subtotal,
      discount,
      feeRate: null,
      feeAmount: null,
      feePassedToClient: passedToClient,
      amountChargedToClient: total,
      netAmount: total,
    };
  }

  const feeAmount = money(total.mul(rate).div(100));

  if (passedToClient) {
    return {
      subtotal,
      discount,
      feeRate: rate,
      feeAmount,
      feePassedToClient: true,
      amountChargedToClient: money(total.plus(feeAmount)),
      netAmount: total,
    };
  }

  // Taxa absorvida pelo salão.
  return {
    subtotal,
    discount,
    feeRate: rate,
    feeAmount,
    feePassedToClient: false,
    amountChargedToClient: total,
    netAmount: money(total.minus(feeAmount)),
  };
}
