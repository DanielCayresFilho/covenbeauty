-- Tatuagem: novos valores de enum, sessões no agendamento, sessão na foto e
-- campos da anamnese de tatuagem na ficha de avaliação.

-- Novos valores de enum (não usados nesta mesma migração — seguro em PG12+).
ALTER TYPE "EvaluationFocus" ADD VALUE IF NOT EXISTS 'TATTOO';
ALTER TYPE "PhotoStage" ADD VALUE IF NOT EXISTS 'TATTOO';

-- Agendamento: sessões planejadas e nº da sessão (fim já é editável no serviço).
ALTER TABLE "appointments" ADD COLUMN "sessions_planned" INTEGER;
ALTER TABLE "appointments" ADD COLUMN "session_number" INTEGER;

-- Foto: sessão da tatuagem à qual pertence.
ALTER TABLE "evaluation_photos" ADD COLUMN "session" INTEGER;

-- Ficha: campos da anamnese de tatuagem.
ALTER TABLE "client_evaluations" ADD COLUMN "ate_in_last_3h" BOOLEAN;
ALTER TABLE "client_evaluations" ADD COLUMN "has_diabetes" BOOLEAN;
ALTER TABLE "client_evaluations" ADD COLUMN "has_hypertension" BOOLEAN;
ALTER TABLE "client_evaluations" ADD COLUMN "has_coagulation_issues" BOOLEAN;
ALTER TABLE "client_evaluations" ADD COLUMN "has_skin_disease" BOOLEAN;
ALTER TABLE "client_evaluations" ADD COLUMN "has_autoimmune" BOOLEAN;
ALTER TABLE "client_evaluations" ADD COLUMN "has_epilepsy" BOOLEAN;
ALTER TABLE "client_evaluations" ADD COLUMN "has_infectious_disease" BOOLEAN;
ALTER TABLE "client_evaluations" ADD COLUMN "has_heart_condition" BOOLEAN;
ALTER TABLE "client_evaluations" ADD COLUMN "has_anesthetic_allergy" BOOLEAN;
ALTER TABLE "client_evaluations" ADD COLUMN "health_conditions_other" TEXT;
ALTER TABLE "client_evaluations" ADD COLUMN "uses_alcohol_or_drugs" BOOLEAN;
ALTER TABLE "client_evaluations" ADD COLUMN "anticoagulants_24h" BOOLEAN;
ALTER TABLE "client_evaluations" ADD COLUMN "tattoo_body_location" TEXT;
ALTER TABLE "client_evaluations" ADD COLUMN "has_tattoos" BOOLEAN;
ALTER TABLE "client_evaluations" ADD COLUMN "tattoo_consent_accepted" BOOLEAN NOT NULL DEFAULT false;
