"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import {
  CI_NOTIFICATION_TYPE_LABELS,
  INCIDENT_TYPE_LABELS,
  SEVERITY_CONFIG,
} from "./incident-meta";

interface CiNotificationItem {
  id: string;
  notificationType: string;
  submittedDate: Date | string | null;
  careInspectorateReference: string | null;
  description: string | null;
  followUpCorrespondence: string | null;
  actionsTaken: string | null;
  createdAt: Date | string;
  incident: {
    id: string;
    incidentType: string;
    incidentDate: Date | string;
    severity: string;
  } | null;
}

interface CiNotificationsListProps {
  notifications: CiNotificationItem[];
}

function MarkSubmittedDialog({
  notification,
  open,
  onOpenChange,
}: {
  notification: CiNotificationItem;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const [submittedDate, setSubmittedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reference, setReference] = useState(
    notification.careInspectorateReference ?? ""
  );
  const [followUp, setFollowUp] = useState(
    notification.followUpCorrespondence ?? ""
  );

  const updateMutation = trpc.incidents.ciNotifications.update.useMutation({
    onSuccess: () => {
      toast.success("Notification marked as submitted.");
      utils.incidents.ciNotifications.list.invalidate();
      utils.incidents.ciNotifications.getPending.invalidate();
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(err.message || "Failed to update notification."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Submitted to Care Inspectorate</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium block mb-1.5">
              Submission Date
            </label>
            <Input
              type="date"
              value={submittedDate}
              onChange={(e) => setSubmittedDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">
              Care Inspectorate Reference (optional)
            </label>
            <Input
              placeholder="Reference number…"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">
              Follow-up Correspondence (optional)
            </label>
            <Textarea
              placeholder="Any follow-up communications or correspondence with CI…"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={updateMutation.isPending || !submittedDate}
            onClick={() =>
              updateMutation.mutate({
                id: notification.id,
                submittedDate,
                careInspectorateReference: reference || undefined,
                followUpCorrespondence: followUp || undefined,
              })
            }
          >
            {updateMutation.isPending ? "Saving…" : "Confirm Submission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CiNotificationsList({
  notifications,
}: CiNotificationsListProps) {
  const [markingId, setMarkingId] = useState<string | null>(null);

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No Care Inspectorate notifications recorded.
      </div>
    );
  }

  const selected = notifications.find((n) => n.id === markingId);

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Created</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Linked Incident</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.map((n) => {
              const isSubmitted = !!n.submittedDate;
              const sevCfg = n.incident
                ? SEVERITY_CONFIG[n.incident.severity]
                : null;

              return (
                <TableRow key={n.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDate(n.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {CI_NOTIFICATION_TYPE_LABELS[n.notificationType] ??
                      n.notificationType}
                  </TableCell>
                  <TableCell className="text-sm">
                    {n.incident ? (
                      <span className="flex items-center gap-1.5">
                        <LinkIcon className="h-3 w-3 text-muted-foreground" />
                        <span>
                          {INCIDENT_TYPE_LABELS[n.incident.incidentType] ??
                            n.incident.incidentType}{" "}
                          — {formatDate(n.incident.incidentDate)}
                        </span>
                        {sevCfg && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${sevCfg.badgeClass}`}
                          >
                            {sevCfg.label}
                          </Badge>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isSubmitted ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Submitted {formatDate(n.submittedDate!)}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                        <Clock className="h-3.5 w-3.5" />
                        Pending
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {n.careInspectorateReference || "—"}
                  </TableCell>
                  <TableCell>
                    {!isSubmitted && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setMarkingId(n.id)}
                      >
                        Mark Submitted
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selected && (
        <MarkSubmittedDialog
          notification={selected}
          open={!!markingId}
          onOpenChange={(v) => {
            if (!v) setMarkingId(null);
          }}
        />
      )}
    </>
  );
}
