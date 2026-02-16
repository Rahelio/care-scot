"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Lock } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const schema = z.object({
  tasksCompleted: z.array(
    z.object({
      task: z.string().min(1),
      completed: z.boolean(),
      notes: z.string().optional(),
    })
  ),
  wellbeingObservations: z.string().optional(),
  refusedCare: z.boolean(),
  refusedCareDetails: z.string().optional(),
  familyCommunication: z.string().optional(),
  conditionChanges: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Task {
  task: string;
  completed: boolean;
  notes?: string;
}

interface CareVisitEditFormProps {
  visitId: string;
  serviceUserId: string;
  isLocked: boolean;
  isManager: boolean;
  visitDate: string;
  scheduledStart: string;
  scheduledEnd: string;
  initialValues: {
    tasksCompleted: Task[];
    wellbeingObservations?: string;
    refusedCare: boolean;
    refusedCareDetails?: string;
    familyCommunication?: string;
    conditionChanges?: string;
    notes?: string;
  };
}

export function CareVisitEditForm({
  visitId,
  serviceUserId,
  isLocked,
  isManager,
  visitDate,
  scheduledStart,
  scheduledEnd,
  initialValues,
}: CareVisitEditFormProps) {
  const router = useRouter();
  const [newTask, setNewTask] = useState("");
  const utils = trpc.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tasksCompleted: initialValues.tasksCompleted,
      wellbeingObservations: initialValues.wellbeingObservations ?? "",
      refusedCare: initialValues.refusedCare,
      refusedCareDetails: initialValues.refusedCareDetails ?? "",
      familyCommunication: initialValues.familyCommunication ?? "",
      conditionChanges: initialValues.conditionChanges ?? "",
      notes: initialValues.notes ?? "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tasksCompleted",
  });

  const mutation = trpc.clients.updateCareVisit.useMutation({
    onSuccess: () => {
      toast.success("Care visit updated");
      utils.clients.listCareVisits.invalidate({ serviceUserId });
      router.push(`/clients/${serviceUserId}/care-records`);
    },
    onError: (err) => toast.error(err.message),
  });

  const refusedCare = form.watch("refusedCare");

  function onSubmit(values: FormValues) {
    mutation.mutate({ id: visitId, ...values });
  }

  function addTask() {
    if (newTask.trim()) {
      append({ task: newTask.trim(), completed: false, notes: "" });
      setNewTask("");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Edit Care Visit</h2>
            <p className="text-sm text-muted-foreground">
              {visitDate} · {scheduledStart}–{scheduledEnd}
            </p>
          </div>
          {isLocked && (
            <Badge variant="outline" className="shrink-0">
              <Lock className="h-3 w-3 mr-1" />
              Manager override
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-3">
                <FormField
                  control={form.control}
                  name={`tasksCompleted.${index}.completed`}
                  render={({ field: f }) => (
                    <Checkbox
                      checked={f.value}
                      onCheckedChange={f.onChange}
                      className="mt-1"
                    />
                  )}
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium">{field.task}</p>
                  <FormField
                    control={form.control}
                    name={`tasksCompleted.${index}.notes`}
                    render={({ field: f }) => (
                      <Input
                        {...f}
                        value={f.value ?? ""}
                        placeholder="Notes (optional)"
                        className="h-8 text-sm"
                      />
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Separator />
            <div className="flex gap-2">
              <Input
                placeholder="Add a task…"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTask();
                  }
                }}
                className="h-9 text-sm"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTask}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="wellbeingObservations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wellbeing Observations</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      placeholder="General mood, appearance, any concerns noted…"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="conditionChanges"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition Changes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Any changes in health or condition since last visit…"
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="refusedCare"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal text-base">
                    Service user refused care
                  </FormLabel>
                </FormItem>
              )}
            />

            {refusedCare && (
              <FormField
                control={form.control}
                name="refusedCareDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Refused Care Details</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Describe what was refused and any reasons given…"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="familyCommunication"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Family Communication</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Any contact with family or carers…"
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Any other relevant information…"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending} className="min-w-32">
            {mutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
