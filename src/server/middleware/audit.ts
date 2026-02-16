import { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ─── Models excluded from audit logging ───────────────────────────────────────
// Audit log itself (infinite-loop prevention) + auth/session tables.

const AUDIT_EXCLUDED_MODELS = new Set([
  "AuditLog",
  "Account",
  "Session",
  "VerificationToken",
  "RotaAvailability",
  "Organisation",
]);

// Single-record write operations we intercept
const SINGLE_WRITE_OPS = new Set(["create", "update", "delete"]);

// ─── Context ──────────────────────────────────────────────────────────────────

export interface AuditContext {
  userId: string;
  organisationId: string;
  ipAddress?: string;
  userAgent?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toPrismaProperty(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function toAuditAction(operation: string): AuditAction {
  if (operation === "create") return AuditAction.CREATE;
  if (operation === "delete") return AuditAction.DELETE;
  return AuditAction.UPDATE;
}

type PlainRecord = Record<string, unknown>;

function extractEntityId(
  operation: string,
  args: PlainRecord,
  result: unknown,
): string | null {
  if (operation === "create") {
    return ((result as PlainRecord)?.id as string) ?? null;
  }
  if (operation === "update" || operation === "delete") {
    return ((args.where as PlainRecord)?.id as string) ?? null;
  }
  return null;
}

const SKIP_FIELDS = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "organisationId",
  "createdBy",
  "updatedBy",
]);

function buildChanges(
  operation: string,
  before: PlainRecord | null,
  result: unknown,
): PlainRecord | null {
  if (operation === "create") {
    const record = result as PlainRecord | null;
    if (!record) return null;
    const diff: PlainRecord = {};
    for (const [k, v] of Object.entries(record)) {
      if (SKIP_FIELDS.has(k) || v === null || v === undefined) continue;
      diff[k] = { to: v };
    }
    return Object.keys(diff).length > 0 ? diff : null;
  }

  if (operation === "update") {
    const after = result as PlainRecord | null;
    if (!before || !after) return null;
    const diff: PlainRecord = {};
    for (const [k, v] of Object.entries(after)) {
      if (SKIP_FIELDS.has(k)) continue;
      const fromVal = before[k];
      if (JSON.stringify(fromVal) !== JSON.stringify(v)) {
        diff[k] = { from: fromVal ?? null, to: v ?? null };
      }
    }
    return Object.keys(diff).length > 0 ? diff : null;
  }

  if (operation === "delete") {
    if (!before) return null;
    const diff: PlainRecord = {};
    for (const [k, v] of Object.entries(before)) {
      if (SKIP_FIELDS.has(k) || v === null || v === undefined) continue;
      diff[k] = { from: v };
    }
    return Object.keys(diff).length > 0 ? diff : null;
  }

  return null;
}

// ─── Manual audit log helper ──────────────────────────────────────────────────
// For cases where a specific event needs to be explicitly logged (e.g. a
// manager overriding a locked record) in addition to the automatic middleware.

export async function createAuditLog(params: {
  organisationId: string;
  userId?: string;
  entityType: string;
  entityId: string;
  action: AuditAction | string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  return prisma.auditLog.create({
    data: {
      organisationId: params.organisationId,
      userId: params.userId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action as AuditAction,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      changes: (params.changes ?? undefined) as any,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Extends a Prisma client with:
 *  1. Automatic audit logging for all CREATE / UPDATE / DELETE single-record ops
 *  2. Append-only enforcement on AuditLog (blocks update / delete)
 *
 * Pass the org-scoped client from `createOrgScopedPrisma`. Audit log writes use
 * the BASE `prisma` singleton to prevent infinite recursion.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withAuditLogging<T extends object>(client: T, auditCtx: AuditContext): T {
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
          // 1. Enforce append-only on AuditLog ─────────────────────────────────
          if (model === "AuditLog") {
            if (
              operation === "update" ||
              operation === "updateMany" ||
              operation === "delete" ||
              operation === "deleteMany"
            ) {
              throw new Error(
                "AuditLog is append-only — update and delete operations are not permitted.",
              );
            }
            return query(args);
          }

          // 2. Pass through excluded models and non-mutating ops ───────────────
          if (AUDIT_EXCLUDED_MODELS.has(model) || !SINGLE_WRITE_OPS.has(operation)) {
            return query(args);
          }

          // 3. Fetch before-state for update / delete ──────────────────────────
          let before: PlainRecord | null = null;
          if (operation === "update" || operation === "delete") {
            const whereId = (args.where as PlainRecord)?.id as string | undefined;
            if (whereId) {
              try {
                const prop = toPrismaProperty(model);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                before = await (prisma as any)[prop].findUnique({
                  where: { id: whereId },
                });
              } catch {
                // Best-effort — non-fatal if the before-state lookup fails
              }
            }
          }

          // 4. Execute the original operation ──────────────────────────────────
          const result = await query(args);

          // 5. Write audit log (fire-and-forget) ────────────────────────────────
          const entityId = extractEntityId(operation, args, result);
          if (entityId) {
            const changes = buildChanges(operation, before, result);
            prisma.auditLog
              .create({
                data: {
                  organisationId: auditCtx.organisationId,
                  userId: auditCtx.userId,
                  entityType: model,
                  entityId,
                  action: toAuditAction(operation),
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  changes: (changes ?? undefined) as any,
                  ipAddress: auditCtx.ipAddress,
                  userAgent: auditCtx.userAgent,
                },
              })
              .catch((err: unknown) => {
                console.error("[audit] Failed to write audit log:", err);
              });
          }

          return result;
        },
      },
    },
  }) as T;
}
