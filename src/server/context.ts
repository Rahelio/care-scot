import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { jwtVerify } from "jose";
import { UserRole } from "@prisma/client";

export async function createContext({ req }: { req: Request }) {
  let session = await auth();

  if (!session) {
    const header = req.headers.get("authorization");
    if (header?.startsWith("Bearer ")) {
      try {
        const { payload } = await jwtVerify(
          header.slice(7),
          new TextEncoder().encode(process.env.AUTH_SECRET!)
        );
        session = {
          user: {
            id: payload.id as string,
            email: payload.email as string,
            role: payload.role as UserRole,
            organisationId: payload.organisationId as string,
            staffMemberId: (payload.staffMemberId as string | null) ?? null,
          },
          expires: new Date((payload.exp as number) * 1000).toISOString(),
        };
      } catch {
        // expired/invalid — session stays null → UNAUTHORIZED
      }
    }
  }

  const forwarded = req.headers.get("x-forwarded-for");
  const ipAddress =
    (forwarded ? forwarded.split(",")[0].trim() : null) ??
    req.headers.get("x-real-ip") ??
    undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;
  return {
    session,
    prisma,
    ipAddress,
    userAgent,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
