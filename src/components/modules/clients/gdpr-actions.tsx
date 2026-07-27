"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronDown, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { downloadJson } from "@/lib/download-json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const EXPORT_ROLES = ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"];
const ERASE_ROLES = ["ORG_ADMIN", "SUPER_ADMIN"];

interface GdprActionsProps {
  clientId: string;
  clientFullName: string;
}

export function GdprActions({ clientId, clientFullName }: GdprActionsProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const canExport = EXPORT_ROLES.includes(role);
  const canErase = ERASE_ROLES.includes(role);

  const [eraseOpen, setEraseOpen] = useState(false);
  const [confirmationName, setConfirmationName] = useState("");

  const utils = trpc.useUtils();

  async function handleExport() {
    try {
      const data = await utils.clients.exportData.fetch({ id: clientId });
      downloadJson(
        data,
        `service-user-export-${clientId}-${new Date().toISOString().split("T")[0]}.json`,
      );
      toast.success("Data export downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export data");
    }
  }

  const eraseMut = trpc.clients.eraseData.useMutation({
    onSuccess: () => {
      toast.success("Service user's data has been erased");
      setEraseOpen(false);
      setConfirmationName("");
      router.refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!canExport && !canErase) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Data
            <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canExport && (
            <DropdownMenuItem onClick={handleExport}>
              Export Data (GDPR)
            </DropdownMenuItem>
          )}
          {canErase && (
            <>
              {canExport && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => setEraseOpen(true)}
                className="text-destructive"
              >
                Erase Data (GDPR)…
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={eraseOpen}
        onOpenChange={(o) => {
          if (!o) {
            setEraseOpen(false);
            setConfirmationName("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Erase this service user&apos;s data?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This permanently anonymizes {clientFullName}&apos;s name, address,
              contact details, and other identifying fields. This cannot be
              undone. Linked records (incidents, medication history, audit
              trail) are kept for regulatory compliance but no longer show
              identifying details.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-name">
                Type <span className="font-medium">{clientFullName}</span> to confirm
              </Label>
              <Input
                id="confirm-name"
                value={confirmationName}
                onChange={(e) => setConfirmationName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEraseOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={
                  confirmationName.trim().toLowerCase() !== clientFullName.trim().toLowerCase() ||
                  eraseMut.isPending
                }
                onClick={() =>
                  eraseMut.mutate({ id: clientId, confirmationName })
                }
              >
                {eraseMut.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Erasing…</>
                ) : "Erase Data"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
