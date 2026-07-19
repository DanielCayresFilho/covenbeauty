-- Propriedade por profissional: coluna owner_id (nulável) + índice em cada tabela.

ALTER TABLE "clients" ADD COLUMN "owner_id" UUID;
ALTER TABLE "products" ADD COLUMN "owner_id" UUID;
ALTER TABLE "procedures" ADD COLUMN "owner_id" UUID;
ALTER TABLE "financial_accounts" ADD COLUMN "owner_id" UUID;
ALTER TABLE "financial_entries" ADD COLUMN "owner_id" UUID;
ALTER TABLE "financial_goals" ADD COLUMN "owner_id" UUID;
ALTER TABLE "reminders" ADD COLUMN "owner_id" UUID;

CREATE INDEX "clients_owner_id_idx" ON "clients"("owner_id");
CREATE INDEX "products_owner_id_idx" ON "products"("owner_id");
CREATE INDEX "procedures_owner_id_idx" ON "procedures"("owner_id");
CREATE INDEX "financial_accounts_owner_id_idx" ON "financial_accounts"("owner_id");
CREATE INDEX "financial_entries_owner_id_idx" ON "financial_entries"("owner_id");
CREATE INDEX "financial_goals_owner_id_idx" ON "financial_goals"("owner_id");
CREATE INDEX "reminders_owner_id_idx" ON "reminders"("owner_id");
