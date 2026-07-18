export type CashFlowCategory =
  | "INCOME"
  | "VARIABLE_COST"
  | "FIXED_EXPENSE"
  | "PRO_LABORE"
  | "INVESTMENT"
  | "PROFIT_DISTRIBUTION"
  | "APPLICATION"
  | "REDEMPTION";

export const CATEGORY_LABEL: Record<CashFlowCategory, string> = {
  INCOME: "Entrada",
  VARIABLE_COST: "Custo variável",
  FIXED_EXPENSE: "Despesa fixa",
  PRO_LABORE: "Pró-labore",
  INVESTMENT: "Investimento",
  PROFIT_DISTRIBUTION: "Distribuição de lucros",
  APPLICATION: "Aplicação",
  REDEMPTION: "Resgate",
};

// Categorias que são contas do plano de contas.
export const ACCOUNT_CATEGORIES: CashFlowCategory[] = [
  "INCOME",
  "VARIABLE_COST",
  "FIXED_EXPENSE",
  "PRO_LABORE",
  "INVESTMENT",
];

// Movimentações abaixo da linha (sem conta).
export const BELOW_LINE_CATEGORIES: CashFlowCategory[] = [
  "PROFIT_DISTRIBUTION",
  "APPLICATION",
  "REDEMPTION",
];

export const brl = (v: string | number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const money = (v: string | number) =>
  Number(v).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];
