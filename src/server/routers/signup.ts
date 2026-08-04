import { z } from "zod";
import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { verifyTurnstileToken } from "../shared/turnstile";
import { sendSignupVerificationEmail } from "../shared/email";
import { passwordSchema } from "../shared/validators";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SIGNUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SIGNUP_ATTEMPTS_PER_IP = 10;
const MAX_SIGNUP_ATTEMPTS_PER_EMAIL = 3;

async function isSignupRateLimited(email: string, ipAddress: string): Promise<boolean> {
  const since = new Date(Date.now() - SIGNUP_WINDOW_MS);
  const [ipCount, emailCount] = await Promise.all([
    prisma.signupAttempt.count({ where: { ipAddress, createdAt: { gte: since } } }),
    prisma.signupAttempt.count({ where: { email, createdAt: { gte: since } } }),
  ]);
  return ipCount >= MAX_SIGNUP_ATTEMPTS_PER_IP || emailCount >= MAX_SIGNUP_ATTEMPTS_PER_EMAIL;
}

async function issueVerificationToken(email: string): Promise<string> {
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  const rawToken = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: rawToken,
      expires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    },
  });
  return rawToken;
}

async function sendVerification(email: string): Promise<void> {
  const rawToken = await issueVerificationToken(email);
  const verifyUrl = `${process.env.AUTH_URL}/verify-email?token=${rawToken}&email=${encodeURIComponent(email)}`;
  await sendSignupVerificationEmail(email, verifyUrl).catch((err) => {
    console.error("[signup] Failed to send verification email:", err);
  });
}

export const signupRouter = router({
  /**
   * Create a new Organisation + its first ORG_ADMIN User (one signup = one
   * new org, matching the existing one-org-per-user model). Both start
   * isActive:false until the email is verified — mirrors
   * scripts/setup-production.ts's transaction shape.
   */
  create: publicProcedure
    .input(
      z.object({
        organisationName: z.string().min(1, "Organisation name is required"),
        email: z.string().email(),
        password: passwordSchema,
        turnstileToken: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const email = input.email.toLowerCase();
      const ipAddress = ctx.ipAddress ?? "unknown";

      if (await isSignupRateLimited(email, ipAddress)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many signup attempts. Please try again later.",
        });
      }

      const captchaValid = await verifyTurnstileToken(input.turnstileToken);
      if (!captchaValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CAPTCHA verification failed. Please try again.",
        });
      }

      await prisma.signupAttempt.create({ data: { email, ipAddress } });

      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true, isActive: true, organisationId: true },
      });

      if (existing?.isActive) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists. Try signing in instead.",
        });
      }

      if (existing) {
        // Abandoned previous signup with the same email — reclaim it rather
        // than permanently squatting the address.
        await prisma.$transaction([
          prisma.verificationToken.deleteMany({ where: { identifier: email } }),
          prisma.user.delete({ where: { id: existing.id } }),
          prisma.organisation.delete({ where: { id: existing.organisationId } }),
        ]);
      }

      const passwordHash = await hash(input.password, 12);

      await prisma.$transaction(async (tx) => {
        const org = await tx.organisation.create({
          data: { name: input.organisationName, isActive: false },
        });
        await tx.organisationSubscription.create({
          data: { organisationId: org.id, quantity: 0 },
        });
        await tx.user.create({
          data: {
            organisationId: org.id,
            email,
            passwordHash,
            role: "ORG_ADMIN",
            isActive: false,
          },
        });
      });

      await sendVerification(email);

      return { success: true };
    }),

  /**
   * Completes signup: activates both the User and its Organisation, and
   * consumes the verification token.
   */
  verifyEmail: publicProcedure
    .input(z.object({ token: z.string().min(1), email: z.string().email() }))
    .mutation(async ({ input }) => {
      const email = input.email.toLowerCase();

      const verification = await prisma.verificationToken.findUnique({
        where: { identifier_token: { identifier: email, token: input.token } },
      });
      if (!verification || verification.expires < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This verification link is invalid or has expired.",
        });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This verification link is invalid or has expired.",
        });
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { isActive: true, emailVerified: new Date() },
        }),
        prisma.organisation.update({
          where: { id: user.organisationId },
          data: { isActive: true },
        }),
        prisma.verificationToken.delete({
          where: { identifier_token: { identifier: email, token: input.token } },
        }),
      ]);

      return { success: true };
    }),

  /**
   * Re-sends the verification email for an unverified signup. Generic
   * response regardless of whether the email exists/is already verified —
   * avoids confirming account state to an unauthenticated caller.
   */
  resendVerification: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const email = input.email.toLowerCase();
      const user = await prisma.user.findUnique({
        where: { email },
        select: { isActive: true },
      });

      if (user && !user.isActive) {
        await sendVerification(email);
      }

      return { success: true };
    }),
});
