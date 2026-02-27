"use client";

import { useState } from "react";
import { Plus, X, Search, Link2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/lib/use-debounce";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HcpListProps {
  serviceUserId: string;
}

type Mode = "search-directory" | "add-new";

export function HcpList({ serviceUserId }: HcpListProps) {
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("search-directory");

  // Directory search state
  const [search, setSearch] = useState("");
  const [selectedSharedId, setSelectedSharedId] = useState<string | null>(null);
  const [linkNotes, setLinkNotes] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Add-new state
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newOrg, setNewOrg] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [saveToDirectory, setSaveToDirectory] = useState(true);

  const { data: hcps, isPending } = trpc.clients.listHealthcareProfessionals.useQuery({
    serviceUserId,
  });

  const { data: directoryResults } = trpc.clients.listSharedHCPs.useQuery(
    { search: debouncedSearch || undefined },
    { enabled: dialogOpen && mode === "search-directory" }
  );

  const linkMut = trpc.clients.linkHCP.useMutation({
    onSuccess: () => {
      toast.success("Healthcare professional linked");
      utils.clients.listHealthcareProfessionals.invalidate({ serviceUserId });
      closeAndReset();
    },
    onError: (err) => toast.error(err.message),
  });

  const createSharedMut = trpc.clients.createSharedHCP.useMutation({
    onSuccess: (shared) => {
      // Now link the newly created shared HCP
      linkMut.mutate({
        serviceUserId,
        sharedHcpId: shared.id,
        notes: newNotes || undefined,
      });
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMut = trpc.clients.removeHealthcareProfessional.useMutation({
    onSuccess: () => {
      toast.success("Healthcare professional removed");
      utils.clients.listHealthcareProfessionals.invalidate({ serviceUserId });
    },
    onError: (err) => toast.error(err.message),
  });

  function closeAndReset() {
    setDialogOpen(false);
    setMode("search-directory");
    setSearch("");
    setSelectedSharedId(null);
    setLinkNotes("");
    setNewName("");
    setNewRole("");
    setNewOrg("");
    setNewPhone("");
    setNewEmail("");
    setNewNotes("");
    setSaveToDirectory(true);
  }

  function handleLinkFromDirectory() {
    if (!selectedSharedId) return;
    linkMut.mutate({
      serviceUserId,
      sharedHcpId: selectedSharedId,
      notes: linkNotes || undefined,
    });
  }

  function handleAddNew() {
    if (!newName.trim()) return;
    if (saveToDirectory) {
      createSharedMut.mutate({
        professionalName: newName,
        role: newRole || undefined,
        organisation: newOrg || undefined,
        phone: newPhone || undefined,
        email: newEmail || undefined,
      });
    } else {
      linkMut.mutate({
        serviceUserId,
        professionalName: newName,
        role: newRole || undefined,
        organisation: newOrg || undefined,
        phone: newPhone || undefined,
        email: newEmail || undefined,
        notes: newNotes || undefined,
      });
    }
  }

  const isBusy = linkMut.isPending || createSharedMut.isPending;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Healthcare Professionals</CardTitle>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !hcps?.length ? (
            <p className="text-sm text-muted-foreground">No healthcare professionals linked.</p>
          ) : (
            <div className="space-y-2">
              {hcps.map((hcp) => (
                <div key={hcp.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{hcp.professionalName}</span>
                      {hcp.sharedHcpId && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-blue-50 text-blue-700 border-blue-200 gap-1"
                        >
                          <Link2 className="h-3 w-3" />
                          Linked
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-0.5">
                      {hcp.role && <span>{hcp.role}</span>}
                      {hcp.organisation && <span>{hcp.organisation}</span>}
                      {hcp.phone && <span>{hcp.phone}</span>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => removeMut.mutate({ id: hcp.id })}
                    disabled={removeMut.isPending}
                    title="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeAndReset(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Healthcare Professional</DialogTitle>
          </DialogHeader>

          {/* Mode switcher */}
          <div className="flex gap-1 p-1 bg-muted rounded-md">
            <button
              type="button"
              onClick={() => setMode("search-directory")}
              className={`flex-1 text-sm px-3 py-1.5 rounded transition-colors ${
                mode === "search-directory"
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Search Directory
            </button>
            <button
              type="button"
              onClick={() => setMode("add-new")}
              className={`flex-1 text-sm px-3 py-1.5 rounded transition-colors ${
                mode === "add-new"
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Add New
            </button>
          </div>

          {mode === "search-directory" ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, role or organisation…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSelectedSharedId(null); }}
                  className="pl-9"
                />
              </div>

              <div className="border rounded-md divide-y max-h-52 overflow-y-auto">
                {!directoryResults?.length ? (
                  <p className="text-sm text-muted-foreground p-4 text-center">
                    {search ? "No results found." : "Type to search the directory."}
                  </p>
                ) : (
                  directoryResults.map((hcp) => (
                    <button
                      key={hcp.id}
                      type="button"
                      onClick={() => setSelectedSharedId(hcp.id)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-muted ${
                        selectedSharedId === hcp.id ? "bg-muted font-medium" : ""
                      }`}
                    >
                      <p className="font-medium">{hcp.professionalName}</p>
                      <p className="text-xs text-muted-foreground">
                        {[hcp.role, hcp.organisation].filter(Boolean).join(" — ")}
                      </p>
                    </button>
                  ))
                )}
              </div>

              {selectedSharedId && (
                <div className="space-y-1.5">
                  <Label htmlFor="link-notes">Notes (optional)</Label>
                  <Textarea
                    id="link-notes"
                    placeholder="Any notes specific to this client…"
                    value={linkNotes}
                    onChange={(e) => setLinkNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={closeAndReset}>Cancel</Button>
                <Button
                  disabled={!selectedSharedId || isBusy}
                  onClick={handleLinkFromDirectory}
                >
                  {isBusy ? "Linking…" : "Link"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-name">Name *</Label>
                <Input
                  id="new-name"
                  placeholder="Dr. Jane Smith"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-role">Role</Label>
                  <Input id="new-role" placeholder="GP" value={newRole} onChange={(e) => setNewRole(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-org">Organisation</Label>
                  <Input id="new-org" placeholder="Surgery name" value={newOrg} onChange={(e) => setNewOrg(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-phone">Phone</Label>
                  <Input id="new-phone" type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-email">Email</Label>
                  <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-notes">Notes</Label>
                <Textarea id="new-notes" rows={2} value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="save-to-dir"
                  checked={saveToDirectory}
                  onCheckedChange={(v) => setSaveToDirectory(Boolean(v))}
                />
                <Label htmlFor="save-to-dir" className="font-normal cursor-pointer">
                  Save to shared directory (reuse across clients)
                </Label>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={closeAndReset}>Cancel</Button>
                <Button disabled={!newName.trim() || isBusy} onClick={handleAddNew}>
                  {isBusy ? "Saving…" : "Add"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
