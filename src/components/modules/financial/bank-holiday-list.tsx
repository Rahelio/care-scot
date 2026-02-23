"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

const SCOTTISH_HOLIDAYS_2025 = [
  { date: "2025-01-01", name: "New Year's Day" },
  { date: "2025-01-02", name: "2nd January" },
  { date: "2025-04-18", name: "Good Friday" },
  { date: "2025-05-05", name: "Early May Bank Holiday" },
  { date: "2025-05-26", name: "Spring Bank Holiday" },
  { date: "2025-08-04", name: "Summer Bank Holiday" },
  { date: "2025-11-30", name: "St Andrew's Day" },
  { date: "2025-12-25", name: "Christmas Day" },
  { date: "2025-12-26", name: "Boxing Day" },
];

const SCOTTISH_HOLIDAYS_2026 = [
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-01-02", name: "2nd January" },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-05-04", name: "Early May Bank Holiday" },
  { date: "2026-05-25", name: "Spring Bank Holiday" },
  { date: "2026-08-03", name: "Summer Bank Holiday" },
  { date: "2026-11-30", name: "St Andrew's Day" },
  { date: "2026-12-25", name: "Christmas Day" },
  { date: "2026-12-28", name: "Boxing Day (substitute)" },
];

const fmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function dayName(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(date);
}

export function BankHolidayList() {
  const [year, setYear] = useState(currentYear);
  const [addOpen, setAddOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newName, setNewName] = useState("");

  const utils = trpc.useUtils();
  const { data: holidays = [], isLoading } =
    trpc.financial.bankHolidays.list.useQuery({ year });

  const createMut = trpc.financial.bankHolidays.create.useMutation({
    onSuccess: () => {
      utils.financial.bankHolidays.invalidate();
      setAddOpen(false);
      setNewDate("");
      setNewName("");
      toast.success("Bank holiday added");
    },
  });

  const createManyMut = trpc.financial.bankHolidays.createMany.useMutation({
    onSuccess: (result) => {
      utils.financial.bankHolidays.invalidate();
      toast.success(`${result.count} holidays added`);
    },
  });

  const deleteMut = trpc.financial.bankHolidays.delete.useMutation({
    onSuccess: () => {
      utils.financial.bankHolidays.invalidate();
      toast.success("Bank holiday removed");
    },
  });

  function populateScottish(yr: number) {
    const holidays =
      yr === 2025
        ? SCOTTISH_HOLIDAYS_2025
        : yr === 2026
          ? SCOTTISH_HOLIDAYS_2026
          : [];
    if (holidays.length === 0) {
      toast.error(`No pre-defined holidays for ${yr}`);
      return;
    }
    createManyMut.mutate({
      holidays: holidays.map((h) => ({
        holidayDate: h.date,
        name: h.name,
        appliesTo: "SCOTLAND" as const,
      })),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select
            value={String(year)}
            onValueChange={(v) => setYear(Number(v))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary">{holidays.length} holidays</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => populateScottish(year)}
            disabled={createManyMut.isPending}
          >
            <Wand2 className="h-4 w-4 mr-1" />
            Populate Scottish {year}
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Holiday
          </Button>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Region</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : holidays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No bank holidays for {year}
                </TableCell>
              </TableRow>
            ) : (
              holidays.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">
                    {fmt.format(new Date(h.holidayDate))}
                  </TableCell>
                  <TableCell>{dayName(new Date(h.holidayDate))}</TableCell>
                  <TableCell>{h.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{h.appliesTo}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteMut.mutate({ id: h.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bank Holiday</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Christmas Day"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newDate || !newName || createMut.isPending}
              onClick={() =>
                createMut.mutate({
                  holidayDate: newDate,
                  name: newName,
                  appliesTo: "SCOTLAND",
                })
              }
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
