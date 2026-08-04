import { describe, it, expect, vi } from "vitest";
import type Stripe from "stripe";
import { processIdempotently, type IdempotencyStore } from "../route";

function fakeStore(): IdempotencyStore & { recorded: Set<string> } {
  const recorded = new Set<string>();
  return {
    recorded,
    async has(eventId) {
      return recorded.has(eventId);
    },
    async record(eventId) {
      recorded.add(eventId);
    },
  };
}

const event = { id: "evt_1", type: "customer.subscription.updated" } as Stripe.Event;

describe("processIdempotently", () => {
  it("runs the handler and records the event on success", async () => {
    const store = fakeStore();
    const handler = vi.fn().mockResolvedValue(undefined);

    const outcome = await processIdempotently(event, store, handler);

    expect(outcome).toBe("processed");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(store.recorded.has(event.id)).toBe(true);
  });

  it("does NOT record the event when the handler throws, so a retry can actually re-run it", async () => {
    const store = fakeStore();
    const handler = vi.fn().mockRejectedValue(new Error("transient DB error"));

    const outcome = await processIdempotently(event, store, handler);

    expect(outcome).toBe("handler-failed");
    // The core regression this guards: previously the idempotency row was
    // written BEFORE handling, so a transient failure here would have left
    // the row in place and permanently swallowed Stripe's retry.
    expect(store.recorded.has(event.id)).toBe(false);
  });

  it("skips the handler entirely for an event already recorded (true duplicate delivery)", async () => {
    const store = fakeStore();
    store.recorded.add(event.id);
    const handler = vi.fn();

    const outcome = await processIdempotently(event, store, handler);

    expect(outcome).toBe("duplicate");
    expect(handler).not.toHaveBeenCalled();
  });

  it("retrying after a handler failure now actually re-runs the handler and succeeds", async () => {
    const store = fakeStore();
    const handler = vi.fn().mockRejectedValueOnce(new Error("transient")).mockResolvedValueOnce(undefined);

    const first = await processIdempotently(event, store, handler);
    const retry = await processIdempotently(event, store, handler);

    expect(first).toBe("handler-failed");
    expect(retry).toBe("processed");
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
