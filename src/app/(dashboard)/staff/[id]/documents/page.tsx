"use client";

import { use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function StaffDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  use(params);

  return (
    <Card>
      <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
        <FileText className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Documents</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Contracts, certificates, fit notes, correspondence and other staff file documents.
        </p>
      </CardContent>
    </Card>
  );
}
