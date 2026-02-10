/**
 * Dev seed script — populates the database with sample data.
 * Run with: npm run db:seed
 */

import { PrismaClient, UserRole, StaffRoleType, EmploymentType } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Organisation
  const org = await prisma.organisation.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "CareScot Demo Organisation",
      careInspectorateRegNumber: "CS2024001234",
      registeredAddress: "1 Care Street, Edinburgh, EH1 1AA",
      registeredManagerName: "Jane Smith",
      phone: "0131 000 0001",
      email: "admin@carescot-demo.co.uk",
      isActive: true,
    },
  });

  console.log(`✅ Organisation: ${org.name}`);

  // Admin user
  const adminPassword = await hash("admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@carescot-demo.co.uk" },
    update: {},
    create: {
      organisationId: org.id,
      email: "admin@carescot-demo.co.uk",
      passwordHash: adminPassword,
      role: UserRole.ORG_ADMIN,
      name: "Admin User",
      isActive: true,
    },
  });

  console.log(`✅ Admin user: ${admin.email}`);

  // Manager user
  const managerPassword = await hash("manager123!", 12);
  const manager = await prisma.user.upsert({
    where: { email: "manager@carescot-demo.co.uk" },
    update: {},
    create: {
      organisationId: org.id,
      email: "manager@carescot-demo.co.uk",
      passwordHash: managerPassword,
      role: UserRole.MANAGER,
      name: "Care Manager",
      isActive: true,
    },
  });

  console.log(`✅ Manager user: ${manager.email}`);

  // Carer user
  const carerPassword = await hash("carer123!", 12);
  const carerUser = await prisma.user.upsert({
    where: { email: "carer@carescot-demo.co.uk" },
    update: {},
    create: {
      organisationId: org.id,
      email: "carer@carescot-demo.co.uk",
      passwordHash: carerPassword,
      role: UserRole.CARER,
      name: "Test Carer",
      isActive: true,
    },
  });

  console.log(`✅ Carer user: ${carerUser.email}`);

  // Staff member
  const staff = await prisma.staffMember.upsert({
    where: { id: "00000000-0000-0000-0000-000000000010" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000010",
      organisationId: org.id,
      firstName: "Test",
      lastName: "Carer",
      roleType: StaffRoleType.CARER,
      employmentType: EmploymentType.FULL_TIME,
      startDate: new Date("2024-01-01"),
      jobTitle: "Care Assistant",
      email: "carer@carescot-demo.co.uk",
      status: "ACTIVE",
      createdBy: admin.id,
      updatedBy: admin.id,
    },
  });

  // Link carer user to staff record
  await prisma.user.update({
    where: { id: carerUser.id },
    data: { staffMemberId: staff.id },
  });

  console.log(`✅ Staff member: ${staff.firstName} ${staff.lastName}`);

  // Sample service user
  const serviceUser = await prisma.serviceUser.upsert({
    where: { id: "00000000-0000-0000-0000-000000000020" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000020",
      organisationId: org.id,
      firstName: "Mary",
      lastName: "MacDonald",
      dateOfBirth: new Date("1940-06-15"),
      chiNumber: "1506400001",
      addressLine1: "42 Glen Road",
      city: "Edinburgh",
      postcode: "EH2 2BB",
      phonePrimary: "0131 000 0002",
      gpName: "Dr. Campbell",
      gpPractice: "Morningside Medical",
      gpPhone: "0131 000 0010",
      status: "ACTIVE",
      createdBy: admin.id,
      updatedBy: admin.id,
    },
  });

  console.log(
    `✅ Service user: ${serviceUser.firstName} ${serviceUser.lastName}`
  );

  console.log("\n🎉 Seed complete!\n");
  console.log("Login credentials:");
  console.log("  Admin:   admin@carescot-demo.co.uk / admin123!");
  console.log("  Manager: manager@carescot-demo.co.uk / manager123!");
  console.log("  Carer:   carer@carescot-demo.co.uk / carer123!\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
