/**
 * IRota — interface contract for the external rota integration.
 * Your existing rota project must implement these methods to populate
 * rota_shifts and rota_availability tables.
 */

export interface DateRange {
  from: Date;
  to: Date;
}

export interface RotaShiftSummary {
  id: string;
  staffMemberId: string;
  serviceUserId: string | null;
  shiftDate: Date;
  startTime: string;
  endTime: string;
  status: string;
}

export interface IRota {
  getStaffSchedule(staffId: string, dateRange: DateRange): Promise<RotaShiftSummary[]>;
  getServiceUserVisits(serviceUserId: string, dateRange: DateRange): Promise<RotaShiftSummary[]>;
  getUnfilledShifts(dateRange: DateRange): Promise<RotaShiftSummary[]>;
  assignStaffToShift(shiftId: string, staffId: string): Promise<void>;
}
