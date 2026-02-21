"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Heart } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";

const schema = z.object({
  dateReceived: z.string().min(1, "Date is required"),
  fromName: z.string().min(1, "Name is required"),
  serviceUserId: z.string().optional(),
  complimentText: z.string().optional(),
  sharedWithStaff: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function ComplimentList() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data, isPending } = trpc.compliance.compliments.list.useQuery({
    page,
    limit: 20,
  });

  const { data: serviceUsers } = trpc.clients.list.useQuery(
    { page: 1, limit: 200, status: "ACTIVE" },
    { select: (d) => d.items }
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      dateReceived: new Date().toISOString().split("T")[0],
      fromName: "",
      serviceUserId: "",
      complimentText: "",
      sharedWithStaff: false,
    },
  });

  const mutation = trpc.compliance.compliments.create.useMutation({
    onSuccess: () => {
      toast.success("Compliment recorded");
      utils.compliance.compliments.invalidate();
      form.reset();
      setOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  async function onSubmit(values: FormValues) {
    await mutation.mutateAsync({
      dateReceived: values.dateReceived,
      fromName: values.fromName,
      serviceUserId: values.serviceUserId || undefined,
      complimentText: values.complimentText || undefined,
      sharedWithStaff: values.sharedWithStaff || undefined,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} compliment{total !== 1 ? "s" : ""} recorded
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Record Compliment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Compliment</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dateReceived"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fromName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From</FormLabel>
                        <FormControl>
                          <Input placeholder="Name" {...field} />
                        </FormControl>
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
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
                  name="complimentText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compliment</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sharedWithStaff"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Shared with staff</FormLabel>
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving…" : "Save"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isPending ? (
        <div className="py-12 text-center text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No compliments recorded yet.
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Service User</TableHead>
                <TableHead>Compliment</TableHead>
                <TableHead>Shared</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{formatDate(c.dateReceived)}</TableCell>
                  <TableCell className="font-medium">{c.fromName}</TableCell>
                  <TableCell>
                    {c.serviceUser
                      ? `${c.serviceUser.firstName} ${c.serviceUser.lastName}`
                      : "—"}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {c.complimentText || "—"}
                  </TableCell>
                  <TableCell>
                    {c.sharedWithStaff ? (
                      <Badge
                        variant="outline"
                        className="bg-pink-50 text-pink-700 border-pink-200"
                      >
                        <Heart className="h-3 w-3 mr-1" /> Shared
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
