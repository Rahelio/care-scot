"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/lib/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// z.boolean() — NOT z.boolean().default(false) — avoids input/output type split with zodResolver
const contactSchema = z.object({
  contactName: z.string().min(1, "Name required"),
  relationship: z.string().optional(),
  phone: z.string().optional(),
  isNextOfKin: z.boolean(),
  isEmergencyContact: z.boolean(),
});

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  dateOfBirth: z.string().min(1, "Required"),
  chiNumber: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  phonePrimary: z.string().optional(),
  phoneSecondary: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  gpName: z.string().optional(),
  gpPractice: z.string().optional(),
  gpPhone: z.string().optional(),
  communicationNeeds: z.string().optional(),
  languagePreference: z.string().optional(),
  interpreterRequired: z.boolean().optional(),
  culturalReligiousNeeds: z.string().optional(),
  dietaryRequirements: z.string().optional(),
  contacts: z.array(contactSchema),
});

type FormValues = z.infer<typeof schema>;

interface ServiceUserFormProps {
  defaultValues?: Partial<FormValues> & { id?: string };
  mode: "create" | "edit";
  clientId?: string;
}

export function ServiceUserForm({ defaultValues, mode, clientId }: ServiceUserFormProps) {
  const router = useRouter();
  const [chiToCheck, setChiToCheck] = useState("");
  const debouncedChi = useDebounce(chiToCheck, 300);

  const { data: chiCheck } = trpc.clients.checkChiNumber.useQuery(
    { chiNumber: debouncedChi, excludeId: mode === "edit" ? clientId : undefined },
    { enabled: debouncedChi.length > 0 }
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      contacts: [],
      interpreterRequired: false,
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contacts",
  });

  const createMutation = trpc.clients.create.useMutation();
  const updateMutation = trpc.clients.update.useMutation();
  const addContactMutation = trpc.clients.addContact.useMutation();

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    addContactMutation.isPending;

  async function onSubmit(values: FormValues) {
    const { contacts, ...coreValues } = values;
    const corePayload = {
      ...coreValues,
      dateOfBirth: new Date(coreValues.dateOfBirth),
      email: coreValues.email || undefined,
    };

    try {
      if (mode === "create") {
        const serviceUser = await createMutation.mutateAsync(corePayload);

        if (contacts.length > 0) {
          await Promise.all(
            contacts.map((contact) =>
              addContactMutation.mutateAsync({
                serviceUserId: serviceUser.id,
                ...contact,
              })
            )
          );
        }

        toast.success("Service user created");
        router.push(`/clients/${serviceUser.id}`);
      } else if (clientId) {
        await updateMutation.mutateAsync({ id: clientId, ...corePayload });
        toast.success("Service user updated");
        router.push(`/clients/${clientId}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Personal Details ──────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="chiNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CHI Number</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="0000000000"
                      onBlur={(e) => {
                        field.onBlur();
                        setChiToCheck(e.target.value.trim());
                      }}
                    />
                  </FormControl>
                  {chiCheck?.duplicate && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      This CHI number is already assigned to{" "}
                      <strong>{chiCheck.existingName}</strong>
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ── Contact Details ───────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="addressLine1"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Address Line 1</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="addressLine2"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Address Line 2</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City / Town</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="postcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postcode</FormLabel>
                  <FormControl>
                    <Input {...field} className="uppercase" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phonePrimary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneSecondary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secondary Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ── GP & Healthcare ───────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">GP &amp; Healthcare</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="gpName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GP Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gpPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GP Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gpPractice"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>GP Practice</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ── Communication & Preferences ───────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Communication &amp; Preferences</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="languagePreference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language Preference</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. English, Gaelic" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="interpreterRequired"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0 pt-6">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Interpreter required</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="communicationNeeds"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Communication Needs</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="culturalReligiousNeeds"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Cultural / Religious Needs</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dietaryRequirements"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Dietary Requirements</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ── Emergency Contacts (create mode only) ─────────── */}
        {mode === "create" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Emergency Contacts</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Optional — can also be added after creating the service user
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    contactName: "",
                    relationship: "",
                    phone: "",
                    isNextOfKin: false,
                    isEmergencyContact: false,
                  })
                }
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Contact
              </Button>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3 border rounded-lg">
                  No contacts added yet
                </p>
              ) : (
                <div className="space-y-3">
                  {fields.map((fieldItem, index) => (
                    <div
                      key={fieldItem.id}
                      className="rounded-lg border p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-muted-foreground">
                          Contact {index + 1}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`contacts.${index}.contactName`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name *</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`contacts.${index}.relationship`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Relationship</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g. Daughter" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`contacts.${index}.phone`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input type="tel" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex flex-col gap-2.5 justify-end pb-0.5">
                          <FormField
                            control={form.control}
                            name={`contacts.${index}.isNextOfKin`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center gap-2.5 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">Next of kin</FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`contacts.${index}.isEmergencyContact`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center gap-2.5 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">Emergency contact</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? mode === "create"
                ? "Creating…"
                : "Saving…"
              : mode === "create"
              ? "Create Service User"
              : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
