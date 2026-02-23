-- CreateEnum
CREATE TYPE "FunderType" AS ENUM ('LOCAL_AUTHORITY', 'HEALTH_BOARD', 'PRIVATE', 'SDS', 'OTHER');

-- CreateEnum
CREATE TYPE "DayType" AS ENUM ('WEEKDAY', 'SATURDAY', 'SUNDAY', 'BANK_HOLIDAY');

-- CreateEnum
CREATE TYPE "BillingTimeBasis" AS ENUM ('SCHEDULED', 'ACTUAL');

-- CreateEnum
CREATE TYPE "InvoiceFrequency" AS ENUM ('WEEKLY', 'FORTNIGHTLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "CarePackageStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'ENDED');

-- CreateEnum
CREATE TYPE "BillableVisitStatus" AS ENUM ('PENDING', 'APPROVED', 'DISPUTED', 'INVOICED', 'VOID');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'VOID', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "CreditNoteStatus" AS ENUM ('DRAFT', 'SENT', 'APPLIED');

-- CreateEnum
CREATE TYPE "HolidayRegion" AS ENUM ('SCOTLAND', 'ENGLAND_WALES', 'ALL');

-- AlterTable
ALTER TABLE "care_visit_records" ADD COLUMN     "care_package_id" UUID,
ADD COLUMN     "mileage_miles" DECIMAL(8,2);

-- AlterTable
ALTER TABLE "organisations" ADD COLUMN     "invoice_prefix" TEXT;

-- CreateTable
CREATE TABLE "funders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "funder_type" "FunderType" NOT NULL,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "payment_terms_days" INTEGER NOT NULL DEFAULT 30,
    "invoice_frequency" "InvoiceFrequency" NOT NULL DEFAULT 'MONTHLY',
    "billing_time_basis" "BillingTimeBasis" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "funders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "funder_id" UUID,
    "name" TEXT NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "rate_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_card_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rate_card_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "day_type" "DayType" NOT NULL,
    "time_band_start" TEXT,
    "time_band_end" TEXT,
    "rate_per_hour" DECIMAL(10,2) NOT NULL,
    "carers_required" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rate_card_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mileage_rates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rate_card_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "rate_per_mile" DECIMAL(10,4) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "mileage_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_packages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "service_user_id" UUID NOT NULL,
    "funder_id" UUID NOT NULL,
    "rate_card_id" UUID NOT NULL,
    "package_name" TEXT NOT NULL,
    "funder_reference" TEXT,
    "billing_time_basis" "BillingTimeBasis" NOT NULL DEFAULT 'SCHEDULED',
    "rounding_increment_minutes" INTEGER NOT NULL DEFAULT 15,
    "minimum_billable_minutes" INTEGER NOT NULL DEFAULT 15,
    "carers_required" INTEGER NOT NULL DEFAULT 1,
    "mileage_billable" BOOLEAN NOT NULL DEFAULT false,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "notes" TEXT,
    "status" "CarePackageStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "care_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billable_visits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "care_visit_record_id" UUID NOT NULL,
    "care_package_id" UUID NOT NULL,
    "service_user_id" UUID NOT NULL,
    "visit_date" DATE NOT NULL,
    "scheduled_start" TIMESTAMPTZ NOT NULL,
    "scheduled_end" TIMESTAMPTZ NOT NULL,
    "actual_start" TIMESTAMPTZ,
    "actual_end" TIMESTAMPTZ,
    "billing_start" TIMESTAMPTZ NOT NULL,
    "billing_end" TIMESTAMPTZ NOT NULL,
    "billing_duration_minutes" INTEGER NOT NULL,
    "carers_required" INTEGER NOT NULL DEFAULT 1,
    "day_type" "DayType" NOT NULL,
    "applied_rate_per_hour" DECIMAL(10,2) NOT NULL,
    "line_total" DECIMAL(10,2) NOT NULL,
    "mileage_miles" DECIMAL(8,2),
    "mileage_rate" DECIMAL(10,4),
    "mileage_total" DECIMAL(10,2),
    "visit_total" DECIMAL(10,2) NOT NULL,
    "status" "BillableVisitStatus" NOT NULL DEFAULT 'PENDING',
    "dispute_reason" TEXT,
    "override_amount" DECIMAL(10,2),
    "override_reason" TEXT,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ,
    "invoice_line_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "billable_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_holidays" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "holiday_date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "applies_to" "HolidayRegion" NOT NULL DEFAULT 'SCOTLAND',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bank_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "funder_id" UUID NOT NULL,
    "invoice_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "sent_date" DATE,
    "paid_date" DATE,
    "paid_amount" DECIMAL(12,2),
    "payment_reference" TEXT,
    "notes" TEXT,
    "document_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "service_user_id" UUID NOT NULL,
    "care_package_id" UUID NOT NULL,
    "description" TEXT,
    "total_visits" INTEGER NOT NULL DEFAULT 0,
    "total_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_mileage" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "care_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "mileage_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "credit_note_number" TEXT NOT NULL,
    "invoice_id" UUID NOT NULL,
    "funder_id" UUID NOT NULL,
    "credit_date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "status" "CreditNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "document_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billable_visits_care_visit_record_id_key" ON "billable_visits"("care_visit_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_holidays_organisation_id_holiday_date_key" ON "bank_holidays"("organisation_id", "holiday_date");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_organisation_id_invoice_number_key" ON "invoices"("organisation_id", "invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_organisation_id_credit_note_number_key" ON "credit_notes"("organisation_id", "credit_note_number");

-- AddForeignKey
ALTER TABLE "care_visit_records" ADD CONSTRAINT "care_visit_records_care_package_id_fkey" FOREIGN KEY ("care_package_id") REFERENCES "care_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funders" ADD CONSTRAINT "funders_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_cards" ADD CONSTRAINT "rate_cards_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_cards" ADD CONSTRAINT "rate_cards_funder_id_fkey" FOREIGN KEY ("funder_id") REFERENCES "funders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_card_lines" ADD CONSTRAINT "rate_card_lines_rate_card_id_fkey" FOREIGN KEY ("rate_card_id") REFERENCES "rate_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mileage_rates" ADD CONSTRAINT "mileage_rates_rate_card_id_fkey" FOREIGN KEY ("rate_card_id") REFERENCES "rate_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_packages" ADD CONSTRAINT "care_packages_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_packages" ADD CONSTRAINT "care_packages_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_packages" ADD CONSTRAINT "care_packages_funder_id_fkey" FOREIGN KEY ("funder_id") REFERENCES "funders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_packages" ADD CONSTRAINT "care_packages_rate_card_id_fkey" FOREIGN KEY ("rate_card_id") REFERENCES "rate_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billable_visits" ADD CONSTRAINT "billable_visits_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billable_visits" ADD CONSTRAINT "billable_visits_care_visit_record_id_fkey" FOREIGN KEY ("care_visit_record_id") REFERENCES "care_visit_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billable_visits" ADD CONSTRAINT "billable_visits_care_package_id_fkey" FOREIGN KEY ("care_package_id") REFERENCES "care_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billable_visits" ADD CONSTRAINT "billable_visits_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billable_visits" ADD CONSTRAINT "billable_visits_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billable_visits" ADD CONSTRAINT "billable_visits_invoice_line_id_fkey" FOREIGN KEY ("invoice_line_id") REFERENCES "invoice_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_holidays" ADD CONSTRAINT "bank_holidays_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_funder_id_fkey" FOREIGN KEY ("funder_id") REFERENCES "funders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_care_package_id_fkey" FOREIGN KEY ("care_package_id") REFERENCES "care_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_funder_id_fkey" FOREIGN KEY ("funder_id") REFERENCES "funders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
