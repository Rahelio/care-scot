-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'SENIOR_CARER', 'CARER', 'OFFICE_STAFF', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT');

-- CreateEnum
CREATE TYPE "ServiceUserStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'DISCHARGED', 'DECEASED');

-- CreateEnum
CREATE TYPE "PoaType" AS ENUM ('WELFARE', 'FINANCIAL', 'BOTH');

-- CreateEnum
CREATE TYPE "PersonalPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RiskAssessmentType" AS ENUM ('ENVIRONMENTAL', 'MOVING_HANDLING', 'FALLS', 'NUTRITION_HYDRATION', 'SKIN_INTEGRITY', 'FIRE_SAFETY', 'LONE_WORKING', 'INFECTION_CONTROL', 'SPECIFIC_CARE_TASK');

-- CreateEnum
CREATE TYPE "RiskAssessmentStatus" AS ENUM ('ACTIVE', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('CARE_AND_SUPPORT', 'INFORMATION_SHARING', 'MEDICATION', 'PHOTOGRAPHY', 'OTHER');

-- CreateEnum
CREATE TYPE "HealthRecordType" AS ENUM ('MEDICAL_HISTORY', 'DIAGNOSIS', 'ALLERGY', 'GP_VISIT', 'HOSPITAL_ADMISSION', 'HOSPITAL_DISCHARGE', 'HEALTHCARE_VISIT', 'CONDITION_CHANGE');

-- CreateEnum
CREATE TYPE "AllergySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING');

-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('SCHEDULED', 'NEEDS_CHANGE', 'ANNUAL');

-- CreateEnum
CREATE TYPE "StaffRoleType" AS ENUM ('CARER', 'SENIOR_CARER', 'NURSE', 'COORDINATOR', 'MANAGER', 'ADMIN', 'OTHER');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'BANK', 'AGENCY');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'LEFT');

-- CreateEnum
CREATE TYPE "DisclosureLevel" AS ENUM ('ENHANCED', 'BASIC');

-- CreateEnum
CREATE TYPE "RegistrationType" AS ENUM ('SSSC', 'NMC', 'OTHER');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('EMPLOYER', 'CHARACTER');

-- CreateEnum
CREATE TYPE "SupervisionType" AS ENUM ('INDIVIDUAL', 'GROUP', 'SPOT_CHECK', 'OBSERVATION');

-- CreateEnum
CREATE TYPE "TrainingType" AS ENUM ('FIRE_SAFETY', 'HEALTH_AND_SAFETY', 'INFECTION_CONTROL', 'FOOD_HYGIENE', 'FIRST_AID', 'SAFEGUARDING_ADULTS', 'MENTAL_CAPACITY_AWI', 'EQUALITY_DIVERSITY', 'DATA_PROTECTION', 'MOVING_HANDLING', 'MEDICATION_ADMIN', 'CATHETER_CARE', 'DIABETES_CARE', 'DEMENTIA_AWARENESS', 'END_OF_LIFE', 'SPECIALIST_OTHER');

-- CreateEnum
CREATE TYPE "AbsenceType" AS ENUM ('SICK', 'HOLIDAY', 'UNAUTHORISED', 'OTHER');

-- CreateEnum
CREATE TYPE "LeavingReason" AS ENUM ('RESIGNED', 'DISMISSED', 'REDUNDANCY', 'END_OF_CONTRACT', 'RETIRED', 'OTHER');

-- CreateEnum
CREATE TYPE "SanctionLevel" AS ENUM ('VERBAL', 'WRITTEN', 'FINAL', 'DISMISSAL');

-- CreateEnum
CREATE TYPE "DisciplinaryRecordType" AS ENUM ('DISCIPLINARY', 'GRIEVANCE', 'CAPABILITY', 'WARNING');

-- CreateEnum
CREATE TYPE "MedicationForm" AS ENUM ('TABLET', 'LIQUID', 'INJECTION', 'TOPICAL', 'PATCH', 'INHALER', 'DROPS', 'SUPPOSITORY', 'OTHER');

-- CreateEnum
CREATE TYPE "MedicationStatus" AS ENUM ('ACTIVE', 'DISCONTINUED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "MedicationErrorType" AS ENUM ('WRONG_DOSE', 'WRONG_MEDICATION', 'WRONG_TIME', 'OMISSION', 'WRONG_ROUTE', 'WRONG_PATIENT', 'DOCUMENTATION_ERROR', 'OTHER');

-- CreateEnum
CREATE TYPE "NccMerpCategory" AS ENUM ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('ACCIDENT', 'INCIDENT', 'NEAR_MISS', 'SAFEGUARDING', 'MEDICATION_ERROR', 'DEATH', 'PROPERTY_DAMAGE', 'MISSING_PERSON', 'ASSAULT', 'FIRE', 'INFECTIOUS_OUTBREAK', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'UNDER_INVESTIGATION', 'CLOSED');

-- CreateEnum
CREATE TYPE "SafeguardingConcernType" AS ENUM ('PHYSICAL', 'EMOTIONAL', 'SEXUAL', 'FINANCIAL', 'NEGLECT', 'SELF_NEGLECT', 'INSTITUTIONAL', 'DISCRIMINATORY', 'OTHER');

-- CreateEnum
CREATE TYPE "SafeguardingStatus" AS ENUM ('OPEN', 'REFERRED', 'UNDER_INVESTIGATION', 'CLOSED');

-- CreateEnum
CREATE TYPE "CareInspectorateNotificationType" AS ENUM ('DEATH', 'SERIOUS_INJURY', 'ABUSE_ALLEGATION', 'SERIOUS_INCIDENT', 'MEDICATION_ERROR_E_PLUS', 'INFECTIOUS_OUTBREAK', 'SERVICE_DISRUPTION', 'POLICE_INVOLVEMENT', 'FIRE', 'PROPERTY_DAMAGE', 'SERVICE_CHANGE', 'MANAGER_CHANGE', 'OWNERSHIP_CHANGE', 'REGISTRATION_VARIATION', 'SERVICE_CLOSURE');

-- CreateEnum
CREATE TYPE "PolicyCategory" AS ENUM ('SAFEGUARDING', 'HEALTH_SAFETY', 'HR', 'CLINICAL', 'OPERATIONAL', 'INFORMATION_GOVERNANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "QualityAuditType" AS ENUM ('CARE_PLAN', 'MEDICATION', 'HEALTH_SAFETY', 'INFECTION_CONTROL', 'STAFF_FILE', 'RECORD_KEEPING');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('HOIST', 'SLING', 'BP_MONITOR', 'THERMOMETER', 'MOVING_HANDLING', 'VEHICLE', 'FIRST_AID_KIT', 'PPE_STOCK', 'OTHER');

-- CreateEnum
CREATE TYPE "CheckResult" AS ENUM ('PASS', 'FAIL', 'NEEDS_ATTENTION');

-- CreateEnum
CREATE TYPE "SurveyType" AS ENUM ('SERVICE_USER', 'FAMILY', 'STAFF');

-- CreateEnum
CREATE TYPE "AnnualReturnStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('LOCAL', 'S3');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('REGULAR', 'ON_CALL', 'TRAINING', 'ADMIN');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "organisations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "care_inspectorate_reg_number" TEXT,
    "registered_address" TEXT,
    "registered_manager_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "registration_conditions" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMPTZ,
    "name" TEXT,
    "image" TEXT,
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CARER',
    "staff_member_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMPTZ NOT NULL
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "user_id" UUID,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "changes" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "chi_number" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "phone_primary" TEXT,
    "phone_secondary" TEXT,
    "email" TEXT,
    "ni_number" TEXT,
    "gp_name" TEXT,
    "gp_practice" TEXT,
    "gp_phone" TEXT,
    "communication_needs" TEXT,
    "language_preference" TEXT,
    "interpreter_required" BOOLEAN NOT NULL DEFAULT false,
    "cultural_religious_needs" TEXT,
    "dietary_requirements" TEXT,
    "daily_routine_preferences" TEXT,
    "advance_care_plan" TEXT,
    "status" "ServiceUserStatus" NOT NULL DEFAULT 'ACTIVE',
    "discharge_date" DATE,
    "discharge_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "service_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_user_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_user_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "contact_name" TEXT NOT NULL,
    "relationship" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "is_next_of_kin" BOOLEAN NOT NULL DEFAULT false,
    "is_emergency_contact" BOOLEAN NOT NULL DEFAULT false,
    "has_power_of_attorney" BOOLEAN NOT NULL DEFAULT false,
    "poa_type" "PoaType",
    "is_guardian" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "service_user_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_user_healthcare_professionals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_user_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "professional_name" TEXT NOT NULL,
    "role" TEXT,
    "organisation" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "service_user_healthcare_professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_user_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "plan_version" INTEGER NOT NULL,
    "initial_assessment" TEXT,
    "health_needs" TEXT,
    "welfare_needs" TEXT,
    "personal_care_requirements" TEXT,
    "how_needs_will_be_met" TEXT,
    "wishes_and_preferences" TEXT,
    "goals_and_outcomes" TEXT,
    "created_date" DATE NOT NULL,
    "review_date" DATE,
    "next_review_date" DATE,
    "consulted_with_service_user" BOOLEAN NOT NULL DEFAULT false,
    "consultation_notes" TEXT,
    "consulted_with_representative" BOOLEAN NOT NULL DEFAULT false,
    "rep_consultation_notes" TEXT,
    "status" "PersonalPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "personal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_user_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "assessment_type" "RiskAssessmentType" NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "assessment_detail" TEXT,
    "control_measures" TEXT,
    "assessed_by" UUID,
    "assessment_date" DATE NOT NULL,
    "review_date" DATE,
    "next_review_date" DATE,
    "status" "RiskAssessmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_user_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "consent_type" "ConsentType" NOT NULL,
    "consent_given" BOOLEAN NOT NULL,
    "capacity_assessed" BOOLEAN NOT NULL DEFAULT false,
    "capacity_outcome" TEXT,
    "awi_documentation" TEXT,
    "best_interest_decision" TEXT,
    "signed_by" TEXT,
    "relationship_to_service_user" TEXT,
    "consent_date" DATE NOT NULL,
    "review_date" DATE,
    "document_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_agreements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_user_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "services_description" TEXT,
    "visit_frequency" TEXT,
    "visit_duration_minutes" INTEGER,
    "cost_per_visit" DECIMAL(10,2),
    "cost_per_hour" DECIMAL(10,2),
    "weekly_cost" DECIMAL(10,2),
    "payment_terms" TEXT,
    "notice_period_days" INTEGER,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "signed_by_service_user" BOOLEAN NOT NULL DEFAULT false,
    "signed_by_representative" TEXT,
    "signed_by_provider" BOOLEAN NOT NULL DEFAULT false,
    "agreement_date" DATE,
    "inspection_report_provided" BOOLEAN NOT NULL DEFAULT false,
    "document_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "service_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_user_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "record_type" "HealthRecordType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "AllergySeverity",
    "recorded_date" DATE NOT NULL,
    "recorded_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "health_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_visit_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_user_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "visit_date" DATE NOT NULL,
    "scheduled_start" TIMESTAMPTZ NOT NULL,
    "scheduled_end" TIMESTAMPTZ NOT NULL,
    "actual_start" TIMESTAMPTZ,
    "actual_end" TIMESTAMPTZ,
    "staff_member_id" UUID NOT NULL,
    "tasks_completed" JSONB,
    "wellbeing_observations" TEXT,
    "refused_care" BOOLEAN NOT NULL DEFAULT false,
    "refused_care_details" TEXT,
    "family_communication" TEXT,
    "condition_changes" TEXT,
    "notes" TEXT,
    "signed_off_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "care_visit_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_user_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_user_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "review_date" DATE NOT NULL,
    "review_type" "ReviewType" NOT NULL,
    "reviewer_id" UUID,
    "service_user_feedback" TEXT,
    "family_feedback" TEXT,
    "changes_identified" TEXT,
    "actions_taken" TEXT,
    "mdt_meeting_notes" TEXT,
    "next_review_date" DATE,
    "personal_plan_updated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "service_user_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" DATE,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "ni_number" TEXT,
    "job_title" TEXT,
    "role_type" "StaffRoleType" NOT NULL,
    "employment_type" "EmploymentType" NOT NULL,
    "contract_hours_per_week" DECIMAL(5,2),
    "hourly_rate" DECIMAL(10,2),
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "probation_end_date" DATE,
    "right_to_work_checked" BOOLEAN NOT NULL DEFAULT false,
    "right_to_work_document" TEXT,
    "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_pvg_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_member_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "pvg_membership_number" TEXT,
    "pvg_scheme_record_date" DATE,
    "pvg_update_service" BOOLEAN NOT NULL DEFAULT false,
    "disclosure_certificate_number" TEXT,
    "disclosure_date" DATE,
    "disclosure_level" "DisclosureLevel",
    "renewal_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "staff_pvg_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_registrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_member_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "registration_type" "RegistrationType" NOT NULL,
    "registration_number" TEXT,
    "registration_category" TEXT,
    "expiry_date" DATE,
    "qualification_name" TEXT,
    "certificate_document_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "staff_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_references" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_member_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "referee_name" TEXT NOT NULL,
    "referee_organisation" TEXT,
    "referee_role" TEXT,
    "referee_contact" TEXT,
    "reference_type" "ReferenceType" NOT NULL,
    "reference_received" BOOLEAN NOT NULL DEFAULT false,
    "reference_date" DATE,
    "reference_verified_by" UUID,
    "employment_gap_explanation" TEXT,
    "document_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "staff_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_health_declarations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_member_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "declaration_date" DATE NOT NULL,
    "fit_to_work" BOOLEAN NOT NULL,
    "oh_assessment_required" BOOLEAN NOT NULL DEFAULT false,
    "oh_assessment_date" DATE,
    "immunisations" JSONB,
    "fitness_to_work_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "staff_health_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_induction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_member_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "induction_started" DATE,
    "induction_completed" DATE,
    "mentor_id" UUID,
    "shadow_shifts_completed" INTEGER NOT NULL DEFAULT 0,
    "competency_assessments" JSONB,
    "checklist_items" JSONB,
    "probation_review_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "staff_induction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_training_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_member_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "training_type" "TrainingType" NOT NULL,
    "training_name" TEXT NOT NULL,
    "training_provider" TEXT,
    "completion_date" DATE NOT NULL,
    "expiry_date" DATE,
    "certificate_document_id" UUID,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "staff_training_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_supervisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_member_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "supervision_date" DATE NOT NULL,
    "supervisor_id" UUID,
    "supervision_type" "SupervisionType" NOT NULL,
    "discussion_notes" TEXT,
    "agreed_actions" JSONB,
    "next_supervision_date" DATE,
    "document_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "staff_supervisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_appraisals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_member_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "appraisal_date" DATE NOT NULL,
    "appraiser_id" UUID,
    "performance_summary" TEXT,
    "development_plan" TEXT,
    "goals" JSONB,
    "competency_ratings" JSONB,
    "next_appraisal_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "staff_appraisals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_disciplinary_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_member_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "record_type" "DisciplinaryRecordType" NOT NULL,
    "date_raised" DATE NOT NULL,
    "description" TEXT,
    "investigation_notes" TEXT,
    "outcome" TEXT,
    "sanction_level" "SanctionLevel",
    "appeal_outcome" TEXT,
    "document_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "staff_disciplinary_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_absence_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_member_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "absence_type" "AbsenceType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "total_days" DECIMAL(5,1),
    "reason" TEXT,
    "return_to_work_interview" BOOLEAN NOT NULL DEFAULT false,
    "rtw_date" DATE,
    "rtw_notes" TEXT,
    "fit_note_document_id" UUID,
    "approved_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "staff_absence_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_leaving" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_member_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "leaving_date" DATE NOT NULL,
    "reason" "LeavingReason" NOT NULL,
    "resignation_letter_id" UUID,
    "exit_interview_notes" TEXT,
    "equipment_returned" JSONB,
    "final_pay_processed" BOOLEAN NOT NULL DEFAULT false,
    "reference_provided" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "staff_leaving_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_user_medications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_user_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "medication_name" TEXT NOT NULL,
    "form" "MedicationForm",
    "dose" TEXT,
    "frequency" TEXT,
    "route" TEXT,
    "prescriber" TEXT,
    "pharmacy" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_prn" BOOLEAN NOT NULL DEFAULT false,
    "prn_reason" TEXT,
    "prn_max_dose" TEXT,
    "is_controlled_drug" BOOLEAN NOT NULL DEFAULT false,
    "special_instructions" TEXT,
    "status" "MedicationStatus" NOT NULL DEFAULT 'ACTIVE',
    "discontinued_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "service_user_medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_administration_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_user_id" UUID NOT NULL,
    "medication_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "scheduled_time" TEXT NOT NULL,
    "administered" BOOLEAN NOT NULL DEFAULT false,
    "administered_by" UUID,
    "administered_at" TIMESTAMPTZ,
    "dose_given" TEXT,
    "refused" BOOLEAN NOT NULL DEFAULT false,
    "refused_reason" TEXT,
    "not_available" BOOLEAN NOT NULL DEFAULT false,
    "not_available_reason" TEXT,
    "prn_reason_given" TEXT,
    "outcome_notes" TEXT,
    "witness_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "medication_administration_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_errors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "service_user_id" UUID,
    "error_date" DATE NOT NULL,
    "error_type" "MedicationErrorType" NOT NULL,
    "ncc_merp_category" "NccMerpCategory",
    "description" TEXT,
    "action_taken" TEXT,
    "reported_by" UUID,
    "reported_date" DATE,
    "investigated_by" UUID,
    "investigation_outcome" TEXT,
    "care_inspectorate_notified" BOOLEAN NOT NULL DEFAULT false,
    "notification_date" DATE,
    "lessons_learned" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "medication_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_audits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "audit_date" DATE NOT NULL,
    "auditor_id" UUID,
    "audit_findings" JSONB,
    "issues_identified" TEXT,
    "actions_required" JSONB,
    "status" "AuditStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "medication_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "service_user_id" UUID,
    "staff_member_id" UUID,
    "incident_type" "IncidentType" NOT NULL,
    "incident_date" DATE NOT NULL,
    "incident_time" TEXT,
    "location" TEXT,
    "description" TEXT,
    "severity" "IncidentSeverity" NOT NULL,
    "witnesses" TEXT,
    "immediate_action_taken" TEXT,
    "reported_by" UUID,
    "reported_date" DATE,
    "investigation_notes" TEXT,
    "root_cause" TEXT,
    "actions_to_prevent_recurrence" JSONB,
    "outcome" TEXT,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "riddor_reportable" BOOLEAN NOT NULL DEFAULT false,
    "riddor_reference" TEXT,
    "closed_by" UUID,
    "closed_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safeguarding_concerns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "service_user_id" UUID NOT NULL,
    "concern_date" DATE NOT NULL,
    "concern_type" "SafeguardingConcernType" NOT NULL,
    "description" TEXT,
    "raised_by" UUID,
    "referred_to" TEXT,
    "referral_date" DATE,
    "referral_reference" TEXT,
    "adult_protection_investigation" BOOLEAN NOT NULL DEFAULT false,
    "investigation_outcome" TEXT,
    "actions_taken" TEXT,
    "status" "SafeguardingStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "safeguarding_concerns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_inspectorate_notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "incident_id" UUID,
    "notification_type" "CareInspectorateNotificationType" NOT NULL,
    "submitted_date" DATE,
    "care_inspectorate_reference" TEXT,
    "description" TEXT,
    "follow_up_correspondence" TEXT,
    "actions_taken" TEXT,
    "submitted_by" UUID,
    "document_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "care_inspectorate_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "policy_name" TEXT NOT NULL,
    "policy_category" "PolicyCategory" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "effective_date" DATE,
    "review_date" DATE,
    "next_review_date" DATE,
    "approved_by" UUID,
    "approved_date" DATE,
    "document_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_acknowledgments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "policy_id" UUID NOT NULL,
    "staff_member_id" UUID NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "policy_acknowledgments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "date_received" DATE NOT NULL,
    "complainant_name" TEXT NOT NULL,
    "complainant_relationship" TEXT,
    "service_user_id" UUID,
    "nature_of_complaint" TEXT,
    "investigation_carried_out" TEXT,
    "investigated_by" UUID,
    "outcome" TEXT,
    "actions_taken" JSONB,
    "response_sent_date" DATE,
    "response_method" TEXT,
    "referred_to_care_inspectorate" BOOLEAN NOT NULL DEFAULT false,
    "referral_date" DATE,
    "satisfaction_with_outcome" TEXT,
    "lessons_learned" TEXT,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "closed_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "service_user_id" UUID,
    "date_received" DATE NOT NULL,
    "from_name" TEXT NOT NULL,
    "compliment_text" TEXT,
    "shared_with_staff" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "compliments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_audits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "audit_type" "QualityAuditType" NOT NULL,
    "audit_date" DATE NOT NULL,
    "auditor_id" UUID,
    "findings" JSONB,
    "issues" TEXT,
    "recommendations" TEXT,
    "action_plan" JSONB,
    "status" "AuditStatus" NOT NULL DEFAULT 'OPEN',
    "follow_up_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "quality_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_inspectorate_inspections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "inspection_date" DATE NOT NULL,
    "inspector_name" TEXT,
    "grades" JSONB,
    "report_summary" TEXT,
    "requirements" JSONB,
    "recommendations" JSONB,
    "action_plan_id" UUID,
    "report_document_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "care_inspectorate_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_checks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "equipment_type" "EquipmentType" NOT NULL,
    "equipment_name" TEXT NOT NULL,
    "serial_number" TEXT,
    "location" TEXT,
    "check_date" DATE NOT NULL,
    "checked_by" UUID,
    "check_result" "CheckResult" NOT NULL,
    "next_check_date" DATE,
    "notes" TEXT,
    "certificate_document_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "equipment_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satisfaction_surveys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "service_user_id" UUID,
    "survey_date" DATE NOT NULL,
    "survey_type" "SurveyType" NOT NULL,
    "responses" JSONB,
    "overall_rating" INTEGER,
    "comments" TEXT,
    "actions_from_feedback" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "satisfaction_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annual_returns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "submission_date" DATE,
    "deadline_date" DATE,
    "service_user_count" INTEGER,
    "staff_count" INTEGER,
    "self_evaluation" TEXT,
    "complaints_summary" TEXT,
    "incidents_summary" TEXT,
    "improvements_made" TEXT,
    "planned_improvements" TEXT,
    "document_id" UUID,
    "status" "AnnualReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "annual_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rota_shifts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "staff_member_id" UUID NOT NULL,
    "service_user_id" UUID,
    "shift_date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "shift_type" "ShiftType" NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rota_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rota_availability" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_member_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "available_from" TEXT NOT NULL,
    "available_to" TEXT NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rota_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size_bytes" BIGINT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "storage_provider" "StorageProvider" NOT NULL DEFAULT 'LOCAL',
    "entity_type" TEXT,
    "entity_id" UUID,
    "uploaded_by" UUID,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "staff_induction_staff_member_id_key" ON "staff_induction"("staff_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_leaving_staff_member_id_key" ON "staff_leaving"("staff_member_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_users" ADD CONSTRAINT "service_users_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_user_contacts" ADD CONSTRAINT "service_user_contacts_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_user_healthcare_professionals" ADD CONSTRAINT "service_user_healthcare_professionals_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_plans" ADD CONSTRAINT "personal_plans_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_plans" ADD CONSTRAINT "personal_plans_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_plans" ADD CONSTRAINT "personal_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_assessed_by_fkey" FOREIGN KEY ("assessed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_agreements" ADD CONSTRAINT "service_agreements_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_visit_records" ADD CONSTRAINT "care_visit_records_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_visit_records" ADD CONSTRAINT "care_visit_records_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_visit_records" ADD CONSTRAINT "care_visit_records_signed_off_by_fkey" FOREIGN KEY ("signed_off_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_user_reviews" ADD CONSTRAINT "service_user_reviews_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_user_reviews" ADD CONSTRAINT "service_user_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_pvg_records" ADD CONSTRAINT "staff_pvg_records_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_registrations" ADD CONSTRAINT "staff_registrations_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_references" ADD CONSTRAINT "staff_references_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_references" ADD CONSTRAINT "staff_references_reference_verified_by_fkey" FOREIGN KEY ("reference_verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_health_declarations" ADD CONSTRAINT "staff_health_declarations_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_induction" ADD CONSTRAINT "staff_induction_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_induction" ADD CONSTRAINT "staff_induction_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_training_records" ADD CONSTRAINT "staff_training_records_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_supervisions" ADD CONSTRAINT "staff_supervisions_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_supervisions" ADD CONSTRAINT "staff_supervisions_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_appraisals" ADD CONSTRAINT "staff_appraisals_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_appraisals" ADD CONSTRAINT "staff_appraisals_appraiser_id_fkey" FOREIGN KEY ("appraiser_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_disciplinary_records" ADD CONSTRAINT "staff_disciplinary_records_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_absence_records" ADD CONSTRAINT "staff_absence_records_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_absence_records" ADD CONSTRAINT "staff_absence_records_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_leaving" ADD CONSTRAINT "staff_leaving_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_user_medications" ADD CONSTRAINT "service_user_medications_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administration_records" ADD CONSTRAINT "medication_administration_records_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administration_records" ADD CONSTRAINT "medication_administration_records_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "service_user_medications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administration_records" ADD CONSTRAINT "medication_administration_records_administered_by_fkey" FOREIGN KEY ("administered_by") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administration_records" ADD CONSTRAINT "medication_administration_records_witness_id_fkey" FOREIGN KEY ("witness_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_errors" ADD CONSTRAINT "medication_errors_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_errors" ADD CONSTRAINT "medication_errors_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_errors" ADD CONSTRAINT "medication_errors_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_errors" ADD CONSTRAINT "medication_errors_investigated_by_fkey" FOREIGN KEY ("investigated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_audits" ADD CONSTRAINT "medication_audits_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_audits" ADD CONSTRAINT "medication_audits_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safeguarding_concerns" ADD CONSTRAINT "safeguarding_concerns_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safeguarding_concerns" ADD CONSTRAINT "safeguarding_concerns_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safeguarding_concerns" ADD CONSTRAINT "safeguarding_concerns_raised_by_fkey" FOREIGN KEY ("raised_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_inspectorate_notifications" ADD CONSTRAINT "care_inspectorate_notifications_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_inspectorate_notifications" ADD CONSTRAINT "care_inspectorate_notifications_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_inspectorate_notifications" ADD CONSTRAINT "care_inspectorate_notifications_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_acknowledgments" ADD CONSTRAINT "policy_acknowledgments_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_investigated_by_fkey" FOREIGN KEY ("investigated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliments" ADD CONSTRAINT "compliments_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliments" ADD CONSTRAINT "compliments_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_audits" ADD CONSTRAINT "quality_audits_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_audits" ADD CONSTRAINT "quality_audits_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_inspectorate_inspections" ADD CONSTRAINT "care_inspectorate_inspections_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_inspectorate_inspections" ADD CONSTRAINT "care_inspectorate_inspections_action_plan_id_fkey" FOREIGN KEY ("action_plan_id") REFERENCES "quality_audits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_checks" ADD CONSTRAINT "equipment_checks_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_checks" ADD CONSTRAINT "equipment_checks_checked_by_fkey" FOREIGN KEY ("checked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_returns" ADD CONSTRAINT "annual_returns_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_shifts" ADD CONSTRAINT "rota_shifts_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_shifts" ADD CONSTRAINT "rota_shifts_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_shifts" ADD CONSTRAINT "rota_shifts_service_user_id_fkey" FOREIGN KEY ("service_user_id") REFERENCES "service_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_availability" ADD CONSTRAINT "rota_availability_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
