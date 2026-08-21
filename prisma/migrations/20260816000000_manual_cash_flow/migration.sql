-- O fluxo de caixa volta a ser 100% manual: a comanda não gera mais lançamento
-- ao fechar, então o vínculo lançamento→comanda deixa de existir.

-- Apaga o que a versão anterior lançou sozinho. `comanda_id` preenchido
-- identifica exatamente esses registros — nenhum lançamento digitado à mão tem
-- esse campo. Sem isso sobrariam valores no fluxo que ninguém digitou.
DELETE FROM "financial_entries" WHERE "comanda_id" IS NOT NULL;

ALTER TABLE "financial_entries" DROP CONSTRAINT IF EXISTS "financial_entries_comanda_id_fkey";
DROP INDEX IF EXISTS "financial_entries_comanda_id_idx";
ALTER TABLE "financial_entries" DROP COLUMN IF EXISTS "comanda_id";
