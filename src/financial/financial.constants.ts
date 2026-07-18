import { CashFlowCategory } from '@prisma/client';

/** Categorias que representam contas do plano de contas. */
export const ACCOUNT_CATEGORIES: CashFlowCategory[] = [
  CashFlowCategory.INCOME,
  CashFlowCategory.VARIABLE_COST,
  CashFlowCategory.FIXED_EXPENSE,
  CashFlowCategory.PRO_LABORE,
  CashFlowCategory.INVESTMENT,
];

/** Movimentações abaixo da linha do lucro (não são contas). */
export const BELOW_LINE_CATEGORIES: CashFlowCategory[] = [
  CashFlowCategory.PROFIT_DISTRIBUTION,
  CashFlowCategory.APPLICATION,
  CashFlowCategory.REDEMPTION,
];

export function isAccountCategory(category: CashFlowCategory): boolean {
  return ACCOUNT_CATEGORIES.includes(category);
}
