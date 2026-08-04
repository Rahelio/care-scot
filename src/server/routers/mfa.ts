import { z } from "zod";
import { compare } from "bcryptjs";
import QRCode from "qrcode";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { generateTotpSecret, buildTotpUri, verifyTotpCode } from "@/lib/totp";
import { generateRecoveryCodes, hashRecoveryCode } from "@/lib/recovery-codes";

export const mfaRouter = router({
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { mfaEnabled: true },
    });
    return { enabled: user.mfaEnabled };
  }),

  /**
   * Starts (or restarts) enrollment: generates a fresh TOTP secret and
   * stores it (encrypted — see field-encryption.ts) without turning MFA on
   * yet. Only confirmEnrollment flips mfaEnabled, so an abandoned setup
   * never locks anyone out or half-enables MFA.
   */
  beginEnrollment: protectedProcedure.mutation(async ({ ctx }) => {
    const secret = generateTotpSecret();
    await ctx.db.user.update({
      where: { id: ctx.user.id },
      data: { mfaSecret: secret },
    });
    const otpauthUri = buildTotpUri(secret, ctx.user.email);
    return {
      secret,
      otpauthUri,
      qrCodeDataUrl: await QRCode.toDataURL(otpauthUri),
    };
  }),

  /**
   * Confirms enrollment with a real code from the authenticator app, turns
   * MFA on, and issues one-time recovery codes (shown to the caller exactly
   * once — only the bcrypt hash is persisted).
   */
  confirmEnrollment: protectedProcedure
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        select: { mfaSecret: true },
      });
      if (!user.mfaSecret) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No MFA enrollment in progress — start setup again.",
        });
      }
      if (!(await verifyTotpCode(user.mfaSecret, input.code))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Incorrect code — please try again." });
      }

      const recoveryCodes = generateRecoveryCodes();
      const hashedCodes = await Promise.all(recoveryCodes.map(hashRecoveryCode));

      await ctx.db.$transaction([
        ctx.db.user.update({ where: { id: ctx.user.id }, data: { mfaEnabled: true } }),
        ctx.db.mfaRecoveryCode.deleteMany({ where: { userId: ctx.user.id } }),
        ctx.db.mfaRecoveryCode.createMany({
          data: hashedCodes.map((codeHash) => ({ userId: ctx.user.id, codeHash })),
        }),
      ]);

      return { recoveryCodes };
    }),

  /** Disables MFA — requires the current password to confirm intent. */
  disable: protectedProcedure
    .input(z.object({ password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        select: { passwordHash: true },
      });
      if (!user.passwordHash || !(await compare(input.password, user.passwordHash))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Incorrect password." });
      }

      await ctx.db.$transaction([
        ctx.db.user.update({
          where: { id: ctx.user.id },
          data: { mfaEnabled: false, mfaSecret: null },
        }),
        ctx.db.mfaRecoveryCode.deleteMany({ where: { userId: ctx.user.id } }),
      ]);

      return { success: true };
    }),
});
