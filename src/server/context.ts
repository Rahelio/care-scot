import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createContext({ req }: { req: Request }) {
  const session = await auth();
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
