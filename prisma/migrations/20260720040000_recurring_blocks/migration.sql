-- Bloqueios fixos/recorrentes da agenda (ex.: todo sábado das 09h às 11h).
CREATE TABLE "recurring_blocks" (
    "id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "note" TEXT,
    "owner_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recurring_blocks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recurring_blocks_professional_id_idx" ON "recurring_blocks"("professional_id");
CREATE INDEX "recurring_blocks_owner_id_idx" ON "recurring_blocks"("owner_id");
