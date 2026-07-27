import { TRPCError } from "@trpc/server";
import type { OrgScopedPrismaClient } from "../../middleware/org-scope";

export const FREE_SEATS_BASELINE = 5;
export const SEATS_PER_BLOCK = 5;

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

interface SubscriptionState {
  status: string | null;
  quantity: number;
}

/**
 * How many active User seats an org is entitled to right now. A lapsed/
 * canceled/past_due subscription doesn't reduce entitlement below the free
 * baseline — see assertSeatAvailable for why (never lock existing staff out
 * over a billing issue).
 */
export function computeEntitlement(subscription: SubscriptionState | null): number {
  if (!subscription || !ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status ?? "")) {
    return FREE_SEATS_BASELINE;
  }
  return FREE_SEATS_BASELINE + subscription.quantity * SEATS_PER_BLOCK;
}

/**
 * How many paid 5-seat blocks an org needs for its current active-user
 * count. This is the `quantity` sent to Stripe's subscription item — Stripe's
 * dashboard-configured tiered pricing handles the actual cost per block.
 */
export function computeRequiredPaidQuantity(activeUserCount: number): number {
  const overage = Math.max(0, activeUserCount - FREE_SEATS_BASELINE);
  return Math.ceil(overage / SEATS_PER_BLOCK);
}

/**
 * Throws FORBIDDEN if adding one more active user would exceed the org's
 * current entitlement. Hard-blocks new seat growth only — never deactivates
 * or locks out users already active, since a billing lapse shouldn't cut
 * off staff mid-shift from live medication/safeguarding records.
 */
export async function assertSeatAvailable(
  db: OrgScopedPrismaClient,
  organisationId: string,
): Promise<void> {
  const [activeCount, subscription] = await Promise.all([
    db.user.count({ where: { isActive: true } }),
    db.organisationSubscription.findUnique({
      where: { organisationId },
      select: { status: true, quantity: true },
    }),
  ]);

  const entitlement = computeEntitlement(subscription);

  if (activeCount + 1 > entitlement) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Seat limit reached (${activeCount} of ${entitlement} used). Add more seats in Billing settings to invite another user.`,
    });
  }
}
