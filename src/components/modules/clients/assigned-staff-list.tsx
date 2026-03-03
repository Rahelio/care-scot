"use client";

import { useState } from "react";
import { UserPlus, Star, X, Search } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AssignedStaffListProps {
  serviceUserId: string;
}

type AssignRole = "KEY_WORKER" | "REGULAR_CARER";

export function AssignedStaffList({ serviceUserId }: AssignedStaffListProps) {
  const utils = trpc.useUtils();
  const [assignOpen, setAssignOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AssignRole>("REGULAR_CARER");

  const { data: assignments, isPending } = trpc.clients.listAssignedStaff.useQuery({
    serviceUserId,
  });

  const { data: staffData } = trpc.staff.list.useQuery(
    { status: "ACTIVE", search: search || undefined, limit: 50 },
    { enabled: assignOpen }
  );

  const assignMut = trpc.clients.assignStaff.useMutation({
    onSuccess: () => {
      toast.success("Staff assigned");
      utils.clients.listAssignedStaff.invalidate({ serviceUserId });
      setAssignOpen(false);
      setSelectedStaffId(null);
      setSearch("");
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMut = trpc.clients.removeStaffAssignment.useMutation({
    onSuccess: () => {
      toast.success("Assignment removed");
      utils.clients.listAssignedStaff.invalidate({ serviceUserId });
    },
    onError: (err) => toast.error(err.message),
  });

  const assignedIds = new Set((assignments ?? []).map((a) => a.staffMemberId));
  const availableStaff = (staffData?.items ?? []).filter((s) => !assignedIds.has(s.id));

  const keyWorkers = (assignments ?? []).filter((a) => a.role === "KEY_WORKER");
  const regularCarers = (assignments ?? []).filter((a) => a.role === "REGULAR_CARER");

  function handleAssign() {
    if (!selectedStaffId) return;
    assignMut.mutate({ serviceUserId, staffMemberId: selectedStaffId, role: selectedRole });
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Assigned Staff</CardTitle>
            <Button size="sm" onClick={() => setAssignOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Staff
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : assignments?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff assigned to this service user.</p>
          ) : (
            <div className="space-y-3">
              {keyWorkers.length > 0 && (
                <div className="space-y-2">
                  {keyWorkers.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {a.staffMember.firstName} {a.staffMember.lastName}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs bg-amber-50 text-amber-800 border-amber-200 shrink-0"
                        >
                          Key Worker
                        </Badge>
                        {a.staffMember.jobTitle && (
                          <span className="text-xs text-muted-foreground truncate hidden sm:block">
                            {a.staffMember.jobTitle}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeMut.mutate({ id: a.id })}
                        disabled={removeMut.isPending}
                        title="Remove assignment"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {regularCarers.length > 0 && (
                <div className="space-y-2">
                  {regularCarers.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm truncate">
                          {a.staffMember.firstName} {a.staffMember.lastName}
                        </span>
                        {a.staffMember.jobTitle && (
                          <span className="text-xs text-muted-foreground truncate hidden sm:block">
                            {a.staffMember.jobTitle}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeMut.mutate({ id: a.id })}
                        disabled={removeMut.isPending}
                        title="Remove assignment"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedStaffId(null);
                }}
                className="pl-9"
              />
            </div>

            <div className="border rounded-md divide-y max-h-52 overflow-y-auto">
              {availableStaff.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">
                  {search ? "No staff found." : "All active staff are already assigned."}
                </p>
              ) : (
                availableStaff.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStaffId(s.id)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-muted ${
                      selectedStaffId === s.id ? "bg-muted font-medium" : ""
                    }`}
                  >
                    <span>
                      {s.firstName} {s.lastName}
                    </span>
                    {s.jobTitle && (
                      <span className="text-muted-foreground ml-2 text-xs">{s.jobTitle}</span>
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Role</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={selectedRole === "KEY_WORKER" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedRole("KEY_WORKER")}
                >
                  <Star className="h-3.5 w-3.5 mr-1.5" />
                  Key Worker
                </Button>
                <Button
                  type="button"
                  variant={selectedRole === "REGULAR_CARER" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedRole("REGULAR_CARER")}
                >
                  Regular Carer
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setAssignOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!selectedStaffId || assignMut.isPending}
                onClick={handleAssign}
              >
                {assignMut.isPending ? "Assigning…" : "Assign"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
