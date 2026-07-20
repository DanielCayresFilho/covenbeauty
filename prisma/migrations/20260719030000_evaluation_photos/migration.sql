-- Fotos das fichas de avaliação (arquivo no volume persistente + metadados no banco).
CREATE TYPE "PhotoStage" AS ENUM ('FACE', 'HAIR', 'SCALP', 'BODY', 'OTHER');
CREATE TYPE "PhotoMoment" AS ENUM ('BEFORE', 'AFTER');

CREATE TABLE "evaluation_photos" (
    "id" UUID NOT NULL,
    "evaluation_id" UUID NOT NULL,
    "stage" "PhotoStage" NOT NULL DEFAULT 'OTHER',
    "moment" "PhotoMoment" NOT NULL DEFAULT 'BEFORE',
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "caption" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "evaluation_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "evaluation_photos_evaluation_id_idx" ON "evaluation_photos"("evaluation_id");

ALTER TABLE "evaluation_photos"
    ADD CONSTRAINT "evaluation_photos_evaluation_id_fkey"
    FOREIGN KEY ("evaluation_id") REFERENCES "client_evaluations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
