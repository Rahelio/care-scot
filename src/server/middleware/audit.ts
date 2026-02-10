import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@prisma/client";

interface AuditParams {
  organisationId: string;
  userId?: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  changes?: Record<string, { old: unknown; new: unknown }>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: AuditParams) {
  return prisma.auditLog.create({
    data: {
      organisationId: params.organisationId,
      userId: params.userId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      changes: (params.changes ?? undefined) as any,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

export function diffChanges<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  for (const key of Object.keys(after) as (keyof T)[]) {
    if (before[key] !== after[key]) {
      changes[key as string] = { old: before[key], new: after[key] };
    }
  }
  return changes;
}
