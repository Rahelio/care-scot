/**
 * Demo data seed — populates rich test data for Org 1 (Highland Home Care Ltd).
 * Run AFTER the base seed: npm run db:seed-demo
 * Idempotent: uses upsert for fixed-ID entities; skips dynamic data if records already exist.
 */

import {
  PrismaClient,
  UserRole,
  StaffRoleType,
  EmploymentType,
  StaffStatus,
  PersonalPlanStatus,
  RiskLevel,
  RiskAssessmentType,
  ConsentType,
  HealthRecordType,
  AllergySeverity,
  MedicationForm,
  MedicationStatus,
  TrainingType,
  SupervisionType,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  BillingTimeBasis,
  DayOfWeek,
  DayType,
  BillableVisitStatus,
  InvoiceStatus,
  ReviewType,
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const IDS = {
  org1: "00000000-0000-0000-0000-000000000001",
  // Existing staff / clients / packages
  craigStaff: "00000000-0000-0000-0000-000000000010",
  maryMacDonald: "00000000-0000-0000-0000-000000000020",
  highlandCouncil: "00000000-0000-0000-0000-000000000030",
  privateFunder: "00000000-0000-0000-0000-000000000031",
  councilRateCard: "00000000-0000-0000-0000-000000000040",
  privateRateCard: "00000000-0000-0000-0000-000000000041",
  maryPackage: "00000000-0000-0000-0000-000000000050",
  // New staff members
  davidStaff: "00000000-0000-0000-0000-000000000011",
  fionaStaff: "00000000-0000-0000-0000-000000000012",
  janetStaff: "00000000-0000-0000-0000-000000000013",
  alanStaff: "00000000-0000-0000-0000-000000000014",
  // New service users
  agnesRobertson: "00000000-0000-0000-0000-000000000022",
  donaldMacKay: "00000000-0000-0000-0000-000000000023",
  eileenBurns: "00000000-0000-0000-0000-000000000024",
  williamStewart: "00000000-0000-0000-0000-000000000025",
  jeanMacPherson: "00000000-0000-0000-0000-000000000026",
  // New care packages
  agnesPackage: "00000000-0000-0000-0000-000000000051",
  donaldPackage: "00000000-0000-0000-0000-000000000052",
  eileenPackage: "00000000-0000-0000-0000-000000000053",
  williamPackage: "00000000-0000-0000-0000-000000000054",
  jeanPackage: "00000000-0000-0000-0000-000000000055",
};

async function main() {
  console.log("🌱 Seeding demo data for Highland Home Care Ltd...\n");

  const password = await hash("Password123!", 12);

  // ── Look up existing base users ────────────────────────────────────────────
  const sarah = await prisma.user.findUniqueOrThrow({ where: { email: "sarah@highlandhomecare.co.uk" } });
  const david = await prisma.user.findUniqueOrThrow({ where: { email: "david@highlandhomecare.co.uk" } });
  const fiona = await prisma.user.findUniqueOrThrow({ where: { email: "fiona@highlandhomecare.co.uk" } });

  // ── New users ──────────────────────────────────────────────────────────────
  const janet = await prisma.user.upsert({
    where: { email: "janet@highlandhomecare.co.uk" },
    update: {},
    create: {
      organisationId: IDS.org1,
      email: "janet@highlandhomecare.co.uk",
      passwordHash: password,
      role: UserRole.CARER,
      name: "Janet Morrison",
      isActive: true,
    },
  });

  const alan = await prisma.user.upsert({
    where: { email: "alan@highlandhomecare.co.uk" },
    update: {},
    create: {
      organisationId: IDS.org1,
      email: "alan@highlandhomecare.co.uk",
      passwordHash: password,
      role: UserRole.CARER,
      name: "Alan McGregor",
      isActive: true,
    },
  });

  console.log("✅ Users: janet, alan");

  // ── Staff members ──────────────────────────────────────────────────────────
  const davidStaff = await prisma.staffMember.upsert({
    where: { id: IDS.davidStaff },
    update: {},
    create: {
      id: IDS.davidStaff,
      organisationId: IDS.org1,
      firstName: "David",
      lastName: "Henderson",
      dateOfBirth: new Date("1978-03-15"),
      addressLine1: "22 Crown Drive",
      city: "Inverness",
      postcode: "IV2 4QS",
      phone: "07700 900001",
      email: "david@highlandhomecare.co.uk",
      jobTitle: "Care Manager",
      roleType: StaffRoleType.MANAGER,
      employmentType: EmploymentType.FULL_TIME,
      contractHoursPerWeek: "37.5",
      startDate: new Date("2020-06-01"),
      probationEndDate: new Date("2020-09-01"),
      rightToWorkChecked: true,
      status: StaffStatus.ACTIVE,
      createdBy: sarah.id,
      updatedBy: sarah.id,
    },
  });
  await prisma.user.update({ where: { id: david.id }, data: { staffMemberId: davidStaff.id } });

  const fionaStaff = await prisma.staffMember.upsert({
    where: { id: IDS.fionaStaff },
    update: {},
    create: {
      id: IDS.fionaStaff,
      organisationId: IDS.org1,
      firstName: "Fiona",
      lastName: "Campbell",
      dateOfBirth: new Date("1985-07-22"),
      addressLine1: "8 Millburn Road",
      city: "Inverness",
      postcode: "IV2 3JZ",
      phone: "07700 900002",
      email: "fiona@highlandhomecare.co.uk",
      jobTitle: "Senior Care Assistant",
      roleType: StaffRoleType.SENIOR_CARER,
      employmentType: EmploymentType.FULL_TIME,
      contractHoursPerWeek: "37.5",
      startDate: new Date("2021-03-01"),
      probationEndDate: new Date("2021-06-01"),
      rightToWorkChecked: true,
      status: StaffStatus.ACTIVE,
      createdBy: sarah.id,
      updatedBy: sarah.id,
    },
  });
  await prisma.user.update({ where: { id: fiona.id }, data: { staffMemberId: fionaStaff.id } });

  const janetStaff = await prisma.staffMember.upsert({
    where: { id: IDS.janetStaff },
    update: {},
    create: {
      id: IDS.janetStaff,
      organisationId: IDS.org1,
      firstName: "Janet",
      lastName: "Morrison",
      dateOfBirth: new Date("1990-11-08"),
      addressLine1: "14 Longman Road",
      city: "Inverness",
      postcode: "IV1 1RY",
      phone: "07700 900003",
      email: "janet@highlandhomecare.co.uk",
      jobTitle: "Care Assistant",
      roleType: StaffRoleType.CARER,
      employmentType: EmploymentType.FULL_TIME,
      contractHoursPerWeek: "37.5",
      startDate: new Date("2023-01-09"),
      probationEndDate: new Date("2023-04-09"),
      rightToWorkChecked: true,
      status: StaffStatus.ACTIVE,
      createdBy: sarah.id,
      updatedBy: sarah.id,
    },
  });
  await prisma.user.update({ where: { id: janet.id }, data: { staffMemberId: janetStaff.id } });

  const alanStaff = await prisma.staffMember.upsert({
    where: { id: IDS.alanStaff },
    update: {},
    create: {
      id: IDS.alanStaff,
      organisationId: IDS.org1,
      firstName: "Alan",
      lastName: "McGregor",
      dateOfBirth: new Date("1988-04-19"),
      addressLine1: "31 Telford Road",
      city: "Inverness",
      postcode: "IV3 8JP",
      phone: "07700 900004",
      email: "alan@highlandhomecare.co.uk",
      jobTitle: "Care Assistant",
      roleType: StaffRoleType.CARER,
      employmentType: EmploymentType.PART_TIME,
      contractHoursPerWeek: "24",
      startDate: new Date("2022-09-05"),
      probationEndDate: new Date("2022-12-05"),
      rightToWorkChecked: true,
      status: StaffStatus.ACTIVE,
      createdBy: sarah.id,
      updatedBy: sarah.id,
    },
  });
  await prisma.user.update({ where: { id: alan.id }, data: { staffMemberId: alanStaff.id } });

  console.log("✅ Staff members: david, fiona, janet, alan");

  // ── PVG records ────────────────────────────────────────────────────────────
  const pvgData = [
    { staffId: davidStaff.id, num: "PVG2020000001", date: "2020-05-15", renew: "2023-05-15" },
    { staffId: fionaStaff.id, num: "PVG2021000002", date: "2021-02-10", renew: "2024-02-10" },
    { staffId: janetStaff.id, num: "PVG2022000003", date: "2022-12-01", renew: "2025-12-01" },
    { staffId: alanStaff.id, num: "PVG2022000004", date: "2022-08-20", renew: "2025-08-20" },
  ];
  for (const p of pvgData) {
    const exists = await prisma.staffPvgRecord.findFirst({ where: { staffMemberId: p.staffId } });
    if (!exists) {
      await prisma.staffPvgRecord.create({
        data: {
          staffMemberId: p.staffId,
          organisationId: IDS.org1,
          pvgMembershipNumber: p.num,
          pvgSchemeRecordDate: new Date(p.date),
          pvgUpdateService: true,
          disclosureLevel: "ENHANCED",
          renewalDate: new Date(p.renew),
          createdBy: sarah.id,
          updatedBy: sarah.id,
        },
      });
    }
  }
  console.log("✅ PVG records");

  // ── SSSC registrations ─────────────────────────────────────────────────────
  const regData = [
    { staffId: davidStaff.id, num: "SSSC/200001", cat: "Registered Manager (Housing Support)", expiry: "2026-06-30" },
    { staffId: fionaStaff.id, num: "SSSC/200002", cat: "Support Worker (Housing Support)", expiry: "2026-03-31" },
    { staffId: janetStaff.id, num: "SSSC/200003", cat: "Support Worker (Housing Support)", expiry: "2027-01-08" },
    { staffId: alanStaff.id, num: "SSSC/200004", cat: "Support Worker (Housing Support)", expiry: "2026-09-04" },
  ];
  for (const r of regData) {
    const exists = await prisma.staffRegistration.findFirst({ where: { staffMemberId: r.staffId } });
    if (!exists) {
      await prisma.staffRegistration.create({
        data: {
          staffMemberId: r.staffId,
          organisationId: IDS.org1,
          registrationType: "SSSC",
          registrationNumber: r.num,
          registrationCategory: r.cat,
          expiryDate: new Date(r.expiry),
          createdBy: sarah.id,
          updatedBy: sarah.id,
        },
      });
    }
  }
  console.log("✅ SSSC registrations");

  // ── Training records ───────────────────────────────────────────────────────
  const mandatoryTraining: { type: TrainingType; name: string; expMonths: number }[] = [
    { type: TrainingType.FIRE_SAFETY, name: "Fire Safety Awareness", expMonths: 12 },
    { type: TrainingType.MOVING_HANDLING, name: "Moving & Handling (People)", expMonths: 12 },
    { type: TrainingType.MEDICATION_ADMIN, name: "Medication Administration", expMonths: 12 },
    { type: TrainingType.SAFEGUARDING_ADULTS, name: "Adult Support & Protection", expMonths: 36 },
    { type: TrainingType.INFECTION_CONTROL, name: "Infection Prevention & Control", expMonths: 12 },
    { type: TrainingType.FIRST_AID, name: "First Aid at Work", expMonths: 36 },
  ];
  for (const sm of [davidStaff, fionaStaff, janetStaff, alanStaff]) {
    const exists = await prisma.staffTrainingRecord.findFirst({ where: { staffMemberId: sm.id } });
    if (!exists) {
      for (const t of mandatoryTraining) {
        const completionDate = new Date("2025-01-15");
        const expiryDate = new Date(completionDate);
        expiryDate.setMonth(expiryDate.getMonth() + t.expMonths);
        await prisma.staffTrainingRecord.create({
          data: {
            staffMemberId: sm.id,
            organisationId: IDS.org1,
            trainingType: t.type,
            trainingName: t.name,
            trainingProvider: "Highland Care Training Ltd",
            completionDate,
            expiryDate,
            isMandatory: true,
            createdBy: sarah.id,
            updatedBy: sarah.id,
          },
        });
      }
    }
  }
  console.log("✅ Training records");

  // ── Supervision records ────────────────────────────────────────────────────
  const supervisionPairs = [
    { staffId: fionaStaff.id, supervisorId: davidStaff.id, dates: ["2025-10-01", "2026-01-07"] },
    { staffId: janetStaff.id, supervisorId: fionaStaff.id, dates: ["2025-10-15", "2026-01-14"] },
    { staffId: alanStaff.id, supervisorId: fionaStaff.id, dates: ["2025-11-01", "2026-01-21"] },
    { staffId: IDS.craigStaff, supervisorId: fionaStaff.id, dates: ["2025-10-08", "2026-01-10"] },
  ];
  for (const pair of supervisionPairs) {
    const exists = await prisma.staffSupervision.findFirst({ where: { staffMemberId: pair.staffId } });
    if (!exists) {
      for (const date of pair.dates) {
        await prisma.staffSupervision.create({
          data: {
            staffMemberId: pair.staffId,
            organisationId: IDS.org1,
            supervisionDate: new Date(date),
            supervisorId: pair.supervisorId,
            supervisionType: SupervisionType.INDIVIDUAL,
            discussionNotes:
              "Performance reviewed. Service user feedback discussed. Wellbeing check completed. No concerns raised.",
            agreedActions: [
              { action: "Complete medication refresher by end of month", due: "2026-02-28", completed: false },
            ],
            nextSupervisionDate: new Date("2026-04-01"),
            createdBy: sarah.id,
            updatedBy: sarah.id,
          },
        });
      }
    }
  }
  console.log("✅ Supervision records");

  // ── Appraisal records ──────────────────────────────────────────────────────
  const appraisalData = [
    { staffId: fionaStaff.id, appraiserId: davidStaff.id, date: "2025-11-15" },
    { staffId: janetStaff.id, appraiserId: davidStaff.id, date: "2025-11-22" },
    { staffId: alanStaff.id, appraiserId: davidStaff.id, date: "2025-11-29" },
    { staffId: IDS.craigStaff, appraiserId: davidStaff.id, date: "2025-12-06" },
  ];
  for (const ap of appraisalData) {
    const exists = await prisma.staffAppraisal.findFirst({ where: { staffMemberId: ap.staffId } });
    if (!exists) {
      await prisma.staffAppraisal.create({
        data: {
          staffMemberId: ap.staffId,
          organisationId: IDS.org1,
          appraisalDate: new Date(ap.date),
          appraiserId: ap.appraiserId,
          performanceSummary:
            "Performs consistently well. Service users and families respond positively. Demonstrates excellent person-centred values.",
          developmentPlan:
            "Enrol in SVQ Level 3 Health & Social Care by April 2026. Complete dementia awareness training.",
          goals: [
            { goal: "SVQ Level 3 enrolment", target: "2026-04-30" },
            { goal: "Dementia Awareness training", target: "2026-06-30" },
          ],
          competencyRatings: {
            personCentredCare: 4,
            communicationSkills: 4,
            safeguarding: 5,
            medicationManagement: 4,
            teamworking: 4,
          },
          nextAppraisalDate: new Date("2026-11-01"),
          createdBy: sarah.id,
          updatedBy: sarah.id,
        },
      });
    }
  }
  console.log("✅ Appraisal records");

  // ── Service users ──────────────────────────────────────────────────────────
  await prisma.serviceUser.upsert({
    where: { id: IDS.agnesRobertson },
    update: {},
    create: {
      id: IDS.agnesRobertson,
      organisationId: IDS.org1,
      firstName: "Agnes",
      lastName: "Robertson",
      dateOfBirth: new Date("1938-02-14"),
      chiNumber: "1402380001",
      addressLine1: "7 Ness Walk",
      city: "Inverness",
      postcode: "IV3 5NE",
      phonePrimary: "01463 000002",
      gpName: "Dr. MacInnes",
      gpPractice: "Inverness Medical Centre",
      gpPhone: "01463 000010",
      communicationNeeds:
        "Some word-finding difficulties due to dementia. Use simple sentences and allow extra time for response.",
      culturalReligiousNeeds: "Church of Scotland. Values Sunday worship. Hymns provide comfort.",
      dietaryRequirements: "Soft diet required due to swallowing difficulties. No shellfish — allergy.",
      status: "ACTIVE",
      createdBy: sarah.id,
      updatedBy: sarah.id,
    },
  });

  await prisma.serviceUser.upsert({
    where: { id: IDS.donaldMacKay },
    update: {},
    create: {
      id: IDS.donaldMacKay,
      organisationId: IDS.org1,
      firstName: "Donald",
      lastName: "MacKay",
      dateOfBirth: new Date("1950-08-30"),
      chiNumber: "3008500001",
      addressLine1: "19 Haugh Road",
      city: "Inverness",
      postcode: "IV2 4AA",
      phonePrimary: "01463 000003",
      gpName: "Dr. Fraser",
      gpPractice: "Hilton Medical Practice",
      gpPhone: "01463 000011",
      communicationNeeds:
        "Mild dysphasia following stroke. Takes time to find words. Patient and supportive approach needed.",
      dietaryRequirements: "Diabetic diet. Low sugar. Regular meal times important.",
      status: "ACTIVE",
      createdBy: sarah.id,
      updatedBy: sarah.id,
    },
  });

  await prisma.serviceUser.upsert({
    where: { id: IDS.eileenBurns },
    update: {},
    create: {
      id: IDS.eileenBurns,
      organisationId: IDS.org1,
      firstName: "Eileen",
      lastName: "Burns",
      dateOfBirth: new Date("1943-05-11"),
      chiNumber: "1105430001",
      addressLine1: "33 Culduthel Road",
      city: "Inverness",
      postcode: "IV2 4QF",
      phonePrimary: "01463 000004",
      gpName: "Dr. Urquhart",
      gpPractice: "Crown Medical Centre",
      gpPhone: "01463 000012",
      communicationNeeds: "Hearing aid user. Speak clearly and face her when talking.",
      dietaryRequirements: "Soft/moist foods preferred. Good fluid intake essential — encourage 6-8 glasses per day.",
      status: "ACTIVE",
      createdBy: sarah.id,
      updatedBy: sarah.id,
    },
  });

  await prisma.serviceUser.upsert({
    where: { id: IDS.williamStewart },
    update: {},
    create: {
      id: IDS.williamStewart,
      organisationId: IDS.org1,
      firstName: "William",
      lastName: "Stewart",
      dateOfBirth: new Date("1935-11-03"),
      chiNumber: "0311350001",
      addressLine1: "56 Old Edinburgh Road",
      city: "Inverness",
      postcode: "IV2 3HH",
      phonePrimary: "01463 000005",
      gpName: "Dr. Morrison",
      gpPractice: "Inverness Medical Centre",
      gpPhone: "01463 000010",
      communicationNeeds:
        "Generally good communication. Can become confused in evenings. Calm reassurance required.",
      advanceCarePlan:
        "William has expressed wishes for comfort-focused care at home. DNR in place. Wishes to remain at home. Family fully informed.",
      dietaryRequirements: "Appetite poor. Small frequent meals. Fortified drinks between meals.",
      status: "ACTIVE",
      createdBy: sarah.id,
      updatedBy: sarah.id,
    },
  });

  await prisma.serviceUser.upsert({
    where: { id: IDS.jeanMacPherson },
    update: {},
    create: {
      id: IDS.jeanMacPherson,
      organisationId: IDS.org1,
      firstName: "Jean",
      lastName: "MacPherson",
      dateOfBirth: new Date("1960-09-17"),
      chiNumber: "1709600001",
      addressLine1: "4 Ballifeary Road",
      city: "Inverness",
      postcode: "IV3 5PE",
      phonePrimary: "01463 000006",
      gpName: "Dr. Grant",
      gpPractice: "Hilton Medical Practice",
      gpPhone: "01463 000011",
      communicationNeeds: "Good communication. Prefers written information to be provided as a backup.",
      dietaryRequirements: "Vegetarian. Lactose intolerant.",
      status: "ACTIVE",
      createdBy: sarah.id,
      updatedBy: sarah.id,
    },
  });

  console.log("✅ Service users: agnes, donald, eileen, william, jean");

  // ── Emergency contacts ─────────────────────────────────────────────────────
  const contactData = [
    { serviceUserId: IDS.agnesRobertson, contactName: "Margaret Robertson", relationship: "Daughter", phone: "07700 800001" },
    { serviceUserId: IDS.donaldMacKay, contactName: "Sandra MacKay", relationship: "Wife", phone: "07700 800002" },
    { serviceUserId: IDS.eileenBurns, contactName: "Peter Burns", relationship: "Son", phone: "07700 800003" },
    { serviceUserId: IDS.williamStewart, contactName: "Catherine Stewart", relationship: "Daughter", phone: "07700 800004" },
    { serviceUserId: IDS.jeanMacPherson, contactName: "Robert MacPherson", relationship: "Husband", phone: "07700 800005" },
    { serviceUserId: IDS.maryMacDonald, contactName: "Angus MacDonald", relationship: "Son", phone: "07700 800006" },
  ];
  for (const c of contactData) {
    const exists = await prisma.serviceUserContact.findFirst({ where: { serviceUserId: c.serviceUserId } });
    if (!exists) {
      await prisma.serviceUserContact.create({
        data: {
          serviceUserId: c.serviceUserId,
          organisationId: IDS.org1,
          contactName: c.contactName,
          relationship: c.relationship,
          phone: c.phone,
          isNextOfKin: true,
          isEmergencyContact: true,
          createdBy: sarah.id,
          updatedBy: sarah.id,
        },
      });
    }
  }
  console.log("✅ Emergency contacts");

  // ── Personal plans ─────────────────────────────────────────────────────────
  const planData = [
    {
      serviceUserId: IDS.agnesRobertson,
      healthNeeds:
        "Alzheimer's disease (moderate stage). Requires prompting and assistance with all personal care. Risk of wandering. Falls risk.",
      personalCareRequirements:
        "Full assistance with washing, dressing and grooming. Incontinence management. Oral hygiene.",
      wishesAndPreferences:
        "Agnes enjoys looking at family photographs. Responds well to music from the 1950s and 60s. Prefers female carers.",
      goalsAndOutcomes:
        "Maintain dignity and comfort at home. Reduce anxiety episodes. Enable continued family engagement.",
    },
    {
      serviceUserId: IDS.donaldMacKay,
      healthNeeds:
        "CVA (left hemisphere) June 2024. Right-sided weakness. Mild aphasia. Hypertension, Type 2 diabetes. Physiotherapy ongoing.",
      personalCareRequirements:
        "Assistance with washing and dressing. Stand-by assistance for transfers using walking frame. Medication administration.",
      wishesAndPreferences:
        "Donald values independence. Wants to do what he can for himself. Values being kept informed of all decisions.",
      goalsAndOutcomes:
        "Maximise independence. Support rehabilitation goals. Maintain cardiovascular health.",
    },
    {
      serviceUserId: IDS.eileenBurns,
      healthNeeds:
        "COPD (moderate). Type 2 diabetes. Osteoporosis. Mobility reduced — uses rollator frame. Hearing impairment.",
      personalCareRequirements:
        "Assistance with washing and dressing. Nebuliser management morning and evening. Blood glucose monitoring.",
      wishesAndPreferences:
        "Eileen is a keen reader and enjoys crossword puzzles. Prefers morning visits before 10am. Values her privacy.",
      goalsAndOutcomes:
        "Maintain respiratory function. Monitor blood glucose. Prevent falls and hospital admissions.",
    },
    {
      serviceUserId: IDS.williamStewart,
      healthNeeds:
        "Terminal cancer (prostate, metastatic). Palliative care input from Macmillan team. Pain managed with regular analgesia.",
      personalCareRequirements:
        "Full assistance with personal care. Comfort positioning. Monitoring pain and symptom control. Pressure area care.",
      wishesAndPreferences:
        "William wants to remain at home. Values his faith — RC priest visits weekly. Wishes to see family regularly.",
      goalsAndOutcomes:
        "Comfort and dignity at end of life. Pain and symptom management. Family support and communication.",
    },
    {
      serviceUserId: IDS.jeanMacPherson,
      healthNeeds:
        "MS (relapsing-remitting). Fatigue significant. Mobility variable. Good cognition. Manages own medications.",
      personalCareRequirements:
        "Assistance with housework and meal preparation. Personal care during relapses. Medication prompting.",
      wishesAndPreferences:
        "Jean is active and values her independence. Involved in community groups. Technology-savvy.",
      goalsAndOutcomes:
        "Maintain independence and quality of life. Support during relapses. Prevent secondary complications.",
    },
  ];
  for (const plan of planData) {
    const exists = await prisma.personalPlan.findFirst({
      where: { serviceUserId: plan.serviceUserId, status: PersonalPlanStatus.ACTIVE },
    });
    if (!exists) {
      await prisma.personalPlan.create({
        data: {
          serviceUserId: plan.serviceUserId,
          organisationId: IDS.org1,
          planVersion: 1,
          initialAssessment:
            "Initial assessment completed. Service user and family/representative consulted. Care package agreed.",
          healthNeeds: plan.healthNeeds,
          personalCareRequirements: plan.personalCareRequirements,
          wishesAndPreferences: plan.wishesAndPreferences,
          goalsAndOutcomes: plan.goalsAndOutcomes,
          howNeedsWillBeMet:
            "Regular care visits by trained care staff. Coordination with healthcare professionals. Family involvement.",
          createdDate: new Date("2025-04-01"),
          reviewDate: new Date("2025-10-01"),
          nextReviewDate: new Date("2026-04-01"),
          consultedWithServiceUser: true,
          status: PersonalPlanStatus.ACTIVE,
          approvedBy: david.id,
          approvedAt: new Date("2025-04-03T10:00:00Z"),
          createdBy: fiona.id,
          updatedBy: sarah.id,
        },
      });
    }
  }
  console.log("✅ Personal plans");

  // ── Risk assessments ───────────────────────────────────────────────────────
  const riskData: {
    serviceUserId: string;
    type: RiskAssessmentType;
    level: RiskLevel;
    detail: string;
    controls: string;
  }[] = [
    {
      serviceUserId: IDS.agnesRobertson,
      type: RiskAssessmentType.FALLS,
      level: RiskLevel.HIGH,
      detail: "History of falls x2 in past 6 months. Unsteady gait. Wanders at night.",
      controls: "Non-slip footwear at all times. Call bell within reach. Chair riser. Night sensor mat.",
    },
    {
      serviceUserId: IDS.agnesRobertson,
      type: RiskAssessmentType.MOVING_HANDLING,
      level: RiskLevel.MEDIUM,
      detail: "Requires assistance with all transfers. Compliance variable due to dementia.",
      controls: "Use Sara Steady for all transfers. Two-person assist for bathing. Slide sheet for bed repositioning.",
    },
    {
      serviceUserId: IDS.donaldMacKay,
      type: RiskAssessmentType.FALLS,
      level: RiskLevel.MEDIUM,
      detail: "Right-sided weakness post-stroke. Uses walking frame. Risk increases with fatigue.",
      controls: "Walking frame always within reach. Supervise transfers. Report any changes in mobility.",
    },
    {
      serviceUserId: IDS.donaldMacKay,
      type: RiskAssessmentType.NUTRITION_HYDRATION,
      level: RiskLevel.MEDIUM,
      detail: "Diabetic. Blood glucose fluctuations. Risk of hypoglycaemia.",
      controls:
        "Administer insulin as prescribed. Monitor glucose pre-meals. Keep glucose tablets accessible. Report readings <4 or >12.",
    },
    {
      serviceUserId: IDS.eileenBurns,
      type: RiskAssessmentType.INFECTION_CONTROL,
      level: RiskLevel.MEDIUM,
      detail: "COPD — increased susceptibility to respiratory infections.",
      controls: "Hand hygiene for all carers. PPE for personal care. Report cough, fever or SOB immediately.",
    },
    {
      serviceUserId: IDS.williamStewart,
      type: RiskAssessmentType.SKIN_INTEGRITY,
      level: RiskLevel.HIGH,
      detail: "Cachexia. Limited mobility. High Waterlow score (24). Existing grade 2 sacral pressure area.",
      controls:
        "Reposition 2-hourly minimum. Pressure relieving cushion and mattress in use. Skin check every visit.",
    },
    {
      serviceUserId: IDS.jeanMacPherson,
      type: RiskAssessmentType.LONE_WORKING,
      level: RiskLevel.LOW,
      detail: "Generally cooperative. No behavioural risks. Husband usually present.",
      controls: "Standard lone working policy applies. Check-in procedure followed.",
    },
  ];
  for (const ra of riskData) {
    const exists = await prisma.riskAssessment.findFirst({
      where: { serviceUserId: ra.serviceUserId, assessmentType: ra.type, status: "ACTIVE" },
    });
    if (!exists) {
      await prisma.riskAssessment.create({
        data: {
          serviceUserId: ra.serviceUserId,
          organisationId: IDS.org1,
          assessmentType: ra.type,
          riskLevel: ra.level,
          assessmentDetail: ra.detail,
          controlMeasures: ra.controls,
          assessedBy: fiona.id,
          assessmentDate: new Date("2025-04-01"),
          nextReviewDate: new Date("2026-04-01"),
          status: "ACTIVE",
          createdBy: fiona.id,
          updatedBy: fiona.id,
        },
      });
    }
  }
  console.log("✅ Risk assessments");

  // ── Consent records ────────────────────────────────────────────────────────
  const allClientIds = [
    IDS.agnesRobertson,
    IDS.donaldMacKay,
    IDS.eileenBurns,
    IDS.williamStewart,
    IDS.jeanMacPherson,
    IDS.maryMacDonald,
  ];
  for (const serviceUserId of allClientIds) {
    for (const consentType of [ConsentType.CARE_AND_SUPPORT, ConsentType.MEDICATION, ConsentType.INFORMATION_SHARING]) {
      const exists = await prisma.consentRecord.findFirst({ where: { serviceUserId, consentType } });
      if (!exists) {
        await prisma.consentRecord.create({
          data: {
            serviceUserId,
            organisationId: IDS.org1,
            consentType,
            consentGiven: true,
            capacityAssessed: true,
            capacityOutcome: "Has capacity to consent",
            signedBy: "Service user / representative",
            consentDate: new Date("2025-04-01"),
            reviewDate: new Date("2026-04-01"),
            createdBy: sarah.id,
            updatedBy: sarah.id,
          },
        });
      }
    }
  }
  console.log("✅ Consent records");

  // ── Health records ─────────────────────────────────────────────────────────
  const healthData: {
    serviceUserId: string;
    recordType: HealthRecordType;
    title: string;
    description: string;
    severity?: AllergySeverity;
  }[] = [
    {
      serviceUserId: IDS.agnesRobertson,
      recordType: HealthRecordType.DIAGNOSIS,
      title: "Alzheimer's Disease",
      description: "Diagnosed 2022. Moderate stage. Under care of Memory Clinic, Raigmore Hospital.",
    },
    {
      serviceUserId: IDS.agnesRobertson,
      recordType: HealthRecordType.ALLERGY,
      title: "Shellfish allergy",
      description: "Anaphylactic reaction documented 2019. Epipen prescribed and held by family.",
      severity: AllergySeverity.LIFE_THREATENING,
    },
    {
      serviceUserId: IDS.donaldMacKay,
      recordType: HealthRecordType.HOSPITAL_DISCHARGE,
      title: "Stroke (CVA) — Discharge from Raigmore Hospital",
      description:
        "Admitted June 2024 following left hemisphere CVA. Discharged August 2024 with physiotherapy and OT input.",
    },
    {
      serviceUserId: IDS.donaldMacKay,
      recordType: HealthRecordType.DIAGNOSIS,
      title: "Type 2 Diabetes",
      description: "Diagnosed 2018. Insulin-dependent since 2022. HbA1c last checked Nov 2025: 58 mmol/mol.",
    },
    {
      serviceUserId: IDS.eileenBurns,
      recordType: HealthRecordType.DIAGNOSIS,
      title: "COPD — Moderate",
      description: "FEV1 55% predicted. On tiotropium inhaler and salbutamol PRN. Pulmonary rehab completed 2024.",
    },
    {
      serviceUserId: IDS.williamStewart,
      recordType: HealthRecordType.DIAGNOSIS,
      title: "Metastatic Prostate Cancer",
      description:
        "Diagnosed 2023. Bone metastases confirmed. Under Macmillan palliative care team. Prognosis poor.",
    },
    {
      serviceUserId: IDS.jeanMacPherson,
      recordType: HealthRecordType.DIAGNOSIS,
      title: "Multiple Sclerosis (RRMS)",
      description:
        "Diagnosed 2015. Currently on disease-modifying therapy. Last relapse September 2025 — good recovery.",
    },
  ];
  for (const hr of healthData) {
    const exists = await prisma.healthRecord.findFirst({
      where: { serviceUserId: hr.serviceUserId, title: hr.title },
    });
    if (!exists) {
      await prisma.healthRecord.create({
        data: {
          serviceUserId: hr.serviceUserId,
          organisationId: IDS.org1,
          recordType: hr.recordType,
          title: hr.title,
          description: hr.description,
          severity: hr.severity,
          recordedDate: new Date("2025-04-01"),
          createdBy: sarah.id,
          updatedBy: sarah.id,
        },
      });
    }
  }
  console.log("✅ Health records");

  // ── Medications ────────────────────────────────────────────────────────────
  const medData: {
    serviceUserId: string;
    name: string;
    form: MedicationForm;
    dose: string;
    frequency: string;
    prescriber: string;
    pharmacy: string;
    isPrn?: boolean;
    prnReason?: string;
    prnMaxDose?: string;
    isControlledDrug?: boolean;
    specialInstructions?: string;
  }[] = [
    {
      serviceUserId: IDS.agnesRobertson,
      name: "Donepezil 10mg",
      form: MedicationForm.TABLET,
      dose: "10mg",
      frequency: "Once daily at bedtime",
      prescriber: "Dr. MacInnes",
      pharmacy: "Boots, Inverness",
    },
    {
      serviceUserId: IDS.agnesRobertson,
      name: "Lorazepam 0.5mg",
      form: MedicationForm.TABLET,
      dose: "0.5mg",
      frequency: "PRN — max 1 per 24 hours if severe agitation",
      prescriber: "Dr. MacInnes",
      pharmacy: "Boots, Inverness",
      isPrn: true,
      prnReason: "Severe agitation/distress",
      prnMaxDose: "0.5mg in 24 hours",
    },
    {
      serviceUserId: IDS.donaldMacKay,
      name: "Metformin 500mg",
      form: MedicationForm.TABLET,
      dose: "500mg",
      frequency: "Twice daily with meals",
      prescriber: "Dr. Fraser",
      pharmacy: "Lloyds Pharmacy, Inverness",
    },
    {
      serviceUserId: IDS.donaldMacKay,
      name: "Ramipril 5mg",
      form: MedicationForm.TABLET,
      dose: "5mg",
      frequency: "Once daily in the morning",
      prescriber: "Dr. Fraser",
      pharmacy: "Lloyds Pharmacy, Inverness",
    },
    {
      serviceUserId: IDS.eileenBurns,
      name: "Tiotropium Inhaler (Spiriva) 18mcg",
      form: MedicationForm.INHALER,
      dose: "18mcg",
      frequency: "Once daily in the morning",
      prescriber: "Dr. Urquhart",
      pharmacy: "Rowlands Pharmacy",
    },
    {
      serviceUserId: IDS.williamStewart,
      name: "MST Continus (Morphine Sulfate) 30mg",
      form: MedicationForm.TABLET,
      dose: "30mg",
      frequency: "Twice daily (12-hourly)",
      prescriber: "Dr. Morrison",
      pharmacy: "Inverness Hospice Pharmacy",
      isControlledDrug: true,
      specialInstructions:
        "CONTROLLED DRUG — Double-check required. Document administration times precisely. Report inadequate pain control immediately.",
    },
    {
      serviceUserId: IDS.jeanMacPherson,
      name: "Dimethyl Fumarate (Tecfidera) 240mg",
      form: MedicationForm.TABLET,
      dose: "240mg",
      frequency: "Twice daily with food",
      prescriber: "Dr. Grant",
      pharmacy: "Highland Pharmacy Hub",
      specialInstructions: "Self-administered. Carer to prompt and document.",
    },
  ];
  for (const med of medData) {
    const exists = await prisma.serviceUserMedication.findFirst({
      where: { serviceUserId: med.serviceUserId, medicationName: med.name, status: MedicationStatus.ACTIVE },
    });
    if (!exists) {
      await prisma.serviceUserMedication.create({
        data: {
          serviceUserId: med.serviceUserId,
          organisationId: IDS.org1,
          medicationName: med.name,
          form: med.form,
          dose: med.dose,
          frequency: med.frequency,
          prescriber: med.prescriber,
          pharmacy: med.pharmacy,
          startDate: new Date("2025-04-01"),
          isPrn: med.isPrn ?? false,
          prnReason: med.prnReason,
          prnMaxDose: med.prnMaxDose,
          isControlledDrug: med.isControlledDrug ?? false,
          specialInstructions: med.specialInstructions,
          status: MedicationStatus.ACTIVE,
          createdBy: sarah.id,
          updatedBy: sarah.id,
        },
      });
    }
  }
  console.log("✅ Medications");

  // ── Care packages ──────────────────────────────────────────────────────────
  const agnesPackage = await prisma.carePackage.upsert({
    where: { id: IDS.agnesPackage },
    update: {},
    create: {
      id: IDS.agnesPackage,
      organisationId: IDS.org1,
      serviceUserId: IDS.agnesRobertson,
      funderId: IDS.highlandCouncil,
      rateCardId: IDS.councilRateCard,
      packageName: "Agnes Robertson - Council Care",
      funderReference: "HC/SU/2025/002",
      billingTimeBasis: BillingTimeBasis.SCHEDULED,
      roundingIncrementMinutes: 15,
      minimumBillableMinutes: 15,
      carersRequired: 2,
      mileageBillable: false,
      startDate: new Date("2025-04-01"),
      status: "ACTIVE",
      createdBy: sarah.id,
      updatedBy: sarah.id,
    },
  });

  const donaldPackage = await prisma.carePackage.upsert({
    where: { id: IDS.donaldPackage },
    update: {},
    create: {
      id: IDS.donaldPackage,
      organisationId: IDS.org1,
      serviceUserId: IDS.donaldMacKay,
      funderId: IDS.highlandCouncil,
      rateCardId: IDS.councilRateCard,
      packageName: "Donald MacKay - Council Care",
      funderReference: "HC/SU/2025/003",
      billingTimeBasis: BillingTimeBasis.SCHEDULED,
      roundingIncrementMinutes: 15,
      minimumBillableMinutes: 15,
      carersRequired: 1,
      mileageBillable: false,
      startDate: new Date("2024-09-01"),
      status: "ACTIVE",
      createdBy: sarah.id,
      updatedBy: sarah.id,
    },
  });

  const eileenPackage = await prisma.carePackage.upsert({
    where: { id: IDS.eileenPackage },
    update: {},
    create: {
      id: IDS.eileenPackage,
      organisationId: IDS.org1,
      serviceUserId: IDS.eileenBurns,
      funderId: IDS.highlandCouncil,
      rateCardId: IDS.councilRateCard,
      packageName: "Eileen Burns - Council Care",
      funderReference: "HC/SU/2025/004",
      billingTimeBasis: BillingTimeBasis.SCHEDULED,
      roundingIncrementMinutes: 15,
      minimumBillableMinutes: 15,
      carersRequired: 1,
      mileageBillable: false,
      startDate: new Date("2025-01-15"),
      status: "ACTIVE",
      createdBy: sarah.id,
      updatedBy: sarah.id,
    },
  });

  const williamPackage = await prisma.carePackage.upsert({
    where: { id: IDS.williamPackage },
    update: {},
    create: {
      id: IDS.williamPackage,
      organisationId: IDS.org1,
      serviceUserId: IDS.williamStewart,
      funderId: IDS.privateFunder,
      rateCardId: IDS.privateRateCard,
      packageName: "William Stewart - Private Care",
      billingTimeBasis: BillingTimeBasis.ACTUAL,
      roundingIncrementMinutes: 15,
      minimumBillableMinutes: 30,
      carersRequired: 1,
      mileageBillable: false,
      startDate: new Date("2024-12-01"),
      status: "ACTIVE",
      createdBy: sarah.id,
      updatedBy: sarah.id,
    },
  });

  const jeanPackage = await prisma.carePackage.upsert({
    where: { id: IDS.jeanPackage },
    update: {},
    create: {
      id: IDS.jeanPackage,
      organisationId: IDS.org1,
      serviceUserId: IDS.jeanMacPherson,
      funderId: IDS.privateFunder,
      rateCardId: IDS.privateRateCard,
      packageName: "Jean MacPherson - Private Care",
      billingTimeBasis: BillingTimeBasis.ACTUAL,
      roundingIncrementMinutes: 15,
      minimumBillableMinutes: 15,
      carersRequired: 1,
      mileageBillable: false,
      startDate: new Date("2025-06-01"),
      status: "ACTIVE",
      createdBy: sarah.id,
      updatedBy: sarah.id,
    },
  });

  console.log("✅ Care packages: agnes, donald, eileen, william, jean");

  // ── Visit schedules ────────────────────────────────────────────────────────
  type ScheduleSlot = {
    packageId: string;
    days: DayOfWeek[];
    start: string;
    end: string;
    carers: number;
  };

  const scheduleSlots: ScheduleSlot[] = [
    // Agnes — double-up, 3x daily, 7 days
    {
      packageId: agnesPackage.id,
      days: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
      start: "07:30",
      end: "08:30",
      carers: 2,
    },
    {
      packageId: agnesPackage.id,
      days: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
      start: "12:00",
      end: "12:45",
      carers: 2,
    },
    {
      packageId: agnesPackage.id,
      days: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
      start: "17:30",
      end: "18:30",
      carers: 2,
    },
    // Donald — once daily morning, Mon-Fri
    {
      packageId: donaldPackage.id,
      days: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
      start: "08:00",
      end: "09:00",
      carers: 1,
    },
    // Eileen — twice daily, Mon-Sat
    {
      packageId: eileenPackage.id,
      days: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
      start: "08:00",
      end: "09:00",
      carers: 1,
    },
    {
      packageId: eileenPackage.id,
      days: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
      start: "18:00",
      end: "18:45",
      carers: 1,
    },
    // William — twice daily, 7 days
    {
      packageId: williamPackage.id,
      days: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
      start: "07:00",
      end: "08:00",
      carers: 1,
    },
    {
      packageId: williamPackage.id,
      days: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
      start: "20:00",
      end: "21:00",
      carers: 1,
    },
    // Jean — Mon/Wed/Fri morning
    { packageId: jeanPackage.id, days: ["MONDAY", "WEDNESDAY", "FRIDAY"], start: "09:00", end: "10:00", carers: 1 },
    // Mary (existing package) — weekdays morning
    {
      packageId: IDS.maryPackage,
      days: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
      start: "08:30",
      end: "09:30",
      carers: 1,
    },
  ];

  for (const slot of scheduleSlots) {
    for (const day of slot.days) {
      const exists = await prisma.visitSchedule.findFirst({
        where: { carePackageId: slot.packageId, dayOfWeek: day, startTime: slot.start },
      });
      if (!exists) {
        await prisma.visitSchedule.create({
          data: {
            organisationId: IDS.org1,
            carePackageId: slot.packageId,
            dayOfWeek: day,
            startTime: slot.start,
            endTime: slot.end,
            carersRequired: slot.carers,
            effectiveFrom: new Date("2025-04-01"),
            isActive: true,
            createdBy: sarah.id,
            updatedBy: sarah.id,
          },
        });
      }
    }
  }
  console.log("✅ Visit schedules");

  // ── Care visit records + billable visits (January 2026) ────────────────────
  const existingVisitCount = await prisma.careVisitRecord.count({ where: { organisationId: IDS.org1 } });

  if (existingVisitCount === 0) {
    type VisitTemplate = {
      serviceUserId: string;
      carePackageId: string;
      startHour: number;
      startMin: number;
      durationMins: number;
      days: number[]; // 0=Sun…6=Sat
      staffId: string;
      ratePerHour: string;
    };

    const visitTemplates: VisitTemplate[] = [
      // Mary — weekdays, morning
      {
        serviceUserId: IDS.maryMacDonald,
        carePackageId: IDS.maryPackage,
        startHour: 8,
        startMin: 30,
        durationMins: 60,
        days: [1, 2, 3, 4, 5],
        staffId: IDS.craigStaff,
        ratePerHour: "22.00",
      },
      // Agnes — morning, all week
      {
        serviceUserId: IDS.agnesRobertson,
        carePackageId: agnesPackage.id,
        startHour: 7,
        startMin: 30,
        durationMins: 60,
        days: [0, 1, 2, 3, 4, 5, 6],
        staffId: IDS.craigStaff,
        ratePerHour: "22.00",
      },
      // Agnes — lunch, all week
      {
        serviceUserId: IDS.agnesRobertson,
        carePackageId: agnesPackage.id,
        startHour: 12,
        startMin: 0,
        durationMins: 45,
        days: [0, 1, 2, 3, 4, 5, 6],
        staffId: IDS.janetStaff,
        ratePerHour: "22.00",
      },
      // Agnes — evening, all week
      {
        serviceUserId: IDS.agnesRobertson,
        carePackageId: agnesPackage.id,
        startHour: 17,
        startMin: 30,
        durationMins: 60,
        days: [0, 1, 2, 3, 4, 5, 6],
        staffId: IDS.alanStaff,
        ratePerHour: "22.00",
      },
      // Donald — weekdays, morning
      {
        serviceUserId: IDS.donaldMacKay,
        carePackageId: donaldPackage.id,
        startHour: 8,
        startMin: 0,
        durationMins: 60,
        days: [1, 2, 3, 4, 5],
        staffId: IDS.janetStaff,
        ratePerHour: "22.00",
      },
      // Eileen — Mon-Sat, morning
      {
        serviceUserId: IDS.eileenBurns,
        carePackageId: eileenPackage.id,
        startHour: 8,
        startMin: 0,
        durationMins: 60,
        days: [1, 2, 3, 4, 5, 6],
        staffId: IDS.alanStaff,
        ratePerHour: "22.00",
      },
      // Eileen — Mon-Sat, evening
      {
        serviceUserId: IDS.eileenBurns,
        carePackageId: eileenPackage.id,
        startHour: 18,
        startMin: 0,
        durationMins: 45,
        days: [1, 2, 3, 4, 5, 6],
        staffId: IDS.craigStaff,
        ratePerHour: "22.00",
      },
      // William — morning, all week (private daytime rate)
      {
        serviceUserId: IDS.williamStewart,
        carePackageId: williamPackage.id,
        startHour: 7,
        startMin: 0,
        durationMins: 60,
        days: [0, 1, 2, 3, 4, 5, 6],
        staffId: IDS.craigStaff,
        ratePerHour: "26.00",
      },
      // William — evening, all week (private evening rate)
      {
        serviceUserId: IDS.williamStewart,
        carePackageId: williamPackage.id,
        startHour: 20,
        startMin: 0,
        durationMins: 60,
        days: [0, 1, 2, 3, 4, 5, 6],
        staffId: IDS.janetStaff,
        ratePerHour: "30.00",
      },
      // Jean — Mon/Wed/Fri, morning (private daytime rate)
      {
        serviceUserId: IDS.jeanMacPherson,
        carePackageId: jeanPackage.id,
        startHour: 9,
        startMin: 0,
        durationMins: 60,
        days: [1, 3, 5],
        staffId: IDS.alanStaff,
        ratePerHour: "26.00",
      },
    ];

    let visitCount = 0;
    // Generate January 2026 (days 1–31)
    for (let d = 1; d <= 31; d++) {
      const dateStr = `2026-01-${String(d).padStart(2, "0")}`;
      const visitDate = new Date(dateStr);
      const dow = visitDate.getDay();

      for (const tpl of visitTemplates) {
        if (!tpl.days.includes(dow)) continue;

        const scheduledStart = new Date(visitDate);
        scheduledStart.setHours(tpl.startHour, tpl.startMin, 0, 0);
        const scheduledEnd = new Date(scheduledStart.getTime() + tpl.durationMins * 60_000);

        // Slight real-world variance (±3 min start, ±5 min end)
        const offsetStart = (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 4) * 60_000;
        const offsetEnd = (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 6) * 60_000;
        const actualStart = new Date(scheduledStart.getTime() + offsetStart);
        const actualEnd = new Date(scheduledEnd.getTime() + offsetEnd);

        const dayType: DayType = dow === 6 ? "SATURDAY" : dow === 0 ? "SUNDAY" : "WEEKDAY";
        const rate = parseFloat(tpl.ratePerHour);
        const lineTotal = (rate * tpl.durationMins) / 60;

        const cvr = await prisma.careVisitRecord.create({
          data: {
            serviceUserId: tpl.serviceUserId,
            organisationId: IDS.org1,
            visitDate,
            scheduledStart,
            scheduledEnd,
            actualStart,
            actualEnd,
            staffMemberId: tpl.staffId,
            carePackageId: tpl.carePackageId,
            tasksCompleted: { personalCare: true, medications: true, wellbeingCheck: true },
            wellbeingObservations: "Service user comfortable and in good spirits.",
            notes: "Visit completed as planned.",
            signedOffBy: david.id,
            createdBy: tpl.staffId,
            updatedBy: david.id,
          },
        });

        await prisma.billableVisit.create({
          data: {
            organisationId: IDS.org1,
            careVisitRecordId: cvr.id,
            carePackageId: tpl.carePackageId,
            serviceUserId: tpl.serviceUserId,
            visitDate,
            scheduledStart,
            scheduledEnd,
            actualStart,
            actualEnd,
            billingStart: scheduledStart,
            billingEnd: scheduledEnd,
            billingDurationMinutes: tpl.durationMins,
            carersRequired: 1,
            dayType,
            appliedRatePerHour: tpl.ratePerHour,
            lineTotal: lineTotal.toFixed(2),
            visitTotal: lineTotal.toFixed(2),
            status: BillableVisitStatus.APPROVED,
            approvedById: david.id,
            approvedAt: new Date("2026-02-03T09:00:00Z"),
            createdBy: david.id,
            updatedBy: david.id,
          },
        });

        visitCount++;
      }
    }
    console.log(`✅ Care visit records + billable visits: ${visitCount} (January 2026)`);
  } else {
    console.log("⏭  Care visit records already exist — skipping");
  }

  // ── Invoice — January 2026, Highland Council ───────────────────────────────
  const existingInvoice = await prisma.invoice.findFirst({
    where: { organisationId: IDS.org1, invoiceNumber: "HHC-2026-0001" },
  });

  if (!existingInvoice) {
    const councilVisits = await prisma.billableVisit.findMany({
      where: {
        organisationId: IDS.org1,
        status: BillableVisitStatus.APPROVED,
        visitDate: { gte: new Date("2026-01-01"), lte: new Date("2026-01-31") },
        carePackage: { funderId: IDS.highlandCouncil },
      },
    });

    const subtotal = councilVisits.reduce((sum, v) => sum + Number(v.visitTotal), 0);

    const invoice = await prisma.invoice.create({
      data: {
        organisationId: IDS.org1,
        invoiceNumber: "HHC-2026-0001",
        funderId: IDS.highlandCouncil,
        invoiceDate: new Date("2026-02-01"),
        dueDate: new Date("2026-03-03"),
        periodStart: new Date("2026-01-01"),
        periodEnd: new Date("2026-01-31"),
        subtotal: subtotal.toFixed(2),
        vatRate: "0",
        vatAmount: "0",
        total: subtotal.toFixed(2),
        status: InvoiceStatus.SENT,
        sentDate: new Date("2026-02-03"),
        notes: "January 2026 care services — Highland Home Care Ltd",
        createdBy: sarah.id,
        updatedBy: sarah.id,
      },
    });

    // Group by care package → invoice lines
    const groups = new Map<string, { total: number; visits: number; hours: number; serviceUserId: string }>();
    for (const v of councilVisits) {
      if (!groups.has(v.carePackageId)) {
        groups.set(v.carePackageId, { total: 0, visits: 0, hours: 0, serviceUserId: v.serviceUserId });
      }
      const g = groups.get(v.carePackageId)!;
      g.total += Number(v.visitTotal);
      g.visits += 1;
      g.hours += v.billingDurationMinutes / 60;
    }

    for (const [pkgId, data] of Array.from(groups.entries())) {
      const line = await prisma.invoiceLine.create({
        data: {
          invoiceId: invoice.id,
          serviceUserId: data.serviceUserId,
          carePackageId: pkgId,
          totalVisits: data.visits,
          totalHours: data.hours.toFixed(2),
          totalMileage: "0",
          careTotal: data.total.toFixed(2),
          mileageTotal: "0",
          lineTotal: data.total.toFixed(2),
        },
      });
      await prisma.billableVisit.updateMany({
        where: {
          carePackageId: pkgId,
          visitDate: { gte: new Date("2026-01-01"), lte: new Date("2026-01-31") },
          status: BillableVisitStatus.APPROVED,
        },
        data: { invoiceLineId: line.id },
      });
    }

    console.log(`✅ Invoice HHC-2026-0001 — Highland Council January 2026 (£${subtotal.toFixed(2)})`);
  } else {
    console.log("⏭  Invoice HHC-2026-0001 already exists — skipping");
  }

  // ── Incidents ──────────────────────────────────────────────────────────────
  const existingIncidents = await prisma.incident.count({ where: { organisationId: IDS.org1 } });

  if (existingIncidents === 0) {
    const craigUser = await prisma.user.findUniqueOrThrow({ where: { email: "craig@highlandhomecare.co.uk" } });

    await prisma.incident.create({
      data: {
        organisationId: IDS.org1,
        serviceUserId: IDS.agnesRobertson,
        staffMemberId: IDS.craigStaff,
        incidentType: IncidentType.ACCIDENT,
        incidentDate: new Date("2026-01-18"),
        incidentTime: "08:15",
        location: "Bathroom — 7 Ness Walk, Inverness",
        description:
          "Agnes slipped on wet floor in bathroom during morning personal care. Did not fall — carer was present and supported her safely. No injury sustained.",
        severity: IncidentSeverity.LOW,
        immediateActionTaken:
          "Agnes supported safely. Floor dried immediately. Incident reported to senior. Family notified by phone at 09:00.",
        reportedBy: craigUser.id,
        reportedDate: new Date("2026-01-18"),
        status: IncidentStatus.CLOSED,
        outcome: "No injury. Anti-slip bath mat ordered and fitted. Risk assessment updated.",
        closedBy: david.id,
        closedDate: new Date("2026-01-21"),
        createdBy: craigUser.id,
        updatedBy: david.id,
      },
    });

    await prisma.incident.create({
      data: {
        organisationId: IDS.org1,
        serviceUserId: IDS.donaldMacKay,
        incidentType: IncidentType.MEDICATION_ERROR,
        incidentDate: new Date("2026-02-05"),
        incidentTime: "08:45",
        location: "19 Haugh Road, Inverness",
        description:
          "Carer administered evening medications during morning visit in error. Donald received his evening Ramipril 5mg approximately 10 hours early.",
        severity: IncidentSeverity.MEDIUM,
        immediateActionTaken:
          "GP informed immediately. Donald monitored — no adverse effects observed. Evening dose omitted on GP advice.",
        reportedBy: janet.id,
        reportedDate: new Date("2026-02-05"),
        status: IncidentStatus.UNDER_INVESTIGATION,
        createdBy: janet.id,
        updatedBy: david.id,
      },
    });

    console.log("✅ Incidents: 2 created");
  } else {
    console.log("⏭  Incidents already exist — skipping");
  }

  // ── Service user reviews ───────────────────────────────────────────────────
  const existingReviews = await prisma.serviceUserReview.count({ where: { organisationId: IDS.org1 } });

  if (existingReviews === 0) {
    for (const serviceUserId of [IDS.agnesRobertson, IDS.donaldMacKay, IDS.eileenBurns, IDS.maryMacDonald]) {
      await prisma.serviceUserReview.create({
        data: {
          serviceUserId,
          organisationId: IDS.org1,
          reviewDate: new Date("2025-10-01"),
          reviewType: ReviewType.SCHEDULED,
          reviewerId: david.id,
          serviceUserFeedback: "Happy with the service. Feels well cared for.",
          familyFeedback: "Family satisfied with quality of care. Good communication from the team.",
          changesIdentified: "Minor adjustments to personal care routine requested.",
          actionsTaken: "Personal plan updated to reflect preferences.",
          nextReviewDate: new Date("2026-04-01"),
          personalPlanUpdated: true,
          createdBy: david.id,
          updatedBy: david.id,
        },
      });
    }
    console.log("✅ Service user reviews");
  } else {
    console.log("⏭  Service user reviews already exist — skipping");
  }

  console.log("\n🎉 Demo seed complete!\n");
  console.log("Additional login credentials (password: Password123!):");
  console.log("  janet@highlandhomecare.co.uk   CARER");
  console.log("  alan@highlandhomecare.co.uk    CARER");
  console.log("\nNew service users: Agnes Robertson, Donald MacKay, Eileen Burns, William Stewart, Jean MacPherson");
  console.log("New staff members: David Henderson, Fiona Campbell, Janet Morrison, Alan McGregor");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());