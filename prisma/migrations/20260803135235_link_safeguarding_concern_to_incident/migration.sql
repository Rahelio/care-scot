-- AlterTable
ALTER TABLE "safeguarding_concerns" ADD COLUMN     "incident_id" UUID;

-- AddForeignKey
ALTER TABLE "safeguarding_concerns" ADD CONSTRAINT "safeguarding_concerns_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
