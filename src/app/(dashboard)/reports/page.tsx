"use client";

import { useState, useEffect } from "react";
import { Download, Users, GraduationCap, AlertTriangle, MessageSquare, ScrollText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { downloadCsv } from "@/lib/download-csv";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ExportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onExport: () => void;
  isExporting: boolean;
}

function ExportCard({ title, description, icon, onExport, isExporting }: ExportCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={isExporting}
        >
          <Download className="h-4 w-4 mr-1.5" />
          {isExporting ? "Exporting…" : "Export CSV"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  // Service Users
  const [exportSU, setExportSU] = useState(false);
  const { data: suData } = trpc.reports.exportServiceUsers.useQuery(
    {},
    { enabled: exportSU, staleTime: 0 },
  );
  useEffect(() => {
    if (suData && exportSU) {
      downloadCsv(suData.csv, suData.filename);
      setTimeout(() => {
        setExportSU(false);
      }, 0);
    }
  }, [suData, exportSU]);

  // Training Matrix
  const [exportTM, setExportTM] = useState(false);
  const { data: tmData } = trpc.reports.exportTrainingMatrix.useQuery(
    undefined,
    { enabled: exportTM, staleTime: 0 },
  );
  useEffect(() => {
    if (tmData && exportTM) {
      downloadCsv(tmData.csv, tmData.filename);
      setTimeout(() => {
        setExportTM(false);
      }, 0);
    }
  }, [tmData, exportTM]);

  // Incidents
  const [exportInc, setExportInc] = useState(false);
  const { data: incData } = trpc.reports.exportIncidents.useQuery(
    {},
    { enabled: exportInc, staleTime: 0 },
  );
  useEffect(() => {
    if (incData && exportInc) {
      downloadCsv(incData.csv, incData.filename);
      setTimeout(() => {
          setExportInc(false);
      }, 0);
    }
  }, [incData, exportInc]);

  // Complaints
  const [exportComp, setExportComp] = useState(false);
  const { data: compData } = trpc.reports.exportComplaints.useQuery(
    {},
    { enabled: exportComp, staleTime: 0 },
  );
  useEffect(() => {
    if (compData && exportComp) {
      downloadCsv(compData.csv, compData.filename);
      setTimeout(() => {
        setExportComp(false);
      }, 0);
    }
  }, [compData, exportComp]);

  // Audit Log
  const [exportAudit, setExportAudit] = useState(false);
  const { data: auditData } = trpc.reports.exportAuditLog.useQuery(
    {},
    { enabled: exportAudit, staleTime: 0 },
  );
  useEffect(() => {
    if (auditData && exportAudit) {
      downloadCsv(auditData.csv, auditData.filename);
      setTimeout(() => {
        setExportAudit(false);
      }, 0);
    }
  }, [auditData, exportAudit]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Export data as CSV for your records and external reporting.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ExportCard
          title="Service Users"
          description="Export all service users with contact details and status."
          icon={<Users className="h-5 w-5 text-muted-foreground" />}
          onExport={() => setExportSU(true)}
          isExporting={exportSU}
        />
        <ExportCard
          title="Training Matrix"
          description="Staff training status across all training types."
          icon={<GraduationCap className="h-5 w-5 text-muted-foreground" />}
          onExport={() => setExportTM(true)}
          isExporting={exportTM}
        />
        <ExportCard
          title="Incidents"
          description="All incident records with type, severity, and status."
          icon={<AlertTriangle className="h-5 w-5 text-muted-foreground" />}
          onExport={() => setExportInc(true)}
          isExporting={exportInc}
        />
        <ExportCard
          title="Complaints"
          description="Complaint records with SLA status and outcomes."
          icon={<MessageSquare className="h-5 w-5 text-muted-foreground" />}
          onExport={() => setExportComp(true)}
          isExporting={exportComp}
        />
        <ExportCard
          title="Audit Log"
          description="System audit trail of all user actions."
          icon={<ScrollText className="h-5 w-5 text-muted-foreground" />}
          onExport={() => setExportAudit(true)}
          isExporting={exportAudit}
        />
      </div>
    </div>
  );
}
