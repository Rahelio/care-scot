import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { requirePermission } from "../middleware/rbac";
import { getStripe } from "../shared/stripe";
import { computeEntitlement, computeRequiredPaidQuantity } from "../services/billing/seats";

const billingProcedure = protectedProcedure.use(requirePermission("billing.manage"));

export const billingRouter = router({
  getUsage: billingProcedure.query(async ({ ctx }) => {
    const [activeUserCount, subscription] = await Promise.all([
      ctx.db.user.count({ where: { isActive: true } }),
      ctx.db.organisationSubscription.findUnique({
        where: { organisationId: ctx.user.organisationId },
      }),
    ]);

    return {
      activeUserCount,
      entitlement: computeEntitlement(subscription),
      status: subscription?.status ?? null,
      quantity: subscription?.quantity ?? 0,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    };
  }),

  /**
   * Creates a Stripe Checkout session for a subscription covering at least
   * the org's current seat overage. allow_promotion_codes lets a comped
   * pilot redeem a Stripe-issued discount code here rather than needing a
   * manual Dashboard action.
   */
  createCheckoutSession: billingProcedure
    .input(z.object({ interval: z.enum(["month", "year"]) }))
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();

      const [activeUserCount, subscription, organisation] = await Promise.all([
        ctx.db.user.count({ where: { isActive: true } }),
        ctx.db.organisationSubscription.findUnique({
          where: { organisationId: ctx.user.organisationId },
        }),
        ctx.db.organisation.findUniqueOrThrow({
          where: { id: ctx.user.organisationId },
          select: { name: true },
        }),
      ]);

      let customerId = subscription?.stripeCustomerId ?? undefined;
      if (!customerId) {
        const customer = await stripe.customers.create({
          name: organisation.name,
          metadata: { organisationId: ctx.user.organisationId },
        });
        customerId = customer.id;
        await ctx.db.organisationSubscription.update({
          where: { organisationId: ctx.user.organisationId },
          data: { stripeCustomerId: customerId },
        });
      }

      const priceId =
        input.interval === "year"
          ? process.env.STRIPE_PRICE_ANNUAL_BLOCK
          : process.env.STRIPE_PRICE_MONTHLY_BLOCK;
      if (!priceId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Billing is not configured yet — no Stripe price ID set.",
        });
      }

      const quantity = Math.max(1, computeRequiredPaidQuantity(activeUserCount));

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity }],
        allow_promotion_codes: true,
        client_reference_id: ctx.user.organisationId,
        success_url: `${process.env.AUTH_URL}/settings?checkout=success`,
        cancel_url: `${process.env.AUTH_URL}/settings?checkout=cancelled`,
      });

      if (!session.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create checkout session.",
        });
      }

      return { url: session.url };
    }),

  createPortalSession: billingProcedure.mutation(async ({ ctx }) => {
    const stripe = getStripe();
    const subscription = await ctx.db.organisationSubscription.findUnique({
      where: { organisationId: ctx.user.organisationId },
    });
    if (!subscription?.stripeCustomerId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No billing account exists yet — subscribe first.",
      });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.AUTH_URL}/settings`,
    });

    return { url: session.url };
  }),
});
