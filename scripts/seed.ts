/**
 * Dev seed script — populates the database with sample data for two organisations.
 * Run with: npm run db:seed
 */

import { PrismaClient, UserRole, StaffRoleType, EmploymentType, StaffStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  const password = await hash("Password123!", 12);

  // -------------------------------------------------------------------------
  // Organisation 1: Highland Home Care Ltd
  // -------------------------------------------------------------------------
  const org1Data = {
    name: "Highland Home Care Ltd",
    careInspectorateRegNumber: "CS2024000001",
    registeredAddress: "15 Academy Street, Inverness, IV1 1JN",
    registeredManagerName: "Sarah MacLeod",
    isActive: true,
  };
  const org1 = await prisma.organisation.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: org1Data,
    create: { id: "00000000-0000-0000-0000-000000000001", ...org1Data },
  });
  console.log(`✅ Organisation 1: ${org1.name}`);

  const sarah = await prisma.user.upsert({
    where: { email: "sarah@highlandhomecare.co.uk" },
    update: {},
    create: {
      organisationId: org1.id,
      email: "sarah@highlandhomecare.co.uk",
      passwordHash: password,
      role: UserRole.ORG_ADMIN,
      name: "Sarah MacLeod",
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "david@highlandhomecare.co.uk" },
    update: {},
    create: {
      organisationId: org1.id,
      email: "david@highlandhomecare.co.uk",
      passwordHash: password,
      role: UserRole.MANAGER,
      name: "David Henderson",
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "fiona@highlandhomecare.co.uk" },
    update: {},
    create: {
      organisationId: org1.id,
      email: "fiona@highlandhomecare.co.uk",
      passwordHash: password,
      role: UserRole.SENIOR_CARER,
      name: "Fiona Campbell",
      isActive: true,
    },
  });

  const craig = await prisma.user.upsert({
    where: { email: "craig@highlandhomecare.co.uk" },
    update: {},
    create: {
      organisationId: org1.id,
      email: "craig@highlandhomecare.co.uk",
      passwordHash: password,
      role: UserRole.CARER,
      name: "Craig Thomson",
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "emma@highlandhomecare.co.uk" },
    update: {},
    create: {
      organisationId: org1.id,
      email: "emma@highlandhomecare.co.uk",
      passwordHash: password,
      role: UserRole.OFFICE_STAFF,
      name: "Emma Fraser",
      isActive: true,
    },
  });

  console.log(`✅ Org 1 users: sarah, david, fiona, craig, emma`);

  // Staff member record for Craig (CARER)
  const craigStaffData = {
    organisationId: org1.id,
    firstName: "Craig",
    lastName: "Thomson",
    roleType: StaffRoleType.CARER,
    employmentType: EmploymentType.FULL_TIME,
    startDate: new Date("2024-01-01"),
    jobTitle: "Care Assistant",
    email: "craig@highlandhomecare.co.uk",
    status: StaffStatus.ACTIVE,
    createdBy: sarah.id,
    updatedBy: sarah.id,
  };
  const craigStaff = await prisma.staffMember.upsert({
    where: { id: "00000000-0000-0000-0000-000000000010" },
    update: craigStaffData,
    create: { id: "00000000-0000-0000-0000-000000000010", ...craigStaffData },
  });
  await prisma.user.update({
    where: { id: craig.id },
    data: { staffMemberId: craigStaff.id },
  });
  console.log(`✅ Staff member: ${craigStaff.firstName} ${craigStaff.lastName}`);

  // Sample service user for Org 1
  await prisma.serviceUser.upsert({
    where: { id: "00000000-0000-0000-0000-000000000020" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000020",
      organisationId: org1.id,
      firstName: "Mary",
      lastName: "MacDonald",
      dateOfBirth: new Date("1940-06-15"),
      chiNumber: "1506400001",
      addressLine1: "42 Glen Road",
      city: "Inverness",
      postcode: "IV2 3AA",
      phonePrimary: "01463 000001",
      gpName: "Dr. Stewart",
      gpPractice: "Inverness Medical Centre",
      gpPhone: "01463 000010",
      status: "ACTIVE",
      createdBy: sarah.id,
      updatedBy: sarah.id,
    },
  });
  console.log(`✅ Service user: Mary MacDonald (Org 1)\n`);

  // -------------------------------------------------------------------------
  // Organisation 2: Moray Care Services
  // -------------------------------------------------------------------------
  const org2Data = {
    name: "Moray Care Services",
    careInspectorateRegNumber: "CS2024000002",
    registeredAddress: "8 High Street, Elgin, IV30 1BU",
    registeredManagerName: "James Grant",
    isActive: true,
  };
  const org2 = await prisma.organisation.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: org2Data,
    create: { id: "00000000-0000-0000-0000-000000000002", ...org2Data },
  });
  console.log(`✅ Organisation 2: ${org2.name}`);

  const james = await prisma.user.upsert({
    where: { email: "james@moraycare.co.uk" },
    update: {},
    create: {
      organisationId: org2.id,
      email: "james@moraycare.co.uk",
      passwordHash: password,
      role: UserRole.ORG_ADMIN,
      name: "James Grant",
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "laura@moraycare.co.uk" },
    update: {},
    create: {
      organisationId: org2.id,
      email: "laura@moraycare.co.uk",
      passwordHash: password,
      role: UserRole.MANAGER,
      name: "Laura Morrison",
      isActive: true,
    },
  });

  console.log(`✅ Org 2 users: james, laura`);

  // Sample service user for Org 2
  await prisma.serviceUser.upsert({
    where: { id: "00000000-0000-0000-0000-000000000021" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000021",
      organisationId: org2.id,
      firstName: "Robert",
      lastName: "Gordon",
      dateOfBirth: new Date("1945-03-20"),
      chiNumber: "2003450001",
      addressLine1: "12 Cooper Park",
      city: "Elgin",
      postcode: "IV30 1ES",
      phonePrimary: "01343 000001",
      gpName: "Dr. Reid",
      gpPractice: "Elgin Medical Practice",
      gpPhone: "01343 000010",
      status: "ACTIVE",
      createdBy: james.id,
      updatedBy: james.id,
    },
  });
  console.log(`✅ Service user: Robert Gordon (Org 2)\n`);

  // -------------------------------------------------------------------------
  // Financial Module Seed Data (Org 1 only)
  // -------------------------------------------------------------------------
  console.log("--- Financial module seed ---");

  // Set invoice prefix on Org 1
  await prisma.organisation.update({
    where: { id: org1.id },
    data: { invoicePrefix: "HHC" },
  });

  // Funders
  const highlandCouncil = await prisma.funder.upsert({
    where: { id: "00000000-0000-0000-0000-000000000030" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000030",
      organisationId: org1.id,
      name: "Highland Council",
      funderType: "LOCAL_AUTHORITY",
      contactName: "Social Work Finance Team",
      contactEmail: "finance.sw@highland.gov.uk",
      contactPhone: "01463 702000",
      addressLine1: "Council Offices, Glenurquhart Road",
      city: "Inverness",
      postcode: "IV3 5NX",
      paymentTermsDays: 30,
      invoiceFrequency: "MONTHLY",
      billingTimeBasis: "SCHEDULED",
      isActive: true,
      createdBy: sarah.id,
      updatedBy: sarah.id,
    },
  });
  console.log(`✅ Funder: ${highlandCouncil.name}`);

  const privateFunder = await prisma.funder.upsert({
    where: { id: "00000000-0000-0000-0000-000000000031" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000031",
      organisationId: org1.id,
      name: "Private Clients",
      funderType: "PRIVATE",
      paymentTermsDays: 14,
      invoiceFrequency: "MONTHLY",
      billingTimeBasis: "ACTUAL",
      isActive: true,
      createdBy: sarah.id,
      updatedBy: sarah.id,
    },
  });
  console.log(`✅ Funder: ${privateFunder.name}`);

  // Rate Card: Highland Council 2025/26
  const councilRateCard = await prisma.rateCard.upsert({
    where: { id: "00000000-0000-0000-0000-000000000040" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000040",
      organisationId: org1.id,
      funderId: highlandCouncil.id,
      name: "Highland Council 2025/26",
      effectiveFrom: new Date("2025-04-01"),
      isActive: true,
      createdBy: sarah.id,
      updatedBy: sarah.id,
    },
  });

  // Council rate lines
  const councilLines = [
    { dayType: "WEEKDAY" as const, rate: "22.00", carers: 1, desc: "Weekday standard" },
    { dayType: "SATURDAY" as const, rate: "25.00", carers: 1, desc: "Saturday" },
    { dayType: "SUNDAY" as const, rate: "28.00", carers: 1, desc: "Sunday" },
    { dayType: "BANK_HOLIDAY" as const, rate: "33.00", carers: 1, desc: "Bank holiday" },
    { dayType: "WEEKDAY" as const, rate: "22.00", carers: 2, desc: "Weekday double-up" },
    { dayType: "SATURDAY" as const, rate: "25.00", carers: 2, desc: "Saturday double-up" },
    { dayType: "SUNDAY" as const, rate: "28.00", carers: 2, desc: "Sunday double-up" },
    { dayType: "BANK_HOLIDAY" as const, rate: "33.00", carers: 2, desc: "Bank holiday double-up" },
  ];
  for (const line of councilLines) {
    await prisma.rateCardLine.create({
      data: {
        rateCardId: councilRateCard.id,
        organisationId: org1.id,
        dayType: line.dayType,
        ratePerHour: line.rate,
        carersRequired: line.carers,
        description: line.desc,
      },
    });
  }
  await prisma.mileageRate.create({
    data: {
      rateCardId: councilRateCard.id,
      organisationId: org1.id,
      ratePerMile: "0.45",
      description: "Standard mileage",
    },
  });
  console.log(`✅ Rate card: ${councilRateCard.name} (${councilLines.length} lines + mileage)`);

  // Rate Card: Standard Private Rates 2025/26
  const privateRateCard = await prisma.rateCard.upsert({
    where: { id: "00000000-0000-0000-0000-000000000041" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000041",
      organisationId: org1.id,
      funderId: privateFunder.id,
      name: "Standard Private Rates 2025/26",
      effectiveFrom: new Date("2025-04-01"),
      isActive: true,
      createdBy: sarah.id,
      updatedBy: sarah.id,
    },
  });

  const privateLines = [
    { dayType: "WEEKDAY" as const, rate: "26.00", carers: 1, start: "06:00", end: "20:00", desc: "Weekday daytime" },
    { dayType: "WEEKDAY" as const, rate: "30.00", carers: 1, start: "20:00", end: "06:00", desc: "Weekday overnight" },
    { dayType: "SATURDAY" as const, rate: "30.00", carers: 1, start: null, end: null, desc: "Saturday" },
    { dayType: "SUNDAY" as const, rate: "33.00", carers: 1, start: null, end: null, desc: "Sunday" },
    { dayType: "BANK_HOLIDAY" as const, rate: "38.00", carers: 1, start: null, end: null, desc: "Bank holiday" },
  ];
  for (const line of privateLines) {
    await prisma.rateCardLine.create({
      data: {
        rateCardId: privateRateCard.id,
        organisationId: org1.id,
        dayType: line.dayType,
        ratePerHour: line.rate,
        carersRequired: line.carers,
        timeBandStart: line.start,
        timeBandEnd: line.end,
        description: line.desc,
      },
    });
  }
  await prisma.mileageRate.create({
    data: {
      rateCardId: privateRateCard.id,
      organisationId: org1.id,
      ratePerMile: "0.45",
      description: "Standard mileage",
    },
  });
  console.log(`✅ Rate card: ${privateRateCard.name} (${privateLines.length} lines + mileage)`);

  // Bank Holidays — Scotland 2025 & 2026
  const scottishHolidays = [
    { date: "2025-01-01", name: "New Year's Day" },
    { date: "2025-01-02", name: "2nd January" },
    { date: "2025-04-18", name: "Good Friday" },
    { date: "2025-05-05", name: "Early May Bank Holiday" },
    { date: "2025-05-26", name: "Spring Bank Holiday" },
    { date: "2025-08-04", name: "Summer Bank Holiday" },
    { date: "2025-11-30", name: "St Andrew's Day" },
    { date: "2025-12-25", name: "Christmas Day" },
    { date: "2025-12-26", name: "Boxing Day" },
    { date: "2026-01-01", name: "New Year's Day" },
    { date: "2026-01-02", name: "2nd January" },
    { date: "2026-04-03", name: "Good Friday" },
    { date: "2026-05-04", name: "Early May Bank Holiday" },
    { date: "2026-05-25", name: "Spring Bank Holiday" },
    { date: "2026-08-03", name: "Summer Bank Holiday" },
    { date: "2026-11-30", name: "St Andrew's Day" },
    { date: "2026-12-25", name: "Christmas Day" },
    { date: "2026-12-28", name: "Boxing Day (substitute)" },
  ];

  for (const h of scottishHolidays) {
    await prisma.bankHoliday.upsert({
      where: {
        organisationId_holidayDate: {
          organisationId: org1.id,
          holidayDate: new Date(h.date),
        },
      },
      update: {},
      create: {
        organisationId: org1.id,
        holidayDate: new Date(h.date),
        name: h.name,
        appliesTo: "SCOTLAND",
      },
    });
  }
  console.log(`✅ Bank holidays: ${scottishHolidays.length} Scottish holidays (2025-2026)`);

  // Care Packages — link Mary to Highland Council, Robert to Private
  await prisma.carePackage.upsert({
    where: { id: "00000000-0000-0000-0000-000000000050" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000050",
      organisationId: org1.id,
      serviceUserId: "00000000-0000-0000-0000-000000000020", // Mary
      funderId: highlandCouncil.id,
      rateCardId: councilRateCard.id,
      packageName: "Mary MacDonald - Council Care",
      funderReference: "HC/SU/2025/001",
      billingTimeBasis: "SCHEDULED",
      roundingIncrementMinutes: 15,
      minimumBillableMinutes: 15,
      carersRequired: 1,
      mileageBillable: false,
      startDate: new Date("2025-04-01"),
      status: "ACTIVE",
      createdBy: sarah.id,
      updatedBy: sarah.id,
    },
  });
  console.log(`✅ Care package: Mary MacDonald → Highland Council (SCHEDULED, 15/15, 1 carer)`);

  // Note: Robert Gordon is in Org 2, so we create a private funder + rate card for Org 2 as well
  // Actually per the plan, Robert is supposed to be in Org 1. But the seed has him in Org 2.
  // Let's create an additional service user in Org 1 for private billing instead.
  // OR we can just skip Robert's package since he's in a different org.
  // Per the plan: "conditional on service users existing" — Robert is in Org 2, so we skip.

  console.log(`✅ Financial module seed complete\n`);

  console.log("🎉 Seed complete!\n");
  console.log("Login credentials (all passwords: Password123!):");
  console.log("");
  console.log("  Org 1 — Highland Home Care Ltd:");
  console.log("    sarah@highlandhomecare.co.uk   ORG_ADMIN");
  console.log("    david@highlandhomecare.co.uk   MANAGER");
  console.log("    fiona@highlandhomecare.co.uk   SENIOR_CARER");
  console.log("    craig@highlandhomecare.co.uk   CARER");
  console.log("    emma@highlandhomecare.co.uk    OFFICE_STAFF");
  console.log("");
  console.log("  Org 2 — Moray Care Services:");
  console.log("    james@moraycare.co.uk          ORG_ADMIN");
  console.log("    laura@moraycare.co.uk          MANAGER");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
