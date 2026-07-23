"use client";

import { use } from "react";
import { DocumentList } from "@/components/modules/staff/document-list";

export default function StaffDocumentsPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DocumentList staffId={id} />;
}
