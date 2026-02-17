"use client";

import { use } from "react";
import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  User,
  ExternalLink,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecruitmentChecklist } from "@/components/modules/staff/recruitment-checklist";
import { formatDate } from "@/lib/utils";

const ROLE_LABELS = {
  CARER: "Carer",
  SENIOR_CARER: "Senior Carer",
  NURSE: "Nurse",
  COORDINATOR: "Coordinator",
  MANAGER: "Manager",
  ADMIN: "Admin",
  OTHER: "Other",
} as const;

const EMPLOYMENT_LABELS = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  BANK: "Bank",
  AGENCY: "Agency",
} as const;

export default function StaffOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: member, isPending } = trpc.staff.getById.useQuery({ id });

  if (isPending) {
    return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
  }

  if (!member) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column — details */}
      <div className="lg:col-span-2 space-y-6">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {member.phone && (
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{member.phone}</span>
              </div>
            )}
            {member.email && (
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <a href={`mailto:${member.email}`} className="hover:underline">
                  {member.email}
                </a>
              </div>
            )}
            {member.addressLine1 && (
              <div className="flex items-start gap-2.5 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p>{member.addressLine1}</p>
                  {member.addressLine2 && <p>{member.addressLine2}</p>}
                  {(member.city || member.postcode) && (
                    <p>
                      {[member.city, member.postcode].filter(Boolean).join(" ")}
                    </p>
                  )}
                </div>
              </div>
            )}
            {!member.phone && !member.email && !member.addressLine1 && (
              <p className="text-muted-foreground">No contact details recorded.</p>
            )}
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-0.5">Role Type</p>
              <p className="font-medium">{ROLE_LABELS[member.roleType]}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Employment Type</p>
              <p className="font-medium">{EMPLOYMENT_LABELS[member.employmentType]}</p>
            </div>
            {member.jobTitle && (
              <div>
                <p className="text-muted-foreground mb-0.5">Job Title</p>
                <p className="font-medium">{member.jobTitle}</p>
              </div>
            )}
            {member.contractHoursPerWeek != null && (
              <div>
                <p className="text-muted-foreground mb-0.5">Contract Hours / Week</p>
                <p className="font-medium">{Number(member.contractHoursPerWeek)} hrs</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground mb-0.5">Right to Work</p>
              <Badge
                variant="outline"
                className={
                  member.rightToWorkChecked
                    ? "bg-green-100 text-green-800 border-green-200"
                    : "bg-amber-100 text-amber-800 border-amber-200"
                }
              >
                {member.rightToWorkChecked ? "Verified" : "Not verified"}
              </Badge>
            </div>
            {member.rightToWorkDocument && (
              <div>
                <p className="text-muted-foreground mb-0.5">RTW Document</p>
                <p className="font-medium">{member.rightToWorkDocument}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Dates</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <div>
                <p className="text-xs">Date of Birth</p>
                <p className="font-medium text-foreground">
                  {member.dateOfBirth ? formatDate(member.dateOfBirth) : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <div>
                <p className="text-xs">Start Date</p>
                <p className="font-medium text-foreground">{formatDate(member.startDate)}</p>
              </div>
            </div>
            {member.probationEndDate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                <div>
                  <p className="text-xs">Probation End</p>
                  <p className="font-medium text-foreground">
                    {formatDate(member.probationEndDate)}
                  </p>
                </div>
              </div>
            )}
            {member.endDate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                <div>
                  <p className="text-xs">End Date</p>
                  <p className="font-medium text-foreground">{formatDate(member.endDate)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Account */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">System Account</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {member.users && member.users.length > 0 ? (
              <div className="space-y-2">
                {member.users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium">{u.email}</p>
                      <p className="text-xs text-muted-foreground">{u.role}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        u.isActive
                          ? "ml-auto bg-green-100 text-green-800 border-green-200"
                          : "ml-auto bg-gray-100 text-gray-600 border-gray-200"
                      }
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">No user account linked.</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/settings/users">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Manage Users
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right column — recruitment checklist */}
      <div className="space-y-6">
        <RecruitmentChecklist staffId={id} />
      </div>
    </div>
  );
}
