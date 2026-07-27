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

  // Idempotency lock: a unique-constraint violation means this event was
  // already processed (Stripe redelivers on timeout/ambiguous response).
  try {
    await prisma.stripeWebhookEvent.create({ data: { id: event.id, type: event.type } });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handleEvent(event);
  } catch (err) {
    console.error(`[stripe webhook] Failed to handle ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
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
