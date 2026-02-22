"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Minus, Download } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { downloadCsv } from "@/lib/download-csv";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TRAINING_LABELS,
  MANDATORY_BY_ROLE,
  computeTrainingStatus,
  type TrainingStatus,
} from "@/server/services/staff/training-config";
import { StaffRoleType } from "@prisma/client";

// ── Role display labels ───────────────────────────────────────────────────────

const ROLE_LABELS: Record<StaffRoleType, string> = {
  CARER: "Carer",
  SENIOR_CARER: "Senior Carer",
  NURSE: "Nurse",
  COORDINATOR: "Coordinator",
  MANAGER: "Manager",
  ADMIN: "Admin",
  OTHER: "Other",
};

// ── Cell component ────────────────────────────────────────────────────────────

function MatrixCell({
  status,
  isMandatory,
}: {
  status: TrainingStatus | "not_required";
  isMandatory: boolean;
}) {
  if (!isMandatory || status === "not_required") {
    return (
      <td className="border border-border px-2 py-1.5 text-center">
        <Minus className="h-3.5 w-3.5 text-muted-foreground/30 mx-auto" />
      </td>
    );
  }

  const classes: Record<string, string> = {
    up_to_date: "bg-green-50",
    expiring: "bg-amber-50",
    expired: "bg-red-50",
    missing: "bg-muted/50",
  };

  const icons: Record<string, React.ReactNode> = {
    up_to_date: <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />,
    expiring: <Clock className="h-4 w-4 text-amber-600 mx-auto" />,
    expired: <XCircle className="h-4 w-4 text-destructive mx-auto" />,
    missing: <Minus className="h-4 w-4 text-muted-foreground mx-auto" />,
  };

  return (
    <td className={`border border-border px-2 py-1.5 text-center ${classes[status] ?? ""}`}>
      {icons[status]}
    </td>
  );
}

// ── Summary stats ─────────────────────────────────────────────────────────────

function SummaryStats({
  staff,
  columns,
}: {
  staff: Array<{
    id: string;
    mandatory: string[];
    trainingRecords: Array<{ trainingType: string; expiryDate: Date | null }>;
  }>;
  columns: string[];
}) {
  let total = 0;
  let upToDate = 0;
  let expiring = 0;
  let expired = 0;
  let missing = 0;

  for (const member of staff) {
    for (const col of columns) {
      if (!(member.mandatory as string[]).includes(col)) continue;
      total++;
      const match = member.trainingRecords.find((r) => r.trainingType === col);
      if (!match) {
        missing++;
      } else {
        const s = computeTrainingStatus(match.expiryDate);
        if (s === "up_to_date") upToDate++;
        else if (s === "expiring") expiring++;
        else expired++;
      }
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Up to date", value: upToDate, cls: "text-green-700 bg-green-50 border-green-200" },
        { label: "Expiring soon", value: expiring, cls: "text-amber-700 bg-amber-50 border-amber-200" },
        { label: "Expired", value: expired, cls: "text-destructive bg-red-50 border-red-200" },
        { label: "Missing", value: missing, cls: "text-muted-foreground bg-muted/50 border-border" },
      ].map((stat) => (
        <div
          key={stat.label}
          className={`rounded-md border px-4 py-3 ${stat.cls}`}
        >
          <p className="text-2xl font-bold">{stat.value}</p>
          <p className="text-xs font-medium mt-0.5">{stat.label}</p>
          {total > 0 && (
            <p className="text-xs opacity-70">{Math.round((stat.value / total) * 100)}% of {total}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TrainingMatrixPage() {
  const [roleFilter, setRoleFilter] = useState<StaffRoleType | "ALL">("ALL");

  const { data, isLoading } = trpc.staff.training.getMatrix.useQuery({
    roleType: roleFilter === "ALL" ? undefined : roleFilter,
  });

  const staffList = data?.staff ?? [];
  const columns: string[] = data?.columns ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/staff"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Training Matrix</h1>
          <p className="text-sm text-muted-foreground">
            Mandatory training status for all active staff
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Select
            value={roleFilter}
            onValueChange={(v) => setRoleFilter(v as StaffRoleType | "ALL")}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              {(Object.keys(ROLE_LABELS) as StaffRoleType[]).map((r) => (
                <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ExportMatrixButton />
          <Button variant="outline" size="sm" asChild>
            <Link href="/staff/expiry">Expiry Dashboard</Link>
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-sm">
        <span className="text-muted-foreground font-medium">Legend:</span>
        {[
          { icon: <CheckCircle2 className="h-4 w-4 text-green-600" />, label: "Up to date" },
          { icon: <Clock className="h-4 w-4 text-amber-600" />, label: "Expiring ≤90 days" },
          { icon: <XCircle className="h-4 w-4 text-destructive" />, label: "Expired" },
          { icon: <Minus className="h-4 w-4 text-muted-foreground" />, label: "Missing" },
          { icon: <Minus className="h-4 w-4 text-muted-foreground/30" />, label: "Not required" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            {item.icon}
            {item.label}
          </span>
        ))}
      </div>

      {/* Stats */}
      {staffList.length > 0 && (
        <SummaryStats
          staff={staffList as Parameters<typeof SummaryStats>[0]["staff"]}
          columns={columns}
        />
      )}

      {/* Matrix */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              Loading matrix…
            </div>
          ) : staffList.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              No active staff found
              {roleFilter !== "ALL" ? ` for role: ${ROLE_LABELS[roleFilter as StaffRoleType]}` : ""}.
            </div>
          ) : (
            <table className="w-full text-sm border-collapse min-w-max">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border border-border px-3 py-2 text-left font-medium sticky left-0 bg-muted/50 min-w-[160px]">
                    Staff Member
                  </th>
                  <th className="border border-border px-2 py-2 text-left font-medium min-w-[100px]">
                    Role
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="border border-border px-2 py-2 text-center font-medium min-w-[100px] max-w-[110px]"
                      title={TRAINING_LABELS[col as keyof typeof TRAINING_LABELS]}
                    >
                      <span className="block text-xs leading-tight line-clamp-2">
                        {TRAINING_LABELS[col as keyof typeof TRAINING_LABELS] ?? col}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffList.map((member) => (
                  <tr key={member.id} className="hover:bg-muted/20">
                    <td className="border border-border px-3 py-1.5 font-medium sticky left-0 bg-background">
                      <Link
                        href={`/staff/${member.id}/training`}
                        className="hover:underline text-primary"
                      >
                        {member.lastName}, {member.firstName}
                      </Link>
                    </td>
                    <td className="border border-border px-2 py-1.5">
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {ROLE_LABELS[member.roleType] ?? member.roleType}
                      </Badge>
                    </td>
                    {columns.map((col) => {
                      const isMandatory = (member.mandatory as string[]).includes(col);
                      if (!isMandatory) {
                        return (
                          <MatrixCell
                            key={col}
                            status="not_required"
                            isMandatory={false}
                          />
                        );
                      }
                      const match = member.trainingRecords.find(
                        (r) => r.trainingType === col
                      );
                      const status: TrainingStatus = match
                        ? computeTrainingStatus(match.expiryDate)
                        : "missing";
                      return (
                        <MatrixCell key={col} status={status} isMandatory={true} />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ExportMatrixButton() {
  const [exporting, setExporting] = useState(false);
  const { data } = trpc.reports.exportTrainingMatrix.useQuery(undefined, {
    enabled: exporting,
    staleTime: 0,
  });

  useEffect(() => {
    if (data && exporting) {
      downloadCsv(data.csv, data.filename);
      setTimeout(() => {
        setExporting(false);
      }, 0);
    }
  }, [data, exporting]);

  return (
    <Button variant="outline" size="sm" onClick={() => setExporting(true)} disabled={exporting}>
      <Download className="h-4 w-4 mr-1.5" />
      {exporting ? "Exporting…" : "Export CSV"}
    </Button>
  );
}
