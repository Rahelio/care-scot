"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordAdminDialog } from "./record-admin-dialog";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────

type Medication = {
  id: string;
  medicationName: string;
  dose: string | null;
  frequency: string | null;
  form: string | null;
  isPrn: boolean;
  isControlledDrug: boolean;
  prnReason: string | null;
  status: string;
};

type AdminRecord = {
  id: string;
  medicationId: string;
  scheduledDate: Date;
  scheduledTime: string;
  administered: boolean;
  refused: boolean;
  notAvailable: boolean;
  administeredAt: Date | null;
  doseGiven: string | null;
  refusedReason: string | null;
  notAvailableReason: string | null;
  prnReasonGiven: string | null;
  outcomeNotes: string | null;
  administeredByStaff: { id: string; firstName: string; lastName: string } | null;
  witness: { id: string; firstName: string; lastName: string } | null;
};

// ── Helpers ────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getMonthName(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function dayKey(date: Date): number {
  return new Date(date).getDate();
}

type CellStatus = "administered" | "refused" | "not_available" | "prn" | "empty" | "mixed";

function getCellStatus(records: AdminRecord[], isPrn: boolean): CellStatus {
  if (records.length === 0) return "empty";
  const administered = records.filter((r) => r.administered);
  const refused = records.filter((r) => r.refused);
  const notAvailable = records.filter((r) => r.notAvailable);
  if (isPrn) {
    // PRN: any administration = prn (blue)
    if (administered.length > 0) return "prn";
    if (refused.length > 0) return "refused";
    if (notAvailable.length > 0) return "not_available";
    return "empty";
  }
  if (refused.length > 0 && administered.length > 0) return "mixed";
  if (refused.length > 0) return "refused";
  if (notAvailable.length > 0) return "not_available";
  if (administered.length > 0) return "administered";
  return "empty";
}

function CellIcon({ status, count }: { status: CellStatus; count: number }) {
  const base = "text-xs font-bold select-none";
  if (status === "administered")
    return (
      <span className={cn(base, "text-green-700")}>
        {count > 1 ? `✓${count}` : "✓"}
      </span>
    );
  if (status === "prn")
    return (
      <span className={cn(base, "text-blue-700")}>
        {count > 1 ? `P${count}` : "P"}
      </span>
    );
  if (status === "refused")
    return <span className={cn(base, "text-red-700")}>✗</span>;
  if (status === "not_available")
    return <span className={cn(base, "text-orange-600")}>!</span>;
  if (status === "mixed")
    return <span className={cn(base, "text-amber-700")}>~</span>;
  return null;
}

const CELL_BG: Record<CellStatus, string> = {
  administered: "bg-green-50 hover:bg-green-100 border-green-200",
  prn: "bg-blue-50 hover:bg-blue-100 border-blue-200",
  refused: "bg-red-50 hover:bg-red-100 border-red-200",
  not_available: "bg-orange-50 hover:bg-orange-100 border-orange-200",
  mixed: "bg-amber-50 hover:bg-amber-100 border-amber-200",
  empty: "bg-white hover:bg-muted/50 border-transparent",
};

// ── Main component ─────────────────────────────────────────────────────

interface MarChartProps {
  serviceUserId: string;
}

export function MarChart({ serviceUserId }: MarChartProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-based

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedDayRecords, setSelectedDayRecords] = useState<AdminRecord[]>([]);

  const { data, isPending, refetch } = trpc.medication.getMarByMonth.useQuery({
    serviceUserId,
    year,
    month,
  });

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const todayDay =
    today.getFullYear() === year && today.getMonth() + 1 === month ? today.getDate() : null;

  const medications: Medication[] = (data?.medications ?? []) as Medication[];
  const records: AdminRecord[] = (data?.records ?? []) as AdminRecord[];

  // Group records by medicationId → day
  const recordMap = new Map<string, Map<number, AdminRecord[]>>();
  for (const rec of records) {
    if (!recordMap.has(rec.medicationId)) {
      recordMap.set(rec.medicationId, new Map());
    }
    const day = dayKey(rec.scheduledDate);
    const byDay = recordMap.get(rec.medicationId)!;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(rec);
  }

  function openCell(med: Medication, day: number) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayRecords = recordMap.get(med.id)?.get(day) ?? [];
    setSelectedMed(med);
    setSelectedDate(dateStr);
    setSelectedDayRecords(dayRecords);
    setDialogOpen(true);
  }

  // Separate regular and PRN meds
  const regularMeds = medications.filter((m) => !m.isPrn);
  const prnMeds = medications.filter((m) => m.isPrn);

  // All PRN records for the month (administered)
  const prnRecords = records.filter(
    (r) => r.administered && r.prnReasonGiven
  );

  if (isPending) {
    return (
      <div className="py-12 text-center text-muted-foreground">Loading MAR chart…</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-base font-semibold min-w-[180px] text-center">
          {getMonthName(year, month)}
        </span>
        <Button variant="outline" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded border border-green-200 bg-green-50 flex items-center justify-center font-bold text-green-700">✓</span>
          Administered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded border border-red-200 bg-red-50 flex items-center justify-center font-bold text-red-700">✗</span>
          Refused
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded border border-orange-200 bg-orange-50 flex items-center justify-center font-bold text-orange-600">!</span>
          Not available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded border border-blue-200 bg-blue-50 flex items-center justify-center font-bold text-blue-700">P</span>
          PRN given
        </span>
      </div>

      {/* Regular medications grid */}
      {regularMeds.length === 0 && prnMeds.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No active medications.
          </CardContent>
        </Card>
      ) : (
        <>
          {regularMeds.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="sticky left-0 z-10 bg-muted/50 text-left px-3 py-2 font-semibold text-sm min-w-[200px] border-b border-r">
                      Medication
                    </th>
                    {days.map((d) => (
                      <th
                        key={d}
                        className={cn(
                          "w-9 text-center py-2 border-b font-medium",
                          d === todayDay
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground"
                        )}
                      >
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {regularMeds.map((med) => (
                    <tr key={med.id} className="border-b last:border-0 group">
                      {/* Medication name cell */}
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-muted/30 border-r px-3 py-2 transition-colors">
                        <div className="flex items-start gap-1.5 flex-wrap">
                          <span className="font-medium text-sm leading-tight">
                            {med.medicationName}
                          </span>
                          {med.isControlledDrug && (
                            <Badge className="text-[10px] px-1 py-0 h-4 bg-red-100 text-red-800 border-red-200">
                              CD
                            </Badge>
                          )}
                        </div>
                        {(med.dose || med.frequency) && (
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                            {[med.dose, med.frequency].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </td>
                      {/* Day cells */}
                      {days.map((d) => {
                        const dayRecs = recordMap.get(med.id)?.get(d) ?? [];
                        const status = getCellStatus(dayRecs, med.isPrn);
                        const isFuture =
                          todayDay !== null
                            ? d > todayDay
                            : false;
                        return (
                          <td key={d} className="p-0.5">
                            <button
                              onClick={() => openCell(med, d)}
                              disabled={isFuture && status === "empty"}
                              className={cn(
                                "w-full h-8 rounded border flex items-center justify-center transition-colors",
                                CELL_BG[status],
                                isFuture && status === "empty"
                                  ? "opacity-30 cursor-default"
                                  : "cursor-pointer",
                                d === todayDay && "ring-1 ring-primary/30"
                              )}
                              title={
                                dayRecs.length > 0
                                  ? dayRecs
                                      .map((r) =>
                                        r.administered
                                          ? `Given${r.doseGiven ? " " + r.doseGiven : ""}`
                                          : r.refused
                                          ? `Refused${r.refusedReason ? ": " + r.refusedReason : ""}`
                                          : "Not available"
                                      )
                                      .join("; ")
                                  : undefined
                              }
                            >
                              <CellIcon status={status} count={dayRecs.length} />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PRN medications grid */}
          {prnMeds.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                PRN Medications
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  {prnMeds.length}
                </Badge>
              </h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-blue-50/50">
                      <th className="sticky left-0 z-10 bg-blue-50/50 text-left px-3 py-2 font-semibold text-sm min-w-[200px] border-b border-r">
                        PRN Medication
                      </th>
                      {days.map((d) => (
                        <th
                          key={d}
                          className={cn(
                            "w-9 text-center py-2 border-b font-medium",
                            d === todayDay
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground"
                          )}
                        >
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {prnMeds.map((med) => (
                      <tr key={med.id} className="border-b last:border-0 group">
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-muted/30 border-r px-3 py-2 transition-colors">
                          <div className="flex items-start gap-1.5 flex-wrap">
                            <span className="font-medium text-sm leading-tight">
                              {med.medicationName}
                            </span>
                            {med.isControlledDrug && (
                              <Badge className="text-[10px] px-1 py-0 h-4 bg-red-100 text-red-800 border-red-200">
                                CD
                              </Badge>
                            )}
                          </div>
                          {med.prnReason && (
                            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                              {med.prnReason}
                            </p>
                          )}
                        </td>
                        {days.map((d) => {
                          const dayRecs = recordMap.get(med.id)?.get(d) ?? [];
                          const status = getCellStatus(dayRecs, true);
                          const isFuture = todayDay !== null ? d > todayDay : false;
                          return (
                            <td key={d} className="p-0.5">
                              <button
                                onClick={() => openCell(med, d)}
                                disabled={isFuture}
                                className={cn(
                                  "w-full h-8 rounded border flex items-center justify-center transition-colors",
                                  CELL_BG[status],
                                  isFuture
                                    ? "opacity-30 cursor-default"
                                    : "cursor-pointer",
                                  d === todayDay && "ring-1 ring-primary/30"
                                )}
                              >
                                <CellIcon status={status} count={dayRecs.length} />
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PRN Administration Log */}
          {prnRecords.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  PRN Administration Log — {getMonthName(year, month)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-4 py-2 font-medium">Date</th>
                        <th className="text-left px-4 py-2 font-medium">Medication</th>
                        <th className="text-left px-4 py-2 font-medium">Time</th>
                        <th className="text-left px-4 py-2 font-medium">Reason</th>
                        <th className="text-left px-4 py-2 font-medium">Dose</th>
                        <th className="text-left px-4 py-2 font-medium">By</th>
                        <th className="text-left px-4 py-2 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prnRecords.map((rec) => {
                        const med = medications.find((m) => m.id === rec.medicationId);
                        return (
                          <tr key={rec.id} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-2 whitespace-nowrap">
                              {new Date(rec.scheduledDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </td>
                            <td className="px-4 py-2">
                              {med?.medicationName ?? "—"}
                              {med?.dose && (
                                <span className="text-muted-foreground"> {med.dose}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 font-mono whitespace-nowrap">
                              {rec.scheduledTime}
                            </td>
                            <td className="px-4 py-2">{rec.prnReasonGiven ?? "—"}</td>
                            <td className="px-4 py-2">{rec.doseGiven ?? "—"}</td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              {rec.administeredByStaff
                                ? `${rec.administeredByStaff.firstName} ${rec.administeredByStaff.lastName}`
                                : "—"}
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">
                              {rec.outcomeNotes ?? "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <RecordAdminDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        serviceUserId={serviceUserId}
        medication={selectedMed}
        date={selectedDate}
        existingRecords={selectedDayRecords}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
