import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import * as Sentry from "@sentry/nextjs";
import { appRouter } from "@/server/root";
import { createContext } from "@/server/context";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    onError({ error, path, ctx }) {
      // TRPCErrors with a 4xx-shaped code (BAD_REQUEST, FORBIDDEN, NOT_FOUND,
      // UNAUTHORIZED, etc.) are expected control flow, not incidents — only
      // report the ones that indicate an actual bug or infra failure.
      if (error.code === "INTERNAL_SERVER_ERROR" || !error.code) {
        Sentry.captureException(error, {
          tags: { trpcPath: path },
          user: ctx?.session?.user
            ? {
                id: ctx.session.user.id,
                organisationId: ctx.session.user.organisationId,
              }
            : undefined,
        });
      }
    },
  });

export { handler as GET, handler as POST };
