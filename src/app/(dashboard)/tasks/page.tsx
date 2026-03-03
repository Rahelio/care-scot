import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PendingActionsView } from "@/components/modules/tasks/pending-actions-view";

export const metadata: Metadata = { title: "Tasks — CareScot" };

export default async function TasksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <PendingActionsView />;
}
