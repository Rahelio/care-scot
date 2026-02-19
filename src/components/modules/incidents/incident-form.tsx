"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { INCIDENT_TYPE_LABELS, SEVERITY_CONFIG } from "./incident-meta";

const INCIDENT_TYPES = Object.entries(INCIDENT_TYPE_LABELS);

const schema = z.object({
  incidentType: z.string().min(1, "Incident type is required"),
  incidentDate: z.string().min(1, "Date is required"),
  incidentTime: z.string().optional(),
  location: z.string().optional(),
  serviceUserId: z.string().optional(),
  staffMemberId: z.string().optional(),
  severity: z.string().min(1, "Severity is required"),
  description: z.string().min(1, "Description is required"),
  witnesses: z.string().optional(),
  immediateActionTaken: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface IncidentFormProps {
  defaultServiceUserId?: string;
  defaultServiceUserName?: string;
  onSuccess?: (id: string) => void;
}

export function IncidentForm({
  defaultServiceUserId,
  defaultServiceUserName,
  onSuccess,
}: IncidentFormProps) {
  const router = useRouter();

  const { data: clientsData } = trpc.clients.list.useQuery({
    status: "ACTIVE",
    limit: 200,
  });
  const clients = clientsData?.items ?? [];

  const createMutation = trpc.incidents.create.useMutation({
    onSuccess: (data) => {
      toast.success("Incident reported successfully.");
      if (onSuccess) {
        onSuccess(data.id);
      } else {
        router.push(`/incidents/${data.id}`);
      }
    },
    onError: (err) => toast.error(err.message || "Failed to submit incident."),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      incidentType: "",
      incidentDate: new Date().toISOString().split("T")[0],
      incidentTime: "",
      location: "",
      serviceUserId: defaultServiceUserId ?? "",
      staffMemberId: "",
      severity: "",
      description: "",
      witnesses: "",
      immediateActionTaken: "",
    },
  });

  const severity = form.watch("severity");
  const incidentType = form.watch("incidentType");

  const isHighSeverity = severity === "HIGH" || severity === "CRITICAL";
  const triggersCiNotification =
    incidentType === "DEATH" ||
    incidentType === "INFECTIOUS_OUTBREAK" ||
    ((incidentType === "ASSAULT" || incidentType === "SAFEGUARDING") &&
      isHighSeverity);

  async function onSubmit(values: FormValues) {
    await createMutation.mutateAsync({
      serviceUserId: values.serviceUserId || undefined,
      staffMemberId: values.staffMemberId || undefined,
      incidentType: values.incidentType as never,
      incidentDate: values.incidentDate,
      incidentTime: values.incidentTime || undefined,
      location: values.location || undefined,
      severity: values.severity as never,
      description: values.description,
      witnesses: values.witnesses || undefined,
      immediateActionTaken: values.immediateActionTaken || undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Type + Date/Time row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="incidentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Incident Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INCIDENT_TYPES.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="severity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Severity</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(SEVERITY_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="incidentDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Incident</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="incidentTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time (optional)</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* High / Critical warning banner */}
        {isHighSeverity && (
          <Card
            className={`border-2 ${
              severity === "CRITICAL"
                ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                : "border-orange-400 bg-orange-50 dark:bg-orange-950/20"
            }`}
          >
            <CardContent className="flex gap-3 py-4 px-4">
              <TriangleAlert
                className={`h-5 w-5 shrink-0 mt-0.5 ${
                  severity === "CRITICAL"
                    ? "text-red-600"
                    : "text-orange-600"
                }`}
              />
              <div className="space-y-1">
                <p
                  className={`text-sm font-semibold ${
                    severity === "CRITICAL" ? "text-red-700" : "text-orange-700"
                  }`}
                >
                  {severity === "CRITICAL" ? "Critical" : "High"} Severity
                  Incident
                  {triggersCiNotification && " — CI Notification Required"}
                </p>
                <p
                  className={`text-sm ${
                    severity === "CRITICAL"
                      ? "text-red-600/80"
                      : "text-orange-600/80"
                  }`}
                >
                  {triggersCiNotification
                    ? "This incident will automatically generate a Care Inspectorate notification draft and alert your management team."
                    : "This severity level will alert your management team on submission."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input
                  placeholder="Where did this incident occur?"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Service User */}
        {defaultServiceUserId ? (
          <div className="rounded-md border px-4 py-3 text-sm bg-muted/30">
            <span className="text-muted-foreground">Service user: </span>
            <span className="font-medium">{defaultServiceUserName}</span>
          </div>
        ) : (
          <FormField
            control={form.control}
            name="serviceUserId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service User (optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service user…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">— Not linked to a service user —</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what happened in detail — include any relevant context, contributing factors, and the sequence of events…"
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="witnesses"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Witnesses (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Names of any witnesses present…"
                  className="min-h-[60px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="immediateActionTaken"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Immediate Action Taken (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What immediate steps were taken in response to this incident?"
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={createMutation.isPending}
            variant={severity === "CRITICAL" ? "destructive" : "default"}
          >
            {createMutation.isPending ? "Submitting…" : "Submit Incident Report"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
