"use client";

import { Badge } from "@/components/ui/badge";
import { isSameDay } from "@/lib/date-helpers";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const ABSENCE_LABELS: Record<string, string> = {
  SICK: "Sick",
  HOLIDAY: "Holiday",
  UNAUTHORISED: "Unauthorised",
  OTHER: "Leave",
};

export interface StaffOption {
  id: string;
  firstName: string;
  lastName: string;
  area?: string | null;
}

export interface AvailabilityRow {
  staffMemberId: string;
  dayOfWeek: string;
  availableFrom: string;
  availableTo: string;
  isAvailable: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

export interface LeaveRow {
  staffMemberId: string;
  absenceType: string;
  startDate: Date;
  endDate: Date | null;
  approvedBy: string | null;
}

interface Props {
  weekDays: Date[];
  staff: StaffOption[];
  availability: AvailabilityRow[];
  leave: LeaveRow[];
}

function coversDate(effectiveFrom: Date, effectiveTo: Date | null, day: Date): boolean {
  return new Date(effectiveFrom) <= day && (!effectiveTo || new Date(effectiveTo) >= day);
}

export function StaffMatrix({ weekDays, staff, availability, leave }: Props) {
  if (staff.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">No active staff members found.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-muted/40">
            <th className="text-left font-medium px-3 py-2 sticky left-0 bg-muted/40">Staff</th>
            {weekDays.map((day, i) => (
              <th key={i} className="text-left font-medium px-3 py-2 min-w-[140px]">
                {DAY_LABELS[i]} {day.getDate()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <tr key={member.id} className="border-t">
              <td className="px-3 py-2 font-medium whitespace-nowrap sticky left-0 bg-background">
                {member.firstName} {member.lastName}
              </td>
              {weekDays.map((day, i) => {
                const dayOfWeek = DAY_OF_WEEK[i];
                const windows = availability.filter(
                  (a) => a.staffMemberId === member.id && a.dayOfWeek === dayOfWeek && coversDate(a.effectiveFrom, a.effectiveTo, day),
                );
                const onLeave = leave.filter(
                  (l) =>
                    l.staffMemberId === member.id &&
                    new Date(l.startDate) <= day &&
                    (!l.endDate || new Date(l.endDate) >= day) &&
                    (l.startDate <= day || isSameDay(new Date(l.startDate), day)),
                );

                return (
                  <td key={i} className="px-3 py-2 align-top">
                    <div className="flex flex-col gap-1">
                      {onLeave.map((l, idx) => (
                        <Badge key={idx} variant="outline" className="w-fit bg-red-50 text-red-700 border-red-200 text-[10px]">
                          {ABSENCE_LABELS[l.absenceType] ?? l.absenceType}
                          {!l.approvedBy && " (pending)"}
                        </Badge>
                      ))}
                      {windows.length === 0 && onLeave.length === 0 && (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                      {windows.map((w, idx) => (
                        <span
                          key={idx}
                          className={
                            w.isAvailable
                              ? "text-xs tabular-nums"
                              : "text-xs tabular-nums text-muted-foreground line-through"
                          }
                        >
                          {w.availableFrom}–{w.availableTo}
                        </span>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
