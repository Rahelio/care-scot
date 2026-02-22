import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "@/server/root";

/**
 * Extract the most useful error message from a tRPC error.
 * If the error contains Zod validation details, returns the first field error.
 * Otherwise falls back to the generic error message.
 */
export function formatTRPCError(
  err: TRPCClientErrorLike<AppRouter>,
): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zodError = (err.data as any)?.zodError;
  if (zodError) {
    const fieldErrors: string[] = Object.values(
      zodError.fieldErrors ?? {},
    ).flat() as string[];
    const formErrors: string[] = (zodError.formErrors ?? []) as string[];
    const all = [...fieldErrors, ...formErrors].filter(Boolean);
    if (all.length > 0) return all[0];
  }
  return err.message;
}
