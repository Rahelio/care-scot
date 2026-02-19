"use client";

import { useState } from "react";
import { AlertTriangle, Plus, ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import { EquipmentCheckForm } from "./equipment-check-form";
import {
  EQUIPMENT_TYPE_LABELS,
  CHECK_RESULT_CONFIG,
} from "./incident-meta";

interface EquipmentCheckItem {
  id: string;
  equipmentType: string;
  equipmentName: string;
  serialNumber: string | null;
  location: string | null;
  checkDate: Date | string;
  checkResult: string;
  nextCheckDate: Date | string | null;
  notes: string | null;
  checkedByUser: { id: string; email: string } | null;
}

interface EquipmentChecksListProps {
  checks: EquipmentCheckItem[];
}

function isOverdue(nextCheckDate: Date | string | null): boolean {
  if (!nextCheckDate) return false;
  return new Date(nextCheckDate) < new Date();
}

export function EquipmentChecksList({ checks }: EquipmentChecksListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [prefill, setPrefill] = useState<{
    name?: string;
    type?: string;
    serial?: string;
    location?: string;
  }>({});

  if (checks.length === 0) {
    return (
      <>
        <div className="text-center py-12">
          <ClipboardCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">
            No equipment checks recorded yet.
          </p>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Record First Check
          </Button>
        </div>
        <EquipmentCheckForm
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      </>
    );
  }

  const overdueCount = checks.filter((c) =>
    isOverdue(c.nextCheckDate)
  ).length;

  return (
    <>
      <div className="space-y-3">
        {overdueCount > 0 && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 px-4 py-2.5">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">
              <strong>{overdueCount}</strong> equipment item
              {overdueCount !== 1 ? "s are" : " is"} overdue for their next
              check.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPrefill({});
              setFormOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Record Check
          </Button>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Last Check</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Checked By</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {checks.map((check) => {
                const overdue = isOverdue(check.nextCheckDate);
                const resultConfig = CHECK_RESULT_CONFIG[check.checkResult];

                return (
                  <TableRow
                    key={check.id}
                    className={
                      overdue
                        ? "bg-red-50/50 dark:bg-red-950/20"
                        : check.checkResult === "FAIL"
                          ? "bg-orange-50/30 dark:bg-orange-950/10"
                          : undefined
                    }
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">
                          {check.equipmentName}
                        </p>
                        {check.serialNumber && (
                          <p className="text-xs text-muted-foreground">
                            S/N: {check.serialNumber}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {EQUIPMENT_TYPE_LABELS[check.equipmentType] ??
                        check.equipmentType}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {check.location || "—"}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDate(check.checkDate)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${resultConfig?.badgeClass}`}
                      >
                        {resultConfig?.label ?? check.checkResult}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {check.nextCheckDate ? (
                        <span
                          className={`text-sm flex items-center gap-1 ${
                            overdue
                              ? "text-red-700 dark:text-red-400 font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {overdue && (
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          )}
                          {formatDate(check.nextCheckDate)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {check.checkedByUser?.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setPrefill({
                            name: check.equipmentName,
                            type: check.equipmentType,
                            serial: check.serialNumber ?? undefined,
                            location: check.location ?? undefined,
                          });
                          setFormOpen(true);
                        }}
                      >
                        Re-check
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <EquipmentCheckForm
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultEquipmentName={prefill.name}
        defaultEquipmentType={prefill.type}
        defaultSerialNumber={prefill.serial}
        defaultLocation={prefill.location}
      />
    </>
  );
}
