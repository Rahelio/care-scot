import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { isSerializationFailure } from "../rota";

// autoAssign/assign wrap their conflict-recheck-and-create in a Serializable
// transaction (tryCreateAssignment in rota.ts) specifically so Postgres
// aborts one side of a concurrent double-booking race instead of letting
// both writes through. isSerializationFailure() is what routes that error
// into "treat as a fresh DOUBLE_BOOKED conflict" rather than an unhandled
// 500 — a regression here (e.g. checking the wrong error shape) would
// silently defeat the whole fix.
//
// This was verified live against a real local Postgres (see the plan file /
// PR description): with @prisma/adapter-pg, a Serializable write conflict
// actually surfaces as a raw DriverAdapterError (name ===
// "DriverAdapterError", cause.kind === "TransactionWriteConflict"), NOT as
// a PrismaClientKnownRequestError with code P2034 as Prisma's general docs
// would suggest — the initial implementation only checked for P2034 and
// silently failed to catch the real error until this was caught by running
// two concurrent assignments against an actual database.
describe("isSerializationFailure", () => {
  it("recognizes a live-verified DriverAdapterError write conflict (the actual error shape thrown by @prisma/adapter-pg)", () => {
    const err = new Error("could not serialize access due to read/write dependencies among transactions");
    err.name = "DriverAdapterError";
    (err as unknown as { cause: unknown }).cause = { kind: "TransactionWriteConflict" };
    expect(isSerializationFailure(err)).toBe(true);
  });

  it("recognizes Prisma's P2034 write-conflict/deadlock error (binary-engine shape, kept as a fallback)", () => {
    const err = new Prisma.PrismaClientKnownRequestError("Transaction failed due to a write conflict", {
      code: "P2034",
      clientVersion: "test",
    });
    expect(isSerializationFailure(err)).toBe(true);
  });

  it("does not misclassify a DriverAdapterError for an unrelated cause", () => {
    const err = new Error("connection reset");
    err.name = "DriverAdapterError";
    (err as unknown as { cause: unknown }).cause = { kind: "ConnectionClosed" };
    expect(isSerializationFailure(err)).toBe(false);
  });

  it("does not misclassify other Prisma error codes as a serialization failure", () => {
    const notFound = new Prisma.PrismaClientKnownRequestError("Record not found", {
      code: "P2025",
      clientVersion: "test",
    });
    expect(isSerializationFailure(notFound)).toBe(false);
  });

  it("does not misclassify a plain error", () => {
    expect(isSerializationFailure(new Error("boom"))).toBe(false);
    expect(isSerializationFailure("boom")).toBe(false);
    expect(isSerializationFailure(null)).toBe(false);
  });
});
