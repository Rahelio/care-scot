import { encryptField, decryptField } from "@/lib/encryption";

/**
 * Model -> field names that are AES-256-GCM encrypted at rest. Kept in sync
 * manually against the schema, same convention as ORG_SCOPED_MODELS in
 * org-scope.ts — a field added here without a matching schema comment (or
 * vice versa) is a bug.
 *
 * Because encryption uses a random IV per value (see src/lib/encryption.ts),
 * these fields are NOT equality-queryable via `where` — a `where: { niNumber:
 * "..." }` filter would never match, since the same plaintext never encrypts
 * to the same ciphertext twice. Nothing in this app currently queries by
 * these fields; if that's ever needed, it requires a separate deterministic
 * lookup (e.g. a keyed HMAC column), not a change to this transform.
 */
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  StaffMember: ["niNumber", "hourlyRate"],
  ServiceUser: ["niNumber"],
  User: ["mfaSecret"],
};

type PlainRecord = Record<string, unknown>;

export const ENCRYPTED_FIELDS_BY_MODEL = ENCRYPTED_FIELDS;

export function encryptDataObject(fields: string[], data: PlainRecord): PlainRecord {
  const out = { ...data };
  for (const field of fields) {
    const value = out[field];
    if (typeof value === "string") {
      out[field] = encryptField(value);
    }
    // null / undefined pass through unchanged (clearing the field / not
    // touching it), matching ordinary Prisma semantics.
  }
  return out;
}

export function decryptResultInPlace(fields: string[], row: PlainRecord): void {
  for (const field of fields) {
    const value = row[field];
    if (typeof value !== "string") continue;
    try {
      row[field] = decryptField(value);
    } catch (err) {
      // Defensive: a malformed/undecryptable value (wrong key after
      // rotation, corrupted row) shouldn't 500 an entire list/detail
      // response over one field on one row.
      console.error(`[field-encryption] Failed to decrypt ${field}:`, err);
      row[field] = null;
    }
  }
}

/**
 * Extends a Prisma client so create/update/upsert automatically encrypt the
 * fields in ENCRYPTED_FIELDS before they reach the database, and every read
 * automatically decrypts them back to plaintext before the result reaches
 * application code. Composes with org-scope/audit-logging in trpc.ts's
 * ctx.db chain — note that audit.ts separately excludes these field names
 * from its diffs entirely (ENCRYPTED_FIELD_NAMES there), since this
 * extension always hands back plaintext by the time any wrapping layer
 * observes its result, regardless of $extends() call order.
 */
export function withFieldEncryption<T extends object>(client: T): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).$extends({
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model: string;
          operation: string;
          args: PlainRecord;
          query: (args: PlainRecord) => Promise<unknown>;
        }) {
          const fields = ENCRYPTED_FIELDS[model];
          if (!fields) return query(args);

          let transformedArgs = args;

          if (operation === "create" || operation === "update") {
            if (args.data && typeof args.data === "object") {
              transformedArgs = { ...args, data: encryptDataObject(fields, args.data as PlainRecord) };
            }
          } else if (operation === "createMany") {
            const data = args.data;
            transformedArgs = {
              ...args,
              data: Array.isArray(data)
                ? data.map((row: PlainRecord) => encryptDataObject(fields, row))
                : data && typeof data === "object"
                  ? encryptDataObject(fields, data as PlainRecord)
                  : data,
            };
          } else if (operation === "updateMany") {
            if (args.data && typeof args.data === "object") {
              transformedArgs = { ...args, data: encryptDataObject(fields, args.data as PlainRecord) };
            }
          } else if (operation === "upsert") {
            transformedArgs = {
              ...args,
              ...(args.create && typeof args.create === "object"
                ? { create: encryptDataObject(fields, args.create as PlainRecord) }
                : {}),
              ...(args.update && typeof args.update === "object"
                ? { update: encryptDataObject(fields, args.update as PlainRecord) }
                : {}),
            };
          }

          const result = await query(transformedArgs);

          if (Array.isArray(result)) {
            for (const row of result) {
              if (row && typeof row === "object") decryptResultInPlace(fields, row as PlainRecord);
            }
          } else if (result && typeof result === "object") {
            decryptResultInPlace(fields, result as PlainRecord);
          }

          return result;
        },
      },
    },
  }) as T;
}
