-- O fluxo de caixa volta a ser 100% manual: a comanda não gera mais lançamento
-- ao fechar, então o vínculo lançamento→comanda deixa de existir.
--
-- Seguro: nenhum lançamento automático chegou a ser criado em produção
-- (financial_entries estava zerada quando a coluna foi adicionada).

ALTER TABLE "financial_entries" DROP CONSTRAINT IF EXISTS "financial_entries_comanda_id_fkey";
DROP INDEX IF EXISTS "financial_entries_comanda_id_idx";
ALTER TABLE "financial_entries" DROP COLUMN IF EXISTS "comanda_id";
