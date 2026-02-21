"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
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
import { SURVEY_TYPE_LABELS } from "./compliance-meta";

const TYPES = Object.entries(SURVEY_TYPE_LABELS);

const schema = z.object({
  surveyDate: z.string().min(1, "Date is required"),
  surveyType: z.string().min(1, "Type is required"),
  serviceUserId: z.string().optional(),
  overallRating: z.string().optional(),
  comments: z.string().optional(),
  actionsFromFeedback: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              n <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function SurveyForm() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: serviceUsers } = trpc.clients.list.useQuery(
    { page: 1, limit: 200, status: "ACTIVE" },
    { select: (d) => d.items }
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      surveyDate: new Date().toISOString().split("T")[0],
      surveyType: "",
      serviceUserId: "",
      overallRating: "",
      comments: "",
      actionsFromFeedback: "",
    },
  });

  const mutation = trpc.compliance.surveys.create.useMutation({
    onSuccess: () => {
      toast.success("Survey recorded");
      utils.compliance.surveys.invalidate();
      router.push("/compliance?tab=surveys");
    },
    onError: (err) => toast.error(err.message),
  });

  async function onSubmit(values: FormValues) {
    await mutation.mutateAsync({
      surveyDate: values.surveyDate,
      surveyType: values.surveyType as never,
      serviceUserId: values.serviceUserId || undefined,
      overallRating: values.overallRating || undefined,
      comments: values.comments || undefined,
      actionsFromFeedback: values.actionsFromFeedback || undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="surveyDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Survey Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="surveyType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Survey Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TYPES.map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
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
          name="serviceUserId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service User (optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
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

        <FormField
          control={form.control}
          name="overallRating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Overall Rating</FormLabel>
              <FormControl>
                <StarRating
                  value={field.value ? parseInt(field.value, 10) : 0}
                  onChange={(v) => field.onChange(String(v))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comments</FormLabel>
              <FormControl>
                <Textarea rows={4} placeholder="Feedback comments…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="actionsFromFeedback"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Actions from Feedback</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Actions taken as a result…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Recording…" : "Record Survey"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/compliance?tab=surveys")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
