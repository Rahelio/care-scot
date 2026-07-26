import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

// Sliding-window brute-force guard on the credentials login path.
// Two independent limits: per-IP (catches credential stuffing across many
// accounts) and per-email (catches targeted brute force across many IPs).
// Every attempt is logged before the outcome is known, and the check runs
// before any DB lookup/bcrypt work so a locked-out caller can't burn cycles.
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_IP = 20;
const MAX_ATTEMPTS_PER_EMAIL = 5;

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}

async function isRateLimited(email: string, ipAddress: string): Promise<boolean> {
  const since = new Date(Date.now() - LOGIN_ATTEMPT_WINDOW_MS);

  const [ipCount, emailCount] = await Promise.all([
    prisma.loginAttempt.count({ where: { ipAddress, createdAt: { gte: since } } }),
    prisma.loginAttempt.count({ where: { email, createdAt: { gte: since } } }),
  ]);

  return ipCount >= MAX_ATTEMPTS_PER_IP || emailCount >= MAX_ATTEMPTS_PER_EMAIL;
}

// Opportunistic prune so login_attempts doesn't grow unbounded — cheap
// enough to run inline rather than needing a dedicated cron for this alone.
async function pruneOldAttempts(): Promise<void> {
  if (Math.random() >= 0.01) return;
  await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase();
        const ipAddress = getClientIp(request);

        if (await isRateLimited(email, ipAddress)) return null;

        await prisma.loginAttempt.create({ data: { email, ipAddress } });
        await pruneOldAttempts();

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            role: true,
            organisationId: true,
            isActive: true,
            staffMemberId: true,
          },
        });

        if (!user?.passwordHash || !user.isActive) return null;

        const valid = await compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          organisationId: user.organisationId,
          staffMemberId: user.staffMemberId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.organisationId = user.organisationId;
        token.staffMemberId = user.staffMemberId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as import("@prisma/client").UserRole;
      session.user.organisationId = token.organisationId as string;
      session.user.staffMemberId = (token.staffMemberId as string | null) ?? null;
      return session;
    },
  },
  session: {
    strategy: "jwt",
    // Session expires after 30 minutes of inactivity.
    // updateAge: 60 means the JWT is refreshed on each request made >60s
    // after the last refresh, rolling the 30-minute window forward.
    maxAge: 30 * 60,
    updateAge: 60,
  },
  pages: {
    signIn: "/login",
  },
});
