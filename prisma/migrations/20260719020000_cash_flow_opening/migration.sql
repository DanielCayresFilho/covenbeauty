-- Saldo inicial do fluxo de caixa por mês (editável por profissional).
CREATE TABLE "cash_flow_openings" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cash_flow_openings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cash_flow_openings_owner_id_year_month_key"
    ON "cash_flow_openings"("owner_id", "year", "month");
