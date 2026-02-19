"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EQUIPMENT_TYPE_LABELS } from "./incident-meta";

const schema = z.object({
  equipmentType: z.string().min(1, "Equipment type is required"),
  equipmentName: z.string().min(1, "Equipment name is required"),
  serialNumber: z.string().optional(),
  location: z.string().optional(),
  checkDate: z.string().min(1, "Check date is required"),
  checkResult: z.string().min(1, "Result is required"),
  nextCheckDate: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface EquipmentCheckFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultEquipmentName?: string;
  defaultEquipmentType?: string;
  defaultSerialNumber?: string;
  defaultLocation?: string;
  onSuccess?: () => void;
}

export function EquipmentCheckForm({
  open,
  onOpenChange,
  defaultEquipmentName,
  defaultEquipmentType,
  defaultSerialNumber,
  defaultLocation,
  onSuccess,
}: EquipmentCheckFormProps) {
  const utils = trpc.useUtils();

  const createMutation = trpc.incidents.equipmentChecks.create.useMutation({
    onSuccess: () => {
      toast.success("Equipment check recorded.");
      utils.incidents.equipmentChecks.listCurrent.invalidate();
      utils.incidents.equipmentChecks.list.invalidate();
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message || "Failed to record check."),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      equipmentType: defaultEquipmentType ?? "",
      equipmentName: defaultEquipmentName ?? "",
      serialNumber: defaultSerialNumber ?? "",
      location: defaultLocation ?? "",
      checkDate: new Date().toISOString().split("T")[0],
      checkResult: "",
      nextCheckDate: "",
      notes: "",
    },
  });

  async function onSubmit(values: FormValues) {
    await createMutation.mutateAsync({
      equipmentType: values.equipmentType as never,
      equipmentName: values.equipmentName,
      serialNumber: values.serialNumber || undefined,
      location: values.location || undefined,
      checkDate: values.checkDate,
      checkResult: values.checkResult as never,
      nextCheckDate: values.nextCheckDate || undefined,
      notes: values.notes || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Equipment Check</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="equipmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(EQUIPMENT_TYPE_LABELS).map(
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
              <FormField
                control={form.control}
                name="checkResult"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Result</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PASS">Pass</SelectItem>
                        <SelectItem value="FAIL">Fail</SelectItem>
                        <SelectItem value="NEEDS_ATTENTION">
                          Needs Attention
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="equipmentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipment Name / Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Ceiling hoist — Bedroom 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial No. (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Serial number…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Where is it kept?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="checkDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nextCheckDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Check Due (optional)</FormLabel>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any defects, observations, or actions required…"
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving…" : "Record Check"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
