"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Clock, Shield } from "lucide-react";
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
import { SAFEGUARDING_TYPE_LABELS } from "./incident-meta";

const schema = z.object({
  serviceUserId: z.string().uuid("Service user is required"),
  concernDate: z.string().min(1, "Date is required"),
  concernType: z.string().min(1, "Concern type is required"),
  description: z.string().min(1, "Description is required"),
  referredTo: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface SafeguardingFormProps {
  defaultServiceUserId?: string;
  defaultServiceUserName?: string;
  onSuccess?: (id: string) => void;
}

export function SafeguardingForm({
  defaultServiceUserId,
  defaultServiceUserName,
  onSuccess,
}: SafeguardingFormProps) {
  const router = useRouter();

  const { data: clientsData } = trpc.clients.list.useQuery({
    status: "ACTIVE",
    limit: 200,
  });
  const clients = clientsData?.items ?? [];

  const createMutation = trpc.incidents.safeguarding.create.useMutation({
    onSuccess: (data) => {
      toast.success("Safeguarding concern raised. Management team has been alerted.");
      if (onSuccess) {
        onSuccess(data.id);
      } else {
        router.push(`/incidents/safeguarding/${data.id}`);
      }
    },
    onError: (err) =>
      toast.error(err.message || "Failed to submit safeguarding concern."),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      serviceUserId: defaultServiceUserId ?? "",
      concernDate: new Date().toISOString().split("T")[0],
      concernType: "",
      description: "",
      referredTo: "",
    },
  });

  async function onSubmit(values: FormValues) {
    await createMutation.mutateAsync({
      serviceUserId: values.serviceUserId,
      concernDate: values.concernDate,
      concernType: values.concernType,
      description: values.description,
      referredTo: values.referredTo || undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* 24h escalation warning */}
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="flex gap-3 py-4 px-4">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                24-Hour Escalation Required
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Safeguarding concerns must be escalated to Adult Support &
                Protection within 24 hours. Management will be notified
                immediately. If the individual is in immediate danger, contact
                emergency services first.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Service User */}
        {defaultServiceUserId ? (
          <div className="rounded-md border px-4 py-3 text-sm bg-muted/30 flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Service user: </span>
            <span className="font-medium">{defaultServiceUserName}</span>
          </div>
        ) : (
          <FormField
            control={form.control}
            name="serviceUserId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service User</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service user…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="concernDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Concern</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="concernType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type of Concern</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(SAFEGUARDING_TYPE_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description of Concern</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the concern in detail. Include what was observed or disclosed, by whom, and any immediate actions already taken…"
                  className="min-h-[140px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="referredTo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Referred To (optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Adult Support & Protection, Police, Social Work, etc."
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
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {createMutation.isPending
              ? "Submitting…"
              : "Raise Safeguarding Concern"}
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
