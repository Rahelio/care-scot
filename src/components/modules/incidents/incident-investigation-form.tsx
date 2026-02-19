"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, AlertCircle } from "lucide-react";
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
  investigationNotes: z.string().optional(),
  rootCause: z.string().optional(),
  outcome: z.string().optional(),
  status: z.string().optional(),
  riddorReportable: z.boolean(),
  riddorReference: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface InvestigationFormProps {
  incidentId: string;
  defaultValues?: {
    investigationNotes?: string | null;
    rootCause?: string | null;
    actionsToPreventRecurrence?: string[] | null;
    outcome?: string | null;
    status?: string;
    riddorReportable?: boolean;
    riddorReference?: string | null;
  };
  onSuccess?: () => void;
}

export function IncidentInvestigationForm({
  incidentId,
  defaultValues,
  onSuccess,
}: InvestigationFormProps) {
  const utils = trpc.useUtils();
  const [actions, setActions] = useState<string[]>(
    defaultValues?.actionsToPreventRecurrence ?? []
  );
  const [newAction, setNewAction] = useState("");

  const updateMutation = trpc.incidents.update.useMutation({
    onSuccess: () => {
      toast.success("Investigation saved.");
      utils.incidents.getById.invalidate({ id: incidentId });
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message || "Failed to save investigation."),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      investigationNotes: defaultValues?.investigationNotes ?? "",
      rootCause: defaultValues?.rootCause ?? "",
      outcome: defaultValues?.outcome ?? "",
      status: defaultValues?.status ?? "",
      riddorReportable: defaultValues?.riddorReportable ?? false,
      riddorReference: defaultValues?.riddorReference ?? "",
    },
  });

  const riddorReportable = form.watch("riddorReportable");
  const status = form.watch("status");

  function addAction() {
    const trimmed = newAction.trim();
    if (trimmed) {
      setActions((prev) => [...prev, trimmed]);
      setNewAction("");
    }
  }

  function removeAction(index: number) {
    setActions((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(values: FormValues) {
    await updateMutation.mutateAsync({
      id: incidentId,
      investigationNotes: values.investigationNotes || undefined,
      rootCause: values.rootCause || undefined,
      actionsToPreventRecurrence:
        actions.length > 0 ? actions : undefined,
      outcome: values.outcome || undefined,
      status: values.status ? (values.status as never) : undefined,
      riddorReportable: values.riddorReportable,
      riddorReference: values.riddorReference || undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="investigationNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Investigation Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Document the investigation findings, facts established, and timeline of events…"
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
          name="rootCause"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Root Cause Analysis</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What was the root cause of this incident?"
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions to prevent recurrence */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Actions to Prevent Recurrence
          </label>
          {actions.length > 0 && (
            <ul className="space-y-1.5">
              {actions.map((action, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm"
                >
                  <span className="flex-1">{action}</span>
                  <button
                    type="button"
                    onClick={() => removeAction(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Add action…"
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAction();
                }
              }}
              className="text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAction}
              disabled={!newAction.trim()}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <FormField
          control={form.control}
          name="outcome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Outcome</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What was the overall outcome of this incident?"
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* RIDDOR */}
        <div className="rounded-md border p-4 space-y-3">
          <p className="text-sm font-medium">RIDDOR (Reporting of Injuries, Diseases and Dangerous Occurrences)</p>
          <FormField
            control={form.control}
            name="riddorReportable"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="font-normal cursor-pointer">
                  This incident is RIDDOR reportable
                </FormLabel>
              </FormItem>
            )}
          />
          {riddorReportable && (
            <FormField
              control={form.control}
              name="riddorReference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RIDDOR Reference Number</FormLabel>
                  <FormControl>
                    <Input placeholder="HSE reference…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Status */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Update Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Keep current status…" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">— No change —</SelectItem>
                  <SelectItem value="UNDER_INVESTIGATION">
                    Under Investigation
                  </SelectItem>
                  <SelectItem value="CLOSED">Close Incident</SelectItem>
                </SelectContent>
              </Select>
              {status === "CLOSED" &&
                !form.getValues("investigationNotes") &&
                actions.length === 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Investigation notes or actions required before closing.
                  </div>
                )}
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving…" : "Save Investigation"}
        </Button>
      </form>
    </Form>
  );
}
