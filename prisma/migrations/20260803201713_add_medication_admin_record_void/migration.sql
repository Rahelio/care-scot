-- AlterTable
ALTER TABLE "medication_administration_records" ADD COLUMN     "void_reason" TEXT,
ADD COLUMN     "voided_at" TIMESTAMPTZ,
ADD COLUMN     "voided_by" UUID;

-- AddForeignKey
ALTER TABLE "medication_administration_records" ADD CONSTRAINT "medication_administration_records_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
