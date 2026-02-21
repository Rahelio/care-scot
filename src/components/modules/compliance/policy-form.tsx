"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { POLICY_CATEGORY_LABELS } from "./compliance-meta";

const CATEGORIES = Object.entries(POLICY_CATEGORY_LABELS);

const schema = z.object({
  policyName: z.string().min(1, "Policy name is required"),
  policyCategory: z.string().min(1, "Category is required"),
  status: z.string().optional(),
  effectiveDate: z.string().optional(),
  reviewDate: z.string().optional(),
  nextReviewDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function PolicyForm() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      policyName: "",
      policyCategory: "",
      status: "DRAFT",
      effectiveDate: "",
      reviewDate: "",
      nextReviewDate: "",
    },
  });

  const createMutation = trpc.compliance.policies.create.useMutation({
    onSuccess: () => {
      toast.success("Policy created");
      utils.compliance.policies.invalidate();
      router.push("/compliance?tab=policies");
    },
    onError: (err) => toast.error(err.message),
  });

  async function onSubmit(values: FormValues) {
    await createMutation.mutateAsync({
      policyName: values.policyName,
      policyCategory: values.policyCategory as never,
      status: values.status ? (values.status as never) : undefined,
      effectiveDate: values.effectiveDate || undefined,
      reviewDate: values.reviewDate || undefined,
      nextReviewDate: values.nextReviewDate || undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="policyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Policy Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Safeguarding Adults Policy" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="policyCategory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CATEGORIES.map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="effectiveDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Effective Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reviewDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Review Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nextReviewDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Next Review Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating…" : "Create Policy"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/compliance?tab=policies")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
