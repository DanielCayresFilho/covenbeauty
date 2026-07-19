-- Atribui todo o histórico sem dono (owner_id nulo) ao admin do salão, para que
-- ele continue visível após o escopo passar a valer também para o admin.
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM "users" WHERE role = 'ADMIN' ORDER BY created_at ASC LIMIT 1;
  IF admin_id IS NOT NULL THEN
    UPDATE "clients"            SET "owner_id" = admin_id WHERE "owner_id" IS NULL;
    UPDATE "products"           SET "owner_id" = admin_id WHERE "owner_id" IS NULL;
    UPDATE "procedures"         SET "owner_id" = admin_id WHERE "owner_id" IS NULL;
    UPDATE "financial_accounts" SET "owner_id" = admin_id WHERE "owner_id" IS NULL;
    UPDATE "financial_entries"  SET "owner_id" = admin_id WHERE "owner_id" IS NULL;
    UPDATE "financial_goals"    SET "owner_id" = admin_id WHERE "owner_id" IS NULL;
    UPDATE "reminders"          SET "owner_id" = admin_id WHERE "owner_id" IS NULL;
  END IF;
END $$;
