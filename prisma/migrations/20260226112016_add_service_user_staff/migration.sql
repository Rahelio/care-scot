-- CreateEnum
CREATE TYPE "StaffAssignmentRole" AS ENUM ('KEY_WORKER', 'REGULAR_CARER');

-- CreateTable
CREATE TABLE "service_user_staff" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_user_id" UUID NOT NULL,
    "staff_member_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "role" "StaffAssignmentRole" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "service_user_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_user_staff_service_user_id_staff_member_id_key" ON "service_user_staff"("service_user_id", "staff_member_id");

-- AddForeignKey
ALTER TABLE "service_user_staff" ADD CONSTRAINT "service_user_staff_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_user_staff" ADD CONSTRAINT "service_user_staff_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
