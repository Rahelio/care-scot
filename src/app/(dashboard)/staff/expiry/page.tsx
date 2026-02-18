"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  GraduationCap,
  FileText,
  Filter,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRAINING_LABELS } from "@/server/services/staff/training-config";

// ── Helpers ───────────────────────────────────────────────────────────────────

const WITHIN_OPTIONS = [
  { value: "30", label: "Next 30 days" },
  { value: "60", label: "Next 60 days" },
  { value: "90", label: "Next 90 days" },
  { value: "180", label: "Next 6 months" },
  { value: "365", label: "Next 12 months" },
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  training: <GraduationCap className="h-3.5 w-3.5" />,
  pvg: <ShieldCheck className="h-3.5 w-3.5" />,
  registration: <FileText className="h-3.5 w-3.5" />,
};

const TYPE_LABELS: Record<string, string> = {
  training: "Training",
  pvg: "PVG",
  registration: "Registration",
};

function UrgencyBadge({ days }: { days: number }) {
  if (days < 0)
    return (
      <Badge variant="destructive" className="gap-1 whitespace-nowrap">
        <AlertCircle className="h-3 w-3" />
        Expired {Math.abs(days)}d ago
      </Badge>
    );
  if (days === 0)
    return (
      <Badge variant="destructive" className="gap-1 whitespace-nowrap">
        <AlertCircle className="h-3 w-3" />
        Expires today
      </Badge>
    );
  if (days <= 14)
    return (
      <Badge variant="destructive" className="gap-1 whitespace-nowrap">
        <AlertCircle className="h-3 w-3" />
        {days}d remaining
      </Badge>
    );
  if (days <= 30)
    return (
      <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100 gap-1 whitespace-nowrap">
        <AlertTriangle className="h-3 w-3" />
        {days}d remaining
      </Badge>
    );
  return (
    <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 gap-1 whitespace-nowrap">
      <AlertTriangle className="h-3 w-3" />
      {days}d remaining
    </Badge>
  );
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ExpiryDashboardPage() {
  const [withinDays, setWithinDays] = useState("90");
  const [typeFilter, setTypeFilter] = useState<"all" | "training" | "pvg" | "registration">("all");

  const { data: items = [], isLoading } = trpc.staff.training.getExpiring.useQuery({
    withinDays: parseInt(withinDays),
  });

  const filtered = typeFilter === "all" ? items : items.filter((i) => i.type === typeFilter);

  const expiredCount = items.filter((i) => i.daysUntilExpiry < 0).length;
  const urgentCount = items.filter((i) => i.daysUntilExpiry >= 0 && i.daysUntilExpiry <= 14).length;
  const soonCount = items.filter((i) => i.daysUntilExpiry > 14).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/staff"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Expiry Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            PVG renewals, registrations, and training expiring across all active staff
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/staff/training-matrix">Training Matrix</Link>
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-2xl font-bold text-destructive">{expiredCount}</p>
          <p className="text-xs font-medium text-destructive mt-0.5">Already Expired</p>
        </div>
        <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3">
          <p className="text-2xl font-bold text-orange-700">{urgentCount}</p>
          <p className="text-xs font-medium text-orange-700 mt-0.5">Expires within 14 days</p>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-2xl font-bold text-amber-700">{soonCount}</p>
          <p className="text-xs font-medium text-amber-700 mt-0.5">Expiring further out</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={withinDays} onValueChange={setWithinDays}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WITHIN_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="training">Training only</SelectItem>
            <SelectItem value="pvg">PVG only</SelectItem>
            <SelectItem value="registration">Registrations only</SelectItem>
          </SelectContent>
        </Select>
        {filtered.length > 0 && (
          <span className="text-sm text-muted-foreground ml-auto">
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Results table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-medium text-sm">No expiring items</p>
              <p className="text-sm text-muted-foreground mt-1">
                Nothing is expiring within the selected window.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((item, idx) => {
                const staffHref = item.type === "training"
                  ? `/staff/${item.staffId}/training`
                  : item.type === "pvg"
                  ? `/staff/${item.staffId}/pvg`
                  : `/staff/${item.staffId}/pvg`;

                const itemLabel =
                  item.type === "training" && item.trainingType
                    ? TRAINING_LABELS[item.trainingType as keyof typeof TRAINING_LABELS] ?? item.label
                    : item.label;

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    {/* Type badge */}
                    <div className="shrink-0">
                      <Badge
                        variant="outline"
                        className="gap-1 text-xs whitespace-nowrap"
                      >
                        {TYPE_ICONS[item.type]}
                        {TYPE_LABELS[item.type]}
                      </Badge>
                    </div>

                    {/* Staff name */}
                    <div className="min-w-[160px] shrink-0">
                      <Link
                        href={`/staff/${item.staffId}`}
                        className="font-medium text-sm hover:underline text-primary"
                      >
                        {item.staffName}
                      </Link>
                    </div>

                    {/* Item label */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={staffHref}
                        className="text-sm hover:underline truncate block"
                      >
                        {itemLabel}
                      </Link>
                    </div>

                    {/* Expiry date */}
                    <div className="text-sm text-muted-foreground shrink-0 hidden sm:block">
                      {formatDate(item.expiryDate)}
                    </div>

                    {/* Urgency */}
                    <div className="shrink-0">
                      <UrgencyBadge days={item.daysUntilExpiry} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
