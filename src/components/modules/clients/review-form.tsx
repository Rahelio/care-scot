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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  reviewDate: z.string().min(1, "Required"),
  reviewType: z.enum(["SCHEDULED", "NEEDS_CHANGE", "ANNUAL"]),
  serviceUserFeedback: z.string().optional(),
  familyFeedback: z.string().optional(),
  changesIdentified: z.string().optional(),
  actionsTaken: z.string().optional(),
  mdtMeetingNotes: z.string().optional(),
  nextReviewDate: z.string().optional(),
  personalPlanUpdated: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface ReviewFormProps {
  serviceUserId: string;
  clientName: string;
}

export function ReviewForm({ serviceUserId, clientName }: ReviewFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      reviewDate: new Date().toISOString().split("T")[0],
      reviewType: "SCHEDULED",
      personalPlanUpdated: false,
    },
  });

  const mutation = trpc.clients.createReview.useMutation({
    onSuccess: () => {
      toast.success("Review recorded");
      utils.clients.listReviews.invalidate({ serviceUserId });
      router.push(`/clients/${serviceUserId}/reviews`);
    },
    onError: (err) => toast.error(err.message),
  });

  function onSubmit(values: FormValues) {
    mutation.mutate({
      serviceUserId,
      ...values,
      reviewDate: new Date(values.reviewDate),
      nextReviewDate: values.nextReviewDate ? new Date(values.nextReviewDate) : undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Record Review</h2>
          <p className="text-sm text-muted-foreground">For {clientName}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="reviewDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Review Date *</FormLabel>
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
                    <Input type="date" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reviewType"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Review Type *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SCHEDULED">Scheduled Review</SelectItem>
                      <SelectItem value="NEEDS_CHANGE">Needs Change Review</SelectItem>
                      <SelectItem value="ANNUAL">Annual Review</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="serviceUserFeedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service User Feedback</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="familyFeedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Family / Representative Feedback</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outcomes &amp; Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="changesIdentified"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Changes Identified</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="actionsTaken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Actions Taken</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mdtMeetingNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>MDT Meeting Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="personalPlanUpdated"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Personal plan updated as a result of this review
                  </FormLabel>
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
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save Review"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
