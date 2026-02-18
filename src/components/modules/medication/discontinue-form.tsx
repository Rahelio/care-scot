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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const schema = z.object({
  endDate: z.string().min(1, "Required"),
  discontinuedReason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface DiscontinueFormProps {
  medicationId: string;
  medicationName: string;
  serviceUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DiscontinueForm({
  medicationId,
  medicationName,
  serviceUserId,
  open,
  onOpenChange,
  onSuccess,
}: DiscontinueFormProps) {
  const utils = trpc.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      endDate: new Date().toISOString().split("T")[0],
    },
  });

  const mutation = trpc.medication.discontinue.useMutation({
    onSuccess: () => {
      toast.success("Medication discontinued");
      utils.medication.listForClient.invalidate({ serviceUserId });
      onOpenChange(false);
      form.reset({ endDate: new Date().toISOString().split("T")[0] });
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  function onSubmit(values: FormValues) {
    mutation.mutate({ id: medicationId, ...values });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Discontinue Medication</DialogTitle>
          <DialogDescription>
            This will mark <strong>{medicationName}</strong> as discontinued. This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discontinuation Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="discontinuedReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={3}
                      placeholder="Why is this medication being discontinued?"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={mutation.isPending}>
                {mutation.isPending ? "Discontinuing…" : "Discontinue"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
