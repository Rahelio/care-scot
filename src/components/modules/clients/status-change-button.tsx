"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ServiceUserStatus } from "@prisma/client";

const STATUS_LABELS: Record<ServiceUserStatus, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  DISCHARGED: "Discharged",
  DECEASED: "Deceased",
};

interface StatusChangeButtonProps {
  clientId: string;
  currentStatus: ServiceUserStatus;
}

export function StatusChangeButton({ clientId, currentStatus }: StatusChangeButtonProps) {
  const router = useRouter();
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<ServiceUserStatus | null>(null);

  // Discharge checklist state — items 1 & 3 auto-detected; null = no override
  const [override1, setOverride1] = useState<boolean | null>(null);
  const [checked2, setChecked2] = useState(false); // GP notified (manual only)
  const [override3, setOverride3] = useState<boolean | null>(null);
  const [checked4, setChecked4] = useState(false); // consent reviewed (manual only)
  const [dischargeDate, setDischargeDate] = useState("");
  const [dischargeReason, setDischargeReason] = useState("");

  // Queries to auto-populate checklist — enabled only when discharge dialog open
  const { data: careVisitsData } = trpc.clients.listCareVisits.useQuery(
    { serviceUserId: clientId, limit: 1 },
    { enabled: dischargeOpen }
  );

  const { data: agreements } = trpc.clients.listServiceAgreements.useQuery(
    { serviceUserId: clientId },
    { enabled: dischargeOpen }
  );

  // Derive checked state from data (user override wins if set)
  const autoCheck1 = careVisitsData !== undefined && careVisitsData.total > 0;
  const autoCheck3 = agreements !== undefined && agreements.some((a) => a.endDate != null);
  const checked1 = override1 !== null ? override1 : autoCheck1;
  const checked3 = override3 !== null ? override3 : autoCheck3;

  const updateStatusMut = trpc.clients.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      router.refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSimpleStatusChange(status: ServiceUserStatus) {
    setConfirmStatus(status);
  }

  function handleOpenDischarge() {
    setOverride1(null);
    setChecked2(false);
    setOverride3(null);
    setChecked4(false);
    setDischargeDate("");
    setDischargeReason("");
    setDischargeOpen(true);
  }

  function handleConfirmSimple() {
    if (!confirmStatus) return;
    updateStatusMut.mutate({ id: clientId, status: confirmStatus });
    setConfirmStatus(null);
  }

  function handleConfirmDischarge() {
    updateStatusMut.mutate({
      id: clientId,
      status: "DISCHARGED",
      dischargeDate: new Date(dischargeDate),
      dischargeReason: dischargeReason || undefined,
    });
    setDischargeOpen(false);
  }

  const allChecked = checked1 && checked2 && checked3 && checked4;
  const dischargeable = allChecked && dischargeDate;

  const isTerminal = currentStatus === "DISCHARGED" || currentStatus === "DECEASED";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Change Status
            <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isTerminal ? (
            <DropdownMenuItem onClick={() => handleSimpleStatusChange("ACTIVE")}>
              Reactivate
            </DropdownMenuItem>
          ) : (
            <>
              {currentStatus !== "ACTIVE" && (
                <DropdownMenuItem onClick={() => handleSimpleStatusChange("ACTIVE")}>
                  Set Active
                </DropdownMenuItem>
              )}
              {currentStatus !== "ON_HOLD" && (
                <DropdownMenuItem onClick={() => handleSimpleStatusChange("ON_HOLD")}>
                  Set On Hold
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleOpenDischarge}>
                Discharge…
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSimpleStatusChange("DECEASED")}
                className="text-destructive"
              >
                Mark as Deceased
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Simple confirm dialog */}
      <Dialog open={confirmStatus !== null} onOpenChange={(o) => { if (!o) setConfirmStatus(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Change status to {confirmStatus ? STATUS_LABELS[confirmStatus] : ""}?
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setConfirmStatus(null)}>Cancel</Button>
            <Button
              onClick={handleConfirmSimple}
              disabled={updateStatusMut.isPending}
            >
              {updateStatusMut.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
              ) : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discharge checklist dialog */}
      <Dialog open={dischargeOpen} onOpenChange={(o) => { if (!o) setDischargeOpen(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Discharge Checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Please complete the checklist before confirming discharge.
            </p>

            <div className="space-y-3">
              <ChecklistItem
                id="chk1"
                checked={checked1}
                onCheckedChange={setOverride1}
                label="Final care visit logged"
                hint={
                  careVisitsData !== undefined
                    ? careVisitsData.total > 0
                      ? `${careVisitsData.total} visit(s) on record`
                      : "No care visits recorded"
                    : undefined
                }
              />
              <ChecklistItem
                id="chk2"
                checked={checked2}
                onCheckedChange={setChecked2}
                label="GP / healthcare professionals notified"
              />
              <ChecklistItem
                id="chk3"
                checked={checked3}
                onCheckedChange={setOverride3}
                label="Service agreement closed"
                hint={
                  agreements !== undefined
                    ? agreements.some((a) => a.endDate != null)
                      ? "End date set on agreement"
                      : "No agreements with end date"
                    : undefined
                }
              />
              <ChecklistItem
                id="chk4"
                checked={checked4}
                onCheckedChange={setChecked4}
                label="Consent records reviewed"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="discharge-date">Discharge Date *</Label>
              <Input
                id="discharge-date"
                type="date"
                value={dischargeDate}
                onChange={(e) => setDischargeDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="discharge-reason">Discharge Reason (optional)</Label>
              <Textarea
                id="discharge-reason"
                rows={3}
                placeholder="Enter reason for discharge…"
                value={dischargeReason}
                onChange={(e) => setDischargeReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDischargeOpen(false)}>Cancel</Button>
              <Button
                disabled={!dischargeable || updateStatusMut.isPending}
                onClick={handleConfirmDischarge}
              >
                {updateStatusMut.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                ) : "Confirm Discharge"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChecklistItem({
  id,
  checked,
  onCheckedChange,
  label,
  hint,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(Boolean(v))}
        className="mt-0.5"
      />
      <div>
        <Label htmlFor={id} className="font-normal cursor-pointer leading-snug">
          {label}
        </Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}
