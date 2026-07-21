-- AlterTable
ALTER TABLE "service_user_healthcare_professionals" ADD COLUMN     "shared_hcp_id" UUID;

-- CreateTable
CREATE TABLE "shared_healthcare_professionals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "professional_name" TEXT NOT NULL,
    "role" TEXT,
    "organisation" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,

    CONSTRAINT "shared_healthcare_professionals_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "service_user_healthcare_professionals" ADD CONSTRAINT "service_user_healthcare_professionals_shared_hcp_id_fkey" FOREIGN KEY ("shared_hcp_id") REFERENCES "shared_healthcare_professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_healthcare_professionals" ADD CONSTRAINT "shared_healthcare_professionals_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
