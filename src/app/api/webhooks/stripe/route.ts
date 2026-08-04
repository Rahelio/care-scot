import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/server/shared/stripe";
import { prisma } from "@/lib/prisma";

// Plain Route Handler, not a tRPC procedure — Stripe requires the raw,
// unparsed request body for signature verification, and this sits entirely
// outside the tRPC/org-scope/audit stack since there's no authenticated org
// context to derive from a webhook call (consistent with the /api/cron/*
// precedent of plain routes for non-user-triggered server-to-server calls).
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const outcome = await processIdempotently(event, PRISMA_IDEMPOTENCY_STORE, handleEvent);

  if (outcome === "handler-failed") {
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true, duplicate: outcome === "duplicate" });
}

export interface IdempotencyStore {
  has(eventId: string): Promise<boolean>;
  record(eventId: string, eventType: string): Promise<void>;
}

const PRISMA_IDEMPOTENCY_STORE: IdempotencyStore = {
  async has(eventId) {
    return (await prisma.stripeWebhookEvent.findUnique({ where: { id: eventId } })) !== null;
  },
  async record(eventId, eventType) {
    // A concurrent redelivery can race this insert and lose the unique
    // constraint — safe to ignore, since handleEvent()'s writes (updateMany
    // keyed on Stripe IDs) are themselves idempotent, so both redeliveries
    // applied the same correct state regardless of which one wins the row.
    await prisma.stripeWebhookEvent.create({ data: { id: eventId, type: eventType } }).catch(() => void 0);
  },
};

/**
 * Runs `handler(event)` exactly once per event ID, recording the
 * idempotency row only AFTER the handler succeeds. This ordering matters:
 * if the row were recorded before handling (as it once was), a transient
 * handler failure would still leave the row in place, so Stripe's retry of
 * the same event ID would be misread as "already processed" and silently
 * dropped instead of actually being retried. Extracted from the route
 * handler so this sequencing can be unit-tested with a fake store instead
 * of a real database.
 */
export async function processIdempotently(
  event: Stripe.Event,
  store: IdempotencyStore,
  handler: (event: Stripe.Event) => Promise<void>,
): Promise<"processed" | "duplicate" | "handler-failed"> {
  if (await store.has(event.id)) {
    return "duplicate";
  }

  try {
    await handler(event);
  } catch (err) {
    console.error(`[stripe webhook] Failed to handle ${event.type}:`, err);
    return "handler-failed";
  }

  await store.record(event.id, event.type);
  return "processed";
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        await prisma.organisationSubscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: { status: "past_due" },
        });
      }
      break;
    }

    default:
      // checkout.session.completed and invoice.paid don't need separate
      // handling — the subscription.* events that follow them carry the
      // full state we need to sync.
      break;
  }
}

async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const item = subscription.items.data[0];

  await prisma.organisationSubscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionItemId: item?.id,
      stripePriceId: item?.price.id,
      status: subscription.status,
      quantity: item?.quantity ?? 0,
      currentPeriodEnd: item?.current_period_end
        ? new Date(item.current_period_end * 1000)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}
