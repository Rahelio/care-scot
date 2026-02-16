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
