"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  referredTo: z.string().optional(),
  referralDate: z.string().optional(),
  referralReference: z.string().optional(),
  adultProtectionInvestigation: z.boolean(),
  investigationOutcome: z.string().optional(),
  actionsTaken: z.string().optional(),
  status: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface SafeguardingTrackerProps {
  concernId: string;
  defaultValues?: {
    referredTo?: string | null;
    referralDate?: Date | string | null;
    referralReference?: string | null;
    adultProtectionInvestigation?: boolean;
    investigationOutcome?: string | null;
    actionsTaken?: string | null;
    status?: string;
  };
  onSuccess?: () => void;
}

export function SafeguardingTracker({
  concernId,
  defaultValues,
  onSuccess,
}: SafeguardingTrackerProps) {
  const utils = trpc.useUtils();

  const updateMutation = trpc.incidents.safeguarding.update.useMutation({
    onSuccess: () => {
      toast.success("Safeguarding record updated.");
      utils.incidents.safeguarding.getById.invalidate({ id: concernId });
      onSuccess?.();
    },
    onError: (err) =>
      toast.error(err.message || "Failed to update safeguarding record."),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      referredTo: defaultValues?.referredTo ?? "",
      referralDate: defaultValues?.referralDate
        ? new Date(defaultValues.referralDate as string)
            .toISOString()
            .split("T")[0]
        : "",
      referralReference: defaultValues?.referralReference ?? "",
      adultProtectionInvestigation:
        defaultValues?.adultProtectionInvestigation ?? false,
      investigationOutcome: defaultValues?.investigationOutcome ?? "",
      actionsTaken: defaultValues?.actionsTaken ?? "",
      status: defaultValues?.status ?? "",
    },
  });

  const aspInvestigation = form.watch("adultProtectionInvestigation");

  async function onSubmit(values: FormValues) {
    await updateMutation.mutateAsync({
      id: concernId,
      referredTo: values.referredTo || undefined,
      referralDate: values.referralDate || undefined,
      referralReference: values.referralReference || undefined,
      adultProtectionInvestigation: values.adultProtectionInvestigation,
      investigationOutcome: values.investigationOutcome || undefined,
      actionsTaken: values.actionsTaken || undefined,
      status: values.status ? (values.status as never) : undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Referral details */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Referral Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="referredTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referred To</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Adult Support & Protection, Social Work, Police…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="referralDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referral Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="referralReference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Referral Reference (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Case reference number…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ASP Investigation */}
        <div className="rounded-md border p-4 space-y-3">
          <FormField
            control={form.control}
            name="adultProtectionInvestigation"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="font-normal cursor-pointer">
                  Adult Support & Protection investigation commenced
                </FormLabel>
              </FormItem>
            )}
          />
          {aspInvestigation && (
            <FormField
              control={form.control}
              name="investigationOutcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Investigation Outcome</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Summarise the outcome of the ASP investigation…"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="actionsTaken"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Actions Taken</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What actions have been taken to safeguard the individual?"
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Keep current status…" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">— No change —</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="REFERRED">Referred</SelectItem>
                  <SelectItem value="UNDER_INVESTIGATION">
                    Under Investigation
                  </SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving…" : "Save Safeguarding Record"}
        </Button>
      </form>
    </Form>
  );
}
