/**
 * Production setup script — creates the initial organisation and admin user.
 * Run with: npm run db:setup-prod
 *   or:     npx tsx scripts/setup-production.ts
 *
 * Requires DATABASE_URL to be set (pointing at the production database).
 */

import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import * as readline from "readline";

const prisma = new PrismaClient();

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }
    stdin.resume();
    stdin.setEncoding("utf8");

    let password = "";
    const onData = (char: string) => {
      if (char === "\n" || char === "\r" || char === "\u0004") {
        stdin.removeListener("data", onData);
        if (stdin.isTTY) {
          stdin.setRawMode(wasRaw ?? false);
        }
        stdin.pause();
        process.stdout.write("\n");
        resolve(password.trim());
      } else if (char === "\u0003") {
        // Ctrl+C
        process.exit(1);
      } else if (char === "\u007F" || char === "\b") {
        // Backspace
        password = password.slice(0, -1);
      } else {
        password += char;
      }
    };
    stdin.on("data", onData);
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function main() {
  console.log("=== CareScot Production Setup ===\n");
  console.log("This script creates an initial organisation and admin user.\n");

  // Check for existing data
  const existingOrgs = await prisma.organisation.count();
  if (existingOrgs > 0) {
    console.log(
      `Warning: ${existingOrgs} organisation(s) already exist in the database.`
    );
    const proceed = await prompt("Continue anyway? (y/N): ");
    if (proceed.toLowerCase() !== "y") {
      console.log("Aborted.");
      process.exit(0);
    }
    console.log();
  }

  // Organisation name
  const orgName = await prompt("Organisation name: ");
  if (!orgName) {
    console.error("Error: Organisation name is required.");
    process.exit(1);
  }

  // Admin email
  const email = await prompt("Admin email: ");
  if (!email || !isValidEmail(email)) {
    console.error("Error: A valid email address is required.");
    process.exit(1);
  }

  // Check for existing user with that email
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    console.error(`Error: A user with email "${email}" already exists.`);
    process.exit(1);
  }

  // Password
  const password = await promptPassword("Admin password (min 8 chars): ");
  if (password.length < 8) {
    console.error("Error: Password must be at least 8 characters.");
    process.exit(1);
  }

  const confirmPassword = await promptPassword("Confirm password: ");
  if (password !== confirmPassword) {
    console.error("Error: Passwords do not match.");
    process.exit(1);
  }

  // Create organisation + admin user in a transaction
  console.log("\nCreating organisation and admin user...");

  const passwordHash = await hash(password, 12);

  const { org, user } = await prisma.$transaction(async (tx) => {
    const org = await tx.organisation.create({
      data: {
        name: orgName,
        isActive: true,
      },
    });

    const user = await tx.user.create({
      data: {
        organisationId: org.id,
        email,
        passwordHash,
        role: UserRole.ORG_ADMIN,
      },
    });

    return { org, user };
  });

  console.log("\n=== Setup Complete ===");
  console.log(`Organisation: ${org.name} (${org.id})`);
  console.log(`Admin user:   ${user.email} (${user.role})`);
  console.log("\nYou can now log in to the application with these credentials.");
}

main()
  .catch((err) => {
    console.error("Setup failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
