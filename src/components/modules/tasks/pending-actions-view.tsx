"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import type { ConsentType, ReviewType, RiskAssessmentType } from "@prisma/client";

function AllClear() {
  return (
    <div className="flex items-center gap-2 py-3 text-sm text-green-600">
      <CheckCircle2 className="h-4 w-4" />
      All clear
    </div>
  );
}

function SectionCard({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {count > 0 && (
            <Badge
              variant="destructive"
              className="h-5 min-w-5 rounded-full px-1.5 text-xs tabular-nums"
            >
              {count}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function ViewLink({ href }: { href: string }) {
  return (
    <Link href={href} className="text-sm text-primary hover:underline whitespace-nowrap">
      View →
    </Link>
  );
}

function formatEnum(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function daysUntil(date: Date | string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(date).getTime() - today.getTime()) / 86400000);
}

export function PendingActionsView() {
  const { data, isPending } = trpc.clients.getPendingActions.useQuery();

  if (isPending) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">Pending actions requiring attention</p>
      </div>

      {/* Plans Awaiting Approval */}
      <SectionCard
        title="Plans Awaiting Approval"
        count={data.plansAwaitingApproval.length}
      >
        {data.plansAwaitingApproval.length === 0 ? (
          <AllClear />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.plansAwaitingApproval.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.clientName}</TableCell>
                  <TableCell className="text-muted-foreground">v{item.planVersion}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ViewLink href={item.href} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {/* Annual Reviews Overdue */}
      <SectionCard
        title="Annual Reviews Overdue"
        count={data.overdueReviews.length}
      >
        {data.overdueReviews.length === 0 ? (
          <AllClear />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Due Since</TableHead>
                <TableHead>Review Type</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.overdueReviews.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.clientName}</TableCell>
                  <TableCell className="text-red-600 font-medium">
                    {formatDate(item.nextReviewDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatEnum(item.reviewType as string)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ViewLink href={item.href} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {/* Risk Assessments Overdue */}
      <SectionCard
        title="Risk Assessments Overdue"
        count={data.overdueRiskAssessments.length}
      >
        {data.overdueRiskAssessments.length === 0 ? (
          <AllClear />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Due Since</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.overdueRiskAssessments.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.clientName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatEnum(item.assessmentType as string)}
                  </TableCell>
                  <TableCell className="text-red-600 font-medium">
                    {formatDate(item.nextReviewDate)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ViewLink href={item.href} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {/* Agreements Expiring Soon */}
      <SectionCard
        title="Agreements Expiring (within 30 days)"
        count={data.expiringSoon.length}
      >
        {data.expiringSoon.length === 0 ? (
          <AllClear />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Days Remaining</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.expiringSoon.map((item) => {
                const days = daysUntil(item.endDate);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.clientName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.endDate)}
                    </TableCell>
                    <TableCell
                      className={
                        days <= 7 ? "text-red-600 font-medium" : "text-amber-600 font-medium"
                      }
                    >
                      {days} day{days !== 1 ? "s" : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      <ViewLink href={item.href} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {/* Consent Expiring (12m+) */}
      <SectionCard
        title="Consent Records (12+ months old)"
        count={data.expiredConsents.length}
      >
        {data.expiredConsents.length === 0 ? (
          <AllClear />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Recorded</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.expiredConsents.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.clientName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatEnum(item.consentType as string)}
                  </TableCell>
                  <TableCell className="text-amber-600">
                    {formatDate(item.consentDate)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ViewLink href={item.href} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {/* Missing Required Consent */}
      <SectionCard
        title="Missing Required Consent"
        count={data.missingConsents.length}
      >
        {data.missingConsents.length === 0 ? (
          <AllClear />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Missing Types</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.missingConsents.map((item) => (
                <TableRow key={item.clientId}>
                  <TableCell className="font-medium">{item.clientName}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.missingTypes.map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="text-xs text-red-600 border-red-200"
                        >
                          {formatEnum(t as string)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <ViewLink href={`/clients/${item.clientId}/consent`} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}
