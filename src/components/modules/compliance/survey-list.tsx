"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { SURVEY_TYPE_LABELS } from "./compliance-meta";

function Stars({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${
            n <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

const TYPES = Object.entries(SURVEY_TYPE_LABELS);

export function SurveyList() {
  const [surveyType, setSurveyType] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data: summary } = trpc.compliance.surveys.getSummary.useQuery();
  const { data, isPending } = trpc.compliance.surveys.list.useQuery({
    surveyType: surveyType ? (surveyType as never) : undefined,
    page,
    limit: 20,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && summary.totalCount > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">
                {summary.averageRating?.toFixed(1) ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                Overall Avg ({summary.totalCount} surveys)
              </p>
            </CardContent>
          </Card>
          {TYPES.map(([k, label]) => {
            const typeData = summary.byType[k];
            return (
              <Card key={k}>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-bold">
                    {typeData?.avgRating?.toFixed(1) ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {label} ({typeData?.count ?? 0})
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={surveyType} onValueChange={(v) => { setSurveyType(v === "ALL" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {TYPES.map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button asChild size="sm">
          <Link href="/compliance/surveys/new">
            <Plus className="h-4 w-4 mr-1" /> Record Survey
          </Link>
        </Button>
      </div>

      {isPending ? (
        <div className="py-12 text-center text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No surveys recorded.
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Service User</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Comments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{formatDate(s.surveyDate)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {SURVEY_TYPE_LABELS[s.surveyType] ?? s.surveyType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {s.serviceUser
                      ? `${s.serviceUser.firstName} ${s.serviceUser.lastName}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Stars rating={s.overallRating} />
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate">
                    {s.comments || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">{total} survey{total !== 1 ? "s" : ""}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
