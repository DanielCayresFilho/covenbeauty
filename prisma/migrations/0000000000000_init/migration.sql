-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('INTERNAL_USE', 'SALE');

-- CreateEnum
CREATE TYPE "MeasureUnit" AS ENUM ('ML', 'G');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('APPOINTMENT', 'BLOCK');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'DEPOSIT_PAID', 'COMPLETED', 'RETURN');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('DEBIT', 'CREDIT', 'PIX', 'CASH');

-- CreateEnum
CREATE TYPE "ComandaStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReminderPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('GENERAL', 'CLIENT_BIRTHDAY');

-- CreateEnum
CREATE TYPE "EvaluationFocus" AS ENUM ('FACIAL', 'CAPILLARY', 'BOTH');

-- CreateEnum
CREATE TYPE "Fitzpatrick" AS ENUM ('I', 'II', 'III', 'IV', 'V', 'VI');

-- CreateEnum
CREATE TYPE "SkinType" AS ENUM ('DRY', 'OILY', 'COMBINATION', 'SENSITIVE', 'ACNE_PRONE');

-- CreateEnum
CREATE TYPE "CashFlowCategory" AS ENUM ('INCOME', 'VARIABLE_COST', 'FIXED_EXPENSE', 'PRO_LABORE', 'INVESTMENT', 'PROFIT_DISTRIBUTION', 'APPLICATION', 'REDEMPTION');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_professional" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "birth_date" DATE NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ProductType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "units_in_stock" INTEGER NOT NULL DEFAULT 0,
    "quantity_per_unit" DECIMAL(12,3) NOT NULL,
    "measure_unit" "MeasureUnit" NOT NULL,
    "usable_quantity" DECIMAL(12,3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedure_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedures" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration_minutes" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "type" "AppointmentType" NOT NULL DEFAULT 'APPOINTMENT',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "professional_id" UUID NOT NULL,
    "client_id" UUID,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "payment_method" "PaymentMethod",
    "installments" INTEGER NOT NULL DEFAULT 1,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deposit_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deposit_paid_at" TIMESTAMP(3),
    "subtotal" DECIMAL(10,2),
    "fee_rate" DECIMAL(6,4),
    "fee_amount" DECIMAL(10,2),
    "fee_passed_to_client" BOOLEAN NOT NULL DEFAULT false,
    "amount_charged_to_client" DECIMAL(10,2),
    "net_amount" DECIMAL(10,2),
    "notes" TEXT,
    "parent_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_procedures" (
    "id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "procedure_id" UUID NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "price_snapshot" DECIMAL(10,2) NOT NULL,
    "duration_snapshot" INTEGER NOT NULL,

    CONSTRAINT "appointment_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comandas" (
    "id" UUID NOT NULL,
    "status" "ComandaStatus" NOT NULL DEFAULT 'OPEN',
    "appointment_id" UUID NOT NULL,
    "client_id" UUID,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(10,2),
    "deposit_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2),
    "amount_due" DECIMAL(10,2),
    "payment_method" "PaymentMethod",
    "installments" INTEGER NOT NULL DEFAULT 1,
    "fee_rate" DECIMAL(6,4),
    "fee_amount" DECIMAL(10,2),
    "net_amount" DECIMAL(10,2),
    "notes" TEXT,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comandas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comanda_procedures" (
    "id" UUID NOT NULL,
    "comanda_id" UUID NOT NULL,
    "procedure_id" UUID NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "price_snapshot" DECIMAL(10,2) NOT NULL,
    "duration_snapshot" INTEGER NOT NULL,

    CONSTRAINT "comanda_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comanda_products" (
    "id" UUID NOT NULL,
    "comanda_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "quantity_used" DECIMAL(12,3) NOT NULL,
    "measure_unit" "MeasureUnit" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comanda_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_accounts" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "CashFlowCategory" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "procedure_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_entries" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "category" "CashFlowCategory" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "account_id" UUID,
    "description" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_evaluations" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "focus" "EvaluationFocus" NOT NULL DEFAULT 'BOTH',
    "evaluation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allergies" TEXT,
    "chronic_diseases" TEXT,
    "hormonal_changes" TEXT,
    "medications" TEXT,
    "has_pacemaker" BOOLEAN,
    "has_metal_implants" BOOLEAN,
    "has_dental_implant" BOOLEAN,
    "prostheses_notes" TEXT,
    "is_pregnant" BOOLEAN,
    "is_breastfeeding" BOOLEAN,
    "recent_surgery" BOOLEAN,
    "recent_surgery_notes" TEXT,
    "sleep_hours_per_night" INTEGER,
    "wakes_up_tired" BOOLEAN,
    "water_intake_liters" DECIMAL(4,2),
    "regular_bowel_function" BOOLEAN,
    "smokes" BOOLEAN,
    "drinks_alcohol" BOOLEAN,
    "habits_notes" TEXT,
    "stress_level" INTEGER,
    "fitzpatrick" "Fitzpatrick",
    "skin_type" "SkinType",
    "skincare_routine" TEXT,
    "uses_sunscreen" BOOLEAN,
    "sunscreen_spf" INTEGER,
    "reapplies_sunscreen" BOOLEAN,
    "facial_aesthetic_history" TEXT,
    "skin_sensitivity" BOOLEAN,
    "has_rosacea" BOOLEAN,
    "frequent_sun_exposure" BOOLEAN,
    "wash_frequency_per_week" INTEGER,
    "scalp_complaints" TEXT,
    "has_hair_loss" BOOLEAN,
    "hair_loss_duration" TEXT,
    "family_baldness_history" BOOLEAN,
    "chemical_treatments" TEXT,
    "last_chemical_date" DATE,
    "uses_heat_tools" BOOLEAN,
    "uses_thermal_protector" BOOLEAN,
    "hair_care_routine" TEXT,
    "declaration_accepted" BOOLEAN NOT NULL DEFAULT false,
    "authorizes_image_internal" BOOLEAN,
    "authorizes_image_social_media" BOOLEAN,
    "signed_by_name" TEXT,
    "signed_at" TIMESTAMP(3),
    "signature_data_url" TEXT,
    "notes" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" UUID NOT NULL,
    "type" "ReminderType" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3) NOT NULL,
    "priority" "ReminderPriority" NOT NULL DEFAULT 'MEDIUM',
    "completed_at" TIMESTAMP(3),
    "client_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_goals" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "target_amount" DECIMAL(10,2) NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_codes_user_id_idx" ON "password_reset_codes"("user_id");

-- CreateIndex
CREATE INDEX "clients_full_name_idx" ON "clients"("full_name");

-- CreateIndex
CREATE INDEX "clients_phone_idx" ON "clients"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_type_idx" ON "products"("type");

-- CreateIndex
CREATE UNIQUE INDEX "procedure_categories_name_key" ON "procedure_categories"("name");

-- CreateIndex
CREATE INDEX "procedures_name_idx" ON "procedures"("name");

-- CreateIndex
CREATE INDEX "procedures_category_id_idx" ON "procedures"("category_id");

-- CreateIndex
CREATE INDEX "appointments_professional_id_start_time_idx" ON "appointments"("professional_id", "start_time");

-- CreateIndex
CREATE INDEX "appointments_client_id_idx" ON "appointments"("client_id");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_start_time_idx" ON "appointments"("start_time");

-- CreateIndex
CREATE INDEX "appointment_procedures_appointment_id_idx" ON "appointment_procedures"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "comandas_appointment_id_key" ON "comandas"("appointment_id");

-- CreateIndex
CREATE INDEX "comandas_status_idx" ON "comandas"("status");

-- CreateIndex
CREATE INDEX "comandas_client_id_idx" ON "comandas"("client_id");

-- CreateIndex
CREATE INDEX "comanda_procedures_comanda_id_idx" ON "comanda_procedures"("comanda_id");

-- CreateIndex
CREATE INDEX "comanda_products_comanda_id_idx" ON "comanda_products"("comanda_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_accounts_procedure_id_key" ON "financial_accounts"("procedure_id");

-- CreateIndex
CREATE INDEX "financial_accounts_category_idx" ON "financial_accounts"("category");

-- CreateIndex
CREATE INDEX "financial_entries_date_idx" ON "financial_entries"("date");

-- CreateIndex
CREATE INDEX "financial_entries_category_idx" ON "financial_entries"("category");

-- CreateIndex
CREATE INDEX "financial_entries_account_id_idx" ON "financial_entries"("account_id");

-- CreateIndex
CREATE INDEX "client_evaluations_client_id_idx" ON "client_evaluations"("client_id");

-- CreateIndex
CREATE INDEX "client_evaluations_evaluation_date_idx" ON "client_evaluations"("evaluation_date");

-- CreateIndex
CREATE INDEX "reminders_due_date_idx" ON "reminders"("due_date");

-- CreateIndex
CREATE INDEX "reminders_completed_at_idx" ON "reminders"("completed_at");

-- CreateIndex
CREATE UNIQUE INDEX "reminders_client_id_type_due_date_key" ON "reminders"("client_id", "type", "due_date");

-- CreateIndex
CREATE INDEX "financial_goals_start_date_end_date_idx" ON "financial_goals"("start_date", "end_date");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_codes" ADD CONSTRAINT "password_reset_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "procedure_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_procedures" ADD CONSTRAINT "appointment_procedures_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_procedures" ADD CONSTRAINT "appointment_procedures_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_procedures" ADD CONSTRAINT "comanda_procedures_comanda_id_fkey" FOREIGN KEY ("comanda_id") REFERENCES "comandas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_procedures" ADD CONSTRAINT "comanda_procedures_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_products" ADD CONSTRAINT "comanda_products_comanda_id_fkey" FOREIGN KEY ("comanda_id") REFERENCES "comandas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_products" ADD CONSTRAINT "comanda_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_evaluations" ADD CONSTRAINT "client_evaluations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

