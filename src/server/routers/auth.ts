import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { hash } from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "../middleware/audit";
import { sendPasswordResetEmail } from "../shared/email";
import { passwordSchema } from "../shared/validators";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const authRouter = router({
  /**
   * Request a password reset link. Always returns the same generic response
   * regardless of whether the email exists or is active — avoids leaking
   * which emails are registered.
   */
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const email = input.email.toLowerCase();
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, isActive: true, organisationId: true },
      });

      if (user?.isActive) {
        const rawToken = randomBytes(32).toString("hex");
        await prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: hashToken(rawToken),
            expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
          },
        });

        const resetUrl = `${process.env.AUTH_URL}/reset-password?token=${rawToken}`;
        await sendPasswordResetEmail(user.email, resetUrl).catch((err) => {
          console.error("[auth] Failed to send password reset email:", err);
        });
      }

      return { success: true };
    }),

  /**
   * Complete a password reset. The token is single-use (marked via usedAt)
   * and expires after RESET_TOKEN_TTL_MS.
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        newPassword: passwordSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const tokenHash = hashToken(input.token);
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
        include: { user: { select: { id: true, organisationId: true } } },
      });

      if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This password reset link is invalid or has expired.",
        });
      }

      const passwordHash = await hash(input.newPassword, 12);
      const now = new Date();

      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.userId },
          data: { passwordHash, passwordChangedAt: now },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { usedAt: now },
        }),
      ]);

      // Manual audit entry — this bypasses ctx.db's automatic audit logging
      // since there's no authenticated session to attribute the change to
      // (same reasoning as scripts/setup-production.ts using raw prisma).
      // A credential change is exactly the kind of event that should still
      // land in the audit trail.
      await createAuditLog({
        organisationId: resetToken.user.organisationId,
        entityType: "User",
        entityId: resetToken.userId,
        action: "UPDATE",
        changes: { passwordHash: { to: "[reset via forgot-password flow]" } },
      }).catch((err) => {
        console.error("[auth] Failed to write audit log for password reset:", err);
      });

      return { success: true };
    }),
});
