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

const schema = z.object({
  investigationOutcome: z.string().optional(),
  careInspectorateNotified: z.boolean(),
  notificationDate: z.string().optional(),
  lessonsLearned: z.string().optional(),
  actionTaken: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface InvestigationFormProps {
  errorId: string;
  defaultValues?: Partial<FormValues>;
  onSuccess?: () => void;
}

export function InvestigationForm({
  errorId,
  defaultValues,
  onSuccess,
}: InvestigationFormProps) {
  const utils = trpc.useUtils();

  const updateMutation = trpc.medication.errors.update.useMutation({
    onSuccess: () => {
      toast.success("Investigation details saved.");
      utils.medication.errors.getById.invalidate({ id: errorId });
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save investigation details.");
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      investigationOutcome: defaultValues?.investigationOutcome ?? "",
      careInspectorateNotified: defaultValues?.careInspectorateNotified ?? false,
      notificationDate: defaultValues?.notificationDate ?? "",
      lessonsLearned: defaultValues?.lessonsLearned ?? "",
      actionTaken: defaultValues?.actionTaken ?? "",
    },
  });

  const ciNotified = form.watch("careInspectorateNotified");

  async function onSubmit(values: FormValues) {
    await updateMutation.mutateAsync({
      id: errorId,
      investigationOutcome: values.investigationOutcome || undefined,
      careInspectorateNotified: values.careInspectorateNotified,
      notificationDate: values.notificationDate || undefined,
      lessonsLearned: values.lessonsLearned || undefined,
      actionTaken: values.actionTaken || undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="investigationOutcome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Investigation Outcome</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Summarise the findings of the investigation, root cause, and conclusions…"
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
          name="actionTaken"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Actions Taken</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What actions have been taken or are planned to prevent recurrence?"
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
          name="lessonsLearned"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lessons Learned</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Key learning points and any policy or process changes…"
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3 rounded-md border p-4">
          <FormField
            control={form.control}
            name="careInspectorateNotified"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="font-normal cursor-pointer">
                  Care Inspectorate has been notified
                </FormLabel>
              </FormItem>
            )}
          />
          {ciNotified && (
            <FormField
              control={form.control}
              name="notificationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notification Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving…" : "Save Investigation"}
        </Button>
      </form>
    </Form>
  );
}
