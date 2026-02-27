"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ContactList } from "@/components/modules/clients/contact-list";
import { AssignedStaffList } from "@/components/modules/clients/assigned-staff-list";
import { formatDate } from "@/lib/utils";

export default function ClientPersonalInfoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: client, isPending, isError, error } = trpc.clients.getById.useQuery({ id });

  if (isPending) {
    return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
  }

  if (isError) {
    return (
      <div className="py-8 text-center text-destructive">
        <p className="font-medium">Failed to load client details</p>
        <p className="text-sm mt-1 text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (!client) return null;

  const fullAddress = [
    client.addressLine1,
    client.addressLine2,
    client.city,
    client.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="max-w-3xl space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Full Name" value={`${client.firstName} ${client.lastName}`} />
            <Row label="Date of Birth" value={formatDate(client.dateOfBirth)} />
            <Row label="CHI Number" value={client.chiNumber} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Address" value={fullAddress || undefined} />
            <Row label="Primary Phone" value={client.phonePrimary} />
            <Row label="Secondary Phone" value={client.phoneSecondary} />
            <Row label="Email" value={client.email} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">GP Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="GP Name" value={client.gpName} />
            <Row label="Practice" value={client.gpPractice} />
            <Row label="GP Phone" value={client.gpPhone} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferences &amp; Needs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Language" value={client.languagePreference} />
            <Row
              label="Interpreter"
              value={
                client.interpreterRequired != null
                  ? client.interpreterRequired
                    ? "Required"
                    : "Not required"
                  : undefined
              }
            />
            <Row label="Communication Needs" value={client.communicationNeeds} />
            <Row label="Cultural / Religious" value={client.culturalReligiousNeeds} />
            <Row label="Dietary Requirements" value={client.dietaryRequirements} />
          </CardContent>
        </Card>
      </div>

      {client.dailyRoutinePreferences && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Routine Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{client.dailyRoutinePreferences}</p>
          </CardContent>
        </Card>
      )}

      {client.advanceCarePlan && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Advance Care Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{client.advanceCarePlan}</p>
          </CardContent>
        </Card>
      )}

      <Separator />

      <ContactList serviceUserId={id} contacts={client.contacts} />

      <Separator />

      <AssignedStaffList serviceUserId={id} />

      {client.healthcareProfessionals.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="font-medium">Healthcare Professionals</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {client.healthcareProfessionals.map((hp) => (
                <Card key={hp.id}>
                  <CardContent className="p-4 text-sm space-y-1">
                    <p className="font-medium">{hp.professionalName}</p>
                    {hp.role && <p className="text-muted-foreground">{hp.role}</p>}
                    {hp.organisation && <p className="text-muted-foreground">{hp.organisation}</p>}
                    {hp.phone && <p>{hp.phone}</p>}
                    {hp.email && <p className="text-muted-foreground">{hp.email}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right">{value ?? "—"}</span>
    </div>
  );
}
