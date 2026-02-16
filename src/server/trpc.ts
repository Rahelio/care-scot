import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import type { Context } from "./context";
import { createOrgScopedPrisma } from "./middleware/org-scope";
import { withAuditLogging } from "./middleware/audit";

export const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof z.ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;

/** Public procedure — no auth required */
export const publicProcedure = t.procedure;

/** Protected procedure — requires authenticated session.
 *  Injects `ctx.db` — an org-scoped, audit-logged Prisma client that
 *  automatically filters all reads, sets organisationId on writes, and
 *  records every create/update/delete to the audit_log table. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const user = ctx.session.user;
  const orgScoped = createOrgScopedPrisma(user.organisationId);
  const db = withAuditLogging(orgScoped, {
    userId: user.id,
    organisationId: user.organisationId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user,
      db,
    },
  });
});
