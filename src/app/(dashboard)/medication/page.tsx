"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Pill, CalendarDays, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useDebounce } from "@/lib/use-debounce";
import { formatDate } from "@/lib/utils";

export default function MedicationPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isPending } = trpc.clients.list.useQuery({
    search: debouncedSearch || undefined,
    status: "ACTIVE",
    limit: 50,
  });

  const clients = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Medication</h1>
        <p className="text-muted-foreground mt-1">
          View medication profiles and MAR charts for service users.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search service users…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Results */}
      {isPending ? (
        <div className="py-8 text-center text-muted-foreground">Searching…</div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {search ? "No service users found." : "No active service users."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {clients.map((client) => (
            <Card key={client.id} className="hover:bg-muted/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">
                        {client.firstName} {client.lastName}
                      </p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        DOB: {formatDate(client.dateOfBirth)}
                      </Badge>
                      {client.chiNumber && (
                        <span className="text-xs text-muted-foreground">
                          CHI: {client.chiNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/medication/${client.id}`}>
                        <Pill className="h-3.5 w-3.5 mr-1.5" />
                        Medications
                      </Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href={`/medication/${client.id}/mar`}>
                        <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                        MAR Chart
                      </Link>
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
