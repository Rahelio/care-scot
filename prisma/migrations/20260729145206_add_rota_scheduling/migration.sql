/*
  Warnings:

  - You are about to drop the `rota_shifts` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `organisation_id` to the `rota_availability` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `day_of_week` on the `rota_availability` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "RotaVisitStatus" AS ENUM ('UNASSIGNED', 'PARTIALLY_ASSIGNED', 'ASSIGNED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "rota_shifts" DROP CONSTRAINT "rota_shifts_organisation_id_fkey";

-- DropForeignKey
ALTER TABLE "rota_shifts" DROP CONSTRAINT "rota_shifts_service_user_id_fkey";

-- DropForeignKey
ALTER TABLE "rota_shifts" DROP CONSTRAINT "rota_shifts_staff_member_id_fkey";

-- AlterTable
ALTER TABLE "care_visit_records" ADD COLUMN     "rota_visit_id" UUID;

-- AlterTable
ALTER TABLE "rota_availability" ADD COLUMN     "organisation_id" UUID NOT NULL,
DROP COLUMN "day_of_week",
ADD COLUMN     "day_of_week" "DayOfWeek" NOT NULL;

-- DropTable
DROP TABLE "rota_shifts";

-- DropEnum
DROP TYPE "ShiftStatus";

-- DropEnum
DROP TYPE "ShiftType";

-- CreateTable
CREATE TABLE "rota_visits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "service_user_id" UUID NOT NULL,
    "visit_date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "carers_required" INTEGER NOT NULL DEFAULT 1,
    "status" "RotaVisitStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "rota_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rota_visit_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "rota_visit_id" UUID NOT NULL,
    "staff_member_id" UUID NOT NULL,
    "has_conflict_override" BOOLEAN NOT NULL DEFAULT false,
    "conflict_details" JSONB,
    "assigned_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rota_visit_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rota_visits_organisation_id_visit_date_idx" ON "rota_visits"("organisation_id", "visit_date");

-- CreateIndex
CREATE INDEX "rota_visits_organisation_id_service_user_id_visit_date_idx" ON "rota_visits"("organisation_id", "service_user_id", "visit_date");

-- CreateIndex
CREATE INDEX "rota_visit_assignments_organisation_id_staff_member_id_idx" ON "rota_visit_assignments"("organisation_id", "staff_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "rota_visit_assignments_rota_visit_id_staff_member_id_key" ON "rota_visit_assignments"("rota_visit_id", "staff_member_id");

-- CreateIndex
CREATE INDEX "rota_availability_organisation_id_staff_member_id_idx" ON "rota_availability"("organisation_id", "staff_member_id");

-- AddForeignKey
ALTER TABLE "care_visit_records" ADD CONSTRAINT "care_visit_records_rota_visit_id_fkey" FOREIGN KEY ("rota_visit_id") REFERENCES "rota_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_availability" ADD CONSTRAINT "rota_availability_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_visits" ADD CONSTRAINT "rota_visits_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_visits" ADD CONSTRAINT "rota_visits_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_visit_assignments" ADD CONSTRAINT "rota_visit_assignments_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_visit_assignments" ADD CONSTRAINT "rota_visit_assignments_rota_visit_id_fkey" FOREIGN KEY ("rota_visit_id") REFERENCES "rota_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_visit_assignments" ADD CONSTRAINT "rota_visit_assignments_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_visit_assignments" ADD CONSTRAINT "rota_visit_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
