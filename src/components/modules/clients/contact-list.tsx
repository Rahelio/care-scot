"use client";

import { useState } from "react";
import { Plus, Trash2, Phone, Mail, Shield } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContactForm } from "./contact-form";

interface Contact {
  id: string;
  contactName: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  isNextOfKin: boolean;
  isEmergencyContact: boolean;
  hasPowerOfAttorney: boolean;
  poaType: string | null;
  isGuardian: boolean;
  notes: string | null;
}

interface ContactListProps {
  serviceUserId: string;
  contacts: Contact[];
}

export function ContactList({ serviceUserId, contacts }: ContactListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const utils = trpc.useUtils();

  const removeMutation = trpc.clients.removeContact.useMutation({
    onSuccess: () => {
      toast.success("Contact removed");
      utils.clients.getById.invalidate({ id: serviceUserId });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Contacts</h3>
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Contact
        </Button>
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
          No contacts added yet
        </p>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="rounded-lg border p-4 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{contact.contactName}</p>
                  {contact.relationship && (
                    <p className="text-sm text-muted-foreground">
                      {contact.relationship}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap gap-1">
                    {contact.isNextOfKin && (
                      <Badge variant="secondary" className="text-xs">
                        Next of Kin
                      </Badge>
                    )}
                    {contact.isEmergencyContact && (
                      <Badge variant="secondary" className="text-xs">
                        Emergency
                      </Badge>
                    )}
                    {contact.hasPowerOfAttorney && (
                      <Badge variant="outline" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        POA{contact.poaType ? ` (${contact.poaType})` : ""}
                      </Badge>
                    )}
                    {contact.isGuardian && (
                      <Badge variant="outline" className="text-xs">
                        Guardian
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMutation.mutate({ id: contact.id })}
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {contact.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {contact.phone}
                  </span>
                )}
                {contact.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {contact.email}
                  </span>
                )}
              </div>

              {contact.notes && (
                <p className="text-sm text-muted-foreground border-t pt-2">
                  {contact.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <ContactForm
        serviceUserId={serviceUserId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {}}
      />
    </div>
  );
}
