import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { StaffForm } from "@/components/modules/staff/staff-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Add Staff Member — CareScot" };

export default async function NewStaffPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-2xl">
      <StaffForm />
    </div>
  );
}
