"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Plus,
  Pencil,
  XCircle,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddMedicationForm } from "@/components/modules/medication/add-medication-form";
import { DiscontinueForm } from "@/components/modules/medication/discontinue-form";
import { formatDate } from "@/lib/utils";

type Medication = {
  id: string;
  medicationName: string;
  form: string | null;
  dose: string | null;
  frequency: string | null;
  route: string | null;
  prescriber: string | null;
  pharmacy: string | null;
  startDate: Date;
  endDate: Date | null;
  isPrn: boolean;
  prnReason: string | null;
  prnMaxDose: string | null;
  isControlledDrug: boolean;
  specialInstructions: string | null;
  status: string;
  discontinuedReason: string | null;
};

const FORM_LABELS: Record<string, string> = {
  TABLET: "Tablet",
  LIQUID: "Liquid",
  INJECTION: "Injection",
  TOPICAL: "Topical",
  PATCH: "Patch",
  INHALER: "Inhaler",
  DROPS: "Drops",
  SUPPOSITORY: "Suppository",
  OTHER: "Other",
};

function MedRow({
  med,
  onEdit,
  onDiscontinue,
}: {
  med: Medication;
  onEdit: (m: Medication) => void;
  onDiscontinue: (m: Medication) => void;
}) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/20 group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{med.medicationName}</span>
          {med.isPrn && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-800 border-blue-200">
              PRN
            </Badge>
          )}
          {med.isControlledDrug && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-red-100 text-red-800 border-red-200 flex items-center gap-0.5">
              <ShieldAlert className="h-2.5 w-2.5" />
              CD
            </Badge>
          )}
          {med.status === "ON_HOLD" && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-yellow-100 text-yellow-800 border-yellow-200">
              On Hold
            </Badge>
          )}
        </div>
        {med.specialInstructions && (
          <p className="text-xs text-muted-foreground mt-0.5 italic">
            {med.specialInstructions}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {med.form ? FORM_LABELS[med.form] ?? med.form : "—"}
      </td>
      <td className="px-4 py-3 text-sm">{med.dose ?? "—"}</td>
      <td className="px-4 py-3 text-sm">{med.frequency ?? "—"}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{med.route ?? "—"}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(med.startDate)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(med)}
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDiscontinue(med)}
            title="Discontinue"
          >
            <XCircle className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function MedicationListPage({
  params,
}: {
  params: Promise<{ serviceUserId: string }>;
}) {
  const { serviceUserId } = use(params);
  const utils = trpc.useUtils();

  const [addOpen, setAddOpen] = useState(false);
  const [editMed, setEditMed] = useState<Medication | null>(null);
  const [discontinueMed, setDiscontinueMed] = useState<Medication | null>(null);
  const [showDiscontinued, setShowDiscontinued] = useState(false);

  const { data: client } = trpc.clients.getProfile.useQuery({ id: serviceUserId });

  const { data: allMeds, isPending } = trpc.medication.listForClient.useQuery({
    serviceUserId,
  });

  const activeMeds = (allMeds ?? []).filter(
    (m) => m.status === "ACTIVE" || m.status === "ON_HOLD"
  ) as Medication[];
  const discontinuedMeds = (allMeds ?? []).filter(
    (m) => m.status === "DISCONTINUED"
  ) as Medication[];

  function handleEditOpen(med: Medication) {
    setEditMed(med);
    setAddOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/medication">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">
              {client
                ? `${client.firstName} ${client.lastName}`
                : "Medications"}
            </h1>
            {client?.dateOfBirth && (
              <p className="text-sm text-muted-foreground">
                DOB: {formatDate(client.dateOfBirth)}
                {client.chiNumber && ` · CHI: ${client.chiNumber}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/medication/${serviceUserId}/mar`}>
              <CalendarDays className="h-4 w-4 mr-2" />
              MAR Chart
            </Link>
          </Button>
          <Button onClick={() => { setEditMed(null); setAddOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Medication
          </Button>
        </div>
      </div>

      {/* Active medications */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Active Medications
              {activeMeds.length > 0 && (
                <Badge variant="outline">{activeMeds.length}</Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isPending ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : activeMeds.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <p className="mb-3">No active medications.</p>
              <Button variant="outline" size="sm" onClick={() => { setEditMed(null); setAddOpen(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add First Medication
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2 font-medium">Medication</th>
                    <th className="text-left px-4 py-2 font-medium">Form</th>
                    <th className="text-left px-4 py-2 font-medium">Dose</th>
                    <th className="text-left px-4 py-2 font-medium">Frequency</th>
                    <th className="text-left px-4 py-2 font-medium">Route</th>
                    <th className="text-left px-4 py-2 font-medium">Start Date</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {activeMeds.map((med) => (
                    <MedRow
                      key={med.id}
                      med={med}
                      onEdit={handleEditOpen}
                      onDiscontinue={setDiscontinueMed}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discontinued medications */}
      {discontinuedMeds.length > 0 && (
        <div>
          <button
            onClick={() => setShowDiscontinued((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            {showDiscontinued ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Discontinued Medications ({discontinuedMeds.length})
          </button>

          {showDiscontinued && (
            <Card className="border-dashed opacity-75">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-2 font-medium">Medication</th>
                        <th className="text-left px-4 py-2 font-medium">Form</th>
                        <th className="text-left px-4 py-2 font-medium">Dose</th>
                        <th className="text-left px-4 py-2 font-medium">Discontinued</th>
                        <th className="text-left px-4 py-2 font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {discontinuedMeds.map((med) => (
                        <tr key={med.id} className="border-b last:border-0 text-muted-foreground">
                          <td className="px-4 py-3">
                            <span className="line-through">{med.medicationName}</span>
                          </td>
                          <td className="px-4 py-3">
                            {med.form ? FORM_LABELS[med.form] ?? med.form : "—"}
                          </td>
                          <td className="px-4 py-3">{med.dose ?? "—"}</td>
                          <td className="px-4 py-3">{formatDate(med.endDate)}</td>
                          <td className="px-4 py-3">{med.discontinuedReason ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dialogs */}
      <AddMedicationForm
        serviceUserId={serviceUserId}
        open={addOpen}
        onOpenChange={(v) => { setAddOpen(v); if (!v) setEditMed(null); }}
        onSuccess={() => utils.medication.listForClient.invalidate({ serviceUserId })}
        editMedication={editMed ?? undefined}
      />

      {discontinueMed && (
        <DiscontinueForm
          medicationId={discontinueMed.id}
          medicationName={discontinueMed.medicationName}
          serviceUserId={serviceUserId}
          open={!!discontinueMed}
          onOpenChange={(v) => { if (!v) setDiscontinueMed(null); }}
          onSuccess={() => utils.medication.listForClient.invalidate({ serviceUserId })}
        />
      )}
    </div>
  );
}
