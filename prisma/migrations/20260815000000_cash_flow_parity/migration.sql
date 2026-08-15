-- Paridade do fluxo de caixa com o sistema antigo:
--   1. pró-labore digitável na planilha (e saldo inicial passa a ser opcional);
--   2. lançamento ligado a cliente e à comanda que o gerou;
--   3. despesas fixas mensais com pagamento lançado no fluxo;
--   4. metas com período (semanal/mensal se renovam sozinhas).

-- ── 1. Planilha: pró-labore por mês; saldo inicial vira opcional ──
ALTER TABLE "cash_flow_openings" ALTER COLUMN "amount" DROP NOT NULL;
ALTER TABLE "cash_flow_openings" ADD COLUMN "pro_labore" DECIMAL(12,2);

-- ── 2. Lançamentos: cliente e origem ──
ALTER TABLE "financial_entries" ADD COLUMN "client_id" UUID;
ALTER TABLE "financial_entries" ADD COLUMN "comanda_id" UUID;
ALTER TABLE "financial_entries" ADD COLUMN "fixed_expense_id" UUID;

CREATE INDEX "financial_entries_client_id_idx" ON "financial_entries"("client_id");
CREATE INDEX "financial_entries_comanda_id_idx" ON "financial_entries"("comanda_id");

ALTER TABLE "financial_entries"
    ADD CONSTRAINT "financial_entries_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Reabrir/excluir a comanda desfaz os lançamentos que ela gerou.
ALTER TABLE "financial_entries"
    ADD CONSTRAINT "financial_entries_comanda_id_fkey"
    FOREIGN KEY ("comanda_id") REFERENCES "comandas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 3. Despesas fixas ──
CREATE TABLE "fixed_expenses" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "due_day" INTEGER NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "account_id" UUID,
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fixed_expenses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fixed_expenses_owner_id_idx" ON "fixed_expenses"("owner_id");
CREATE INDEX "fixed_expenses_due_day_idx" ON "fixed_expenses"("due_day");

ALTER TABLE "fixed_expenses"
    ADD CONSTRAINT "fixed_expenses_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_entries"
    ADD CONSTRAINT "financial_entries_fixed_expense_id_fkey"
    FOREIGN KEY ("fixed_expense_id") REFERENCES "fixed_expenses"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 4. Metas com período ──
CREATE TYPE "GoalPeriod" AS ENUM ('WEEKLY', 'MONTHLY', 'CUSTOM');

ALTER TABLE "financial_goals"
    ADD COLUMN "period" "GoalPeriod" NOT NULL DEFAULT 'CUSTOM';
