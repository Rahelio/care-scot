import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Lazily-constructed Stripe client. Throws only when actually used without
 * STRIPE_SECRET_KEY configured — importing this module (e.g. at build time
 * or in tests that never call a Stripe-touching procedure) is always safe.
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required for billing operations");
  }
  _stripe = new Stripe(secretKey);
  return _stripe;
}
