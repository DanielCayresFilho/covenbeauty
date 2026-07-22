-- Tatuagem: linha de texto livre (sem procedimento) + decalque no agendamento.

-- procedure_id passa a ser nulável nas linhas de procedimento.
ALTER TABLE "appointment_procedures" ALTER COLUMN "procedure_id" DROP NOT NULL;
ALTER TABLE "comanda_procedures" ALTER COLUMN "procedure_id" DROP NOT NULL;

-- FK recriada com ON DELETE SET NULL (a linha sobrevive se o procedimento sumir).
ALTER TABLE "appointment_procedures" DROP CONSTRAINT "appointment_procedures_procedure_id_fkey";
ALTER TABLE "appointment_procedures" ADD CONSTRAINT "appointment_procedures_procedure_id_fkey"
    FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "comanda_procedures" DROP CONSTRAINT "comanda_procedures_procedure_id_fkey";
ALTER TABLE "comanda_procedures" ADD CONSTRAINT "comanda_procedures_procedure_id_fkey"
    FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Decalque (stencil) da tatuagem.
ALTER TABLE "appointments" ADD COLUMN "decalque_filename" TEXT;
ALTER TABLE "appointments" ADD COLUMN "decalque_mime" TEXT;
