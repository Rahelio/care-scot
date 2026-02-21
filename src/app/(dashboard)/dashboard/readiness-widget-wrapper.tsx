"use client";

import { InspectionReadinessWidget } from "@/components/modules/compliance/compliance-dashboard";

const MANAGER_ROLES = ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"];

export function ReadinessWidgetWrapper({ role }: { role: string }) {
  if (!MANAGER_ROLES.includes(role)) return null;
  return <InspectionReadinessWidget />;
}
