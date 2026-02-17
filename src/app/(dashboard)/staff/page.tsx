import { StaffTable } from "@/components/modules/staff/staff-table";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Staff — CareScot" };

export default function StaffPage() {
  return <StaffTable />;
}
