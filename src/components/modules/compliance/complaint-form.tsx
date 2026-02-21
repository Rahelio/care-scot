"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
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

const schema = z.object({
  dateReceived: z.string().min(1, "Date is required"),
  complainantName: z.string().min(1, "Complainant name is required"),
  complainantRelationship: z.string().optional(),
  serviceUserId: z.string().optional(),
  natureOfComplaint: z.string().min(1, "Description is required"),
});

type FormValues = z.infer<typeof schema>;

export function ComplaintForm() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: serviceUsers } = trpc.clients.list.useQuery(
    { page: 1, limit: 200, status: "ACTIVE" },
    { select: (d) => d.items }
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      dateReceived: new Date().toISOString().split("T")[0],
      complainantName: "",
      complainantRelationship: "",
      serviceUserId: "",
      natureOfComplaint: "",
    },
  });

  const mutation = trpc.compliance.complaints.create.useMutation({
    onSuccess: () => {
      toast.success("Complaint recorded");
      utils.compliance.complaints.invalidate();
      router.push("/compliance?tab=complaints");
    },
    onError: (err) => toast.error(err.message),
  });

  async function onSubmit(values: FormValues) {
    await mutation.mutateAsync({
      dateReceived: values.dateReceived,
      complainantName: values.complainantName,
      complainantRelationship: values.complainantRelationship || undefined,
      serviceUserId: values.serviceUserId || undefined,
      natureOfComplaint: values.natureOfComplaint,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dateReceived"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date Received</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="complainantName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Complainant Name</FormLabel>
                <FormControl>
                  <Input placeholder="Full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="complainantRelationship"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relationship to Service User</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Family member, neighbour" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="serviceUserId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service User (optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service user" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {serviceUsers?.map((su) => (
                      <SelectItem key={su.id} value={su.id}>
                        {su.firstName} {su.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="natureOfComplaint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nature of Complaint</FormLabel>
              <FormControl>
                <Textarea
                  rows={5}
                  placeholder="Describe the complaint in detail…"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Recording…" : "Record Complaint"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/compliance?tab=complaints")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
