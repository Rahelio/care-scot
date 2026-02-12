"use client";

import { use, useState } from "react";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { HealthRecordForm } from "@/components/modules/clients/health-record-form";
import { formatDate } from "@/lib/utils";

const RECORD_TYPE_LABELS: Record<string, string> = {
  MEDICAL_HISTORY: "Medical History",
  DIAGNOSIS: "Diagnosis",
  ALLERGY: "Allergy",
  GP_VISIT: "GP Visit",
  HOSPITAL_ADMISSION: "Hospital Admission",
  HOSPITAL_DISCHARGE: "Hospital Discharge",
  HEALTHCARE_VISIT: "Healthcare Visit",
  CONDITION_CHANGE: "Condition Change",
};

const SEVERITY_COLORS: Record<string, string> = {
  MILD: "bg-yellow-100 text-yellow-800 border-yellow-200",
  MODERATE: "bg-orange-100 text-orange-800 border-orange-200",
  SEVERE: "bg-red-100 text-red-800 border-red-200",
  LIFE_THREATENING: "bg-red-200 text-red-900 border-red-300",
};

export default function HealthPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [dialogOpen, setDialogOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: records, isPending } = trpc.clients.listHealthRecords.useQuery({
    serviceUserId: id,
  });

  if (isPending) {
    return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Health Records</h2>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Record
        </Button>
      </div>

      {!records?.length ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-4">No health records yet.</p>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              Add First Record
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <Card key={record.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{record.title}</p>
                      <Badge variant="outline" className="text-xs">
                        {RECORD_TYPE_LABELS[record.recordType] ?? record.recordType}
                      </Badge>
                      {record.severity && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${SEVERITY_COLORS[record.severity] ?? ""}`}
                        >
                          {record.severity}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(record.recordedDate)}
                    </p>
                  </div>
                </div>
                {record.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{record.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HealthRecordForm
        serviceUserId={id}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => utils.clients.listHealthRecords.invalidate({ serviceUserId: id })}
      />
    </div>
  );
}
