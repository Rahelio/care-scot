import { describe, it, expect } from "vitest";
import { AuditAction } from "@prisma/client";
import {
  toAuditAction,
  extractEntityId,
  normalizeAuditValue,
  buildChanges,
} from "../audit";

describe("normalizeAuditValue", () => {
  // File.fileSizeBytes is a native JS bigint — JSON.stringify throws on it
  // unconditionally, which crashed real updates before this fix.
  it("converts bigint to string so it survives JSON.stringify", () => {
    const value = BigInt("123456789012345");
    const result = normalizeAuditValue(value);
    expect(result).toBe("123456789012345");
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it("passes through non-bigint values unchanged", () => {
    expect(normalizeAuditValue("hello")).toBe("hello");
    expect(normalizeAuditValue(42)).toBe(42);
    expect(normalizeAuditValue(null)).toBe(null);
    expect(normalizeAuditValue(undefined)).toBe(undefined);
    expect(normalizeAuditValue(true)).toBe(true);
  });
});

describe("toAuditAction", () => {
  it("maps create/update/delete to the matching AuditAction", () => {
    expect(toAuditAction("create")).toBe(AuditAction.CREATE);
    expect(toAuditAction("delete")).toBe(AuditAction.DELETE);
    expect(toAuditAction("update")).toBe(AuditAction.UPDATE);
  });
});

describe("extractEntityId", () => {
  it("uses result.id for create", () => {
    expect(extractEntityId("create", {}, { id: "new-id" })).toBe("new-id");
  });

  it("uses args.where.id for update and delete", () => {
    expect(extractEntityId("update", { where: { id: "existing-id" } }, {})).toBe(
      "existing-id",
    );
    expect(extractEntityId("delete", { where: { id: "existing-id" } }, {})).toBe(
      "existing-id",
    );
  });

  it("returns null when no id is available", () => {
    expect(extractEntityId("create", {}, null)).toBe(null);
    expect(extractEntityId("update", { where: {} }, {})).toBe(null);
  });
});

describe("buildChanges", () => {
  const SKIP_FIELDS = ["id", "createdAt", "updatedAt", "organisationId", "createdBy", "updatedBy"];

  describe("create", () => {
    it("records a {to: value} entry per non-skipped, non-null field", () => {
      const record = {
        id: "1",
        organisationId: "org-1",
        createdAt: new Date(),
        firstName: "Mary",
        lastName: "MacDonald",
        middleName: null,
      };
      const changes = buildChanges("create", null, record);
      expect(changes).toEqual({
        firstName: { to: "Mary" },
        lastName: { to: "MacDonald" },
      });
    });

    it("returns null when there's nothing worth recording", () => {
      expect(buildChanges("create", null, { id: "1", organisationId: "org-1" })).toBe(null);
    });

    for (const field of SKIP_FIELDS) {
      it(`never includes the '${field}' bookkeeping field`, () => {
        const changes = buildChanges("create", null, { [field]: "some-value", realField: "x" });
        expect(changes).not.toHaveProperty(field);
      });
    }

    // niNumber/hourlyRate are AES-256-GCM encrypted (random IV per write) —
    // logging their ciphertext would make every write look like a change to
    // these fields even when the plaintext is identical, so they're
    // redacted from audit diffs entirely, not just kept out of plaintext.
    for (const field of ["niNumber", "hourlyRate"]) {
      it(`never includes the encrypted '${field}' field`, () => {
        const changes = buildChanges("create", null, { [field]: "ciphertext-blob", realField: "x" });
        expect(changes).not.toHaveProperty(field);
      });
    }
  });

  describe("update", () => {
    it("records {from, to} only for fields that actually changed", () => {
      const before = { firstName: "Mary", lastName: "MacDonald", status: "ACTIVE" };
      const after = { firstName: "Mary", lastName: "Macdonald", status: "ACTIVE" };
      const changes = buildChanges("update", before, after);
      expect(changes).toEqual({
        lastName: { from: "MacDonald", to: "Macdonald" },
      });
    });

    it("returns null when nothing changed", () => {
      const record = { firstName: "Mary" };
      expect(buildChanges("update", record, { ...record })).toBe(null);
    });

    it("returns null when before-state is unavailable", () => {
      expect(buildChanges("update", null, { firstName: "Mary" })).toBe(null);
    });

    // The exact bug fixed earlier this session: File.fileSizeBytes updates
    // crashed because JSON.stringify(bigint) throws. This must never
    // regress — a BigInt field changing must produce a clean diff.
    it("handles a changed BigInt field without throwing", () => {
      const before = { fileSizeBytes: BigInt(1024), fileName: "a.pdf" };
      const after = { fileSizeBytes: BigInt(2048), fileName: "a.pdf" };
      let changes: ReturnType<typeof buildChanges> = null;
      expect(() => {
        changes = buildChanges("update", before, after);
      }).not.toThrow();
      expect(changes).toEqual({
        fileSizeBytes: { from: "1024", to: "2048" },
      });
    });

    it("does not flag an unchanged BigInt field as changed", () => {
      const before = { fileSizeBytes: BigInt(1024) };
      const after = { fileSizeBytes: BigInt(1024) };
      expect(buildChanges("update", before, after)).toBe(null);
    });

    for (const field of SKIP_FIELDS) {
      it(`never reports a change to the '${field}' bookkeeping field even if it differs`, () => {
        const changes = buildChanges(
          "update",
          { [field]: "old", realField: "x" },
          { [field]: "new", realField: "x" },
        );
        expect(changes).toBe(null);
      });
    }
  });

  describe("delete", () => {
    it("records a {from: value} entry per non-skipped, non-null field", () => {
      const before = { id: "1", organisationId: "org-1", firstName: "Mary", middleName: null };
      const changes = buildChanges("delete", before, null);
      expect(changes).toEqual({ firstName: { from: "Mary" } });
    });

    it("returns null when before-state is unavailable", () => {
      expect(buildChanges("delete", null, null)).toBe(null);
    });
  });

  it("returns null for any other operation", () => {
    expect(buildChanges("upsert", { a: 1 }, { a: 2 })).toBe(null);
  });
});
