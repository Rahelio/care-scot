"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  Users2,
  Monitor,
  Plus,
  UserX,
  UserCheck,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "organisation" | "users" | "system";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "organisation", label: "Organisation", icon: <Building2 className="h-4 w-4" /> },
  { id: "users", label: "Users", icon: <Users2 className="h-4 w-4" /> },
  { id: "system", label: "System", icon: <Monitor className="h-4 w-4" /> },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Admin",
  MANAGER: "Manager",
  SENIOR_CARER: "Senior Carer",
  CARER: "Carer",
  OFFICE_STAFF: "Office Staff",
  READ_ONLY: "Read Only",
};

const ROLE_OPTIONS = [
  "ORG_ADMIN",
  "MANAGER",
  "SENIOR_CARER",
  "CARER",
  "OFFICE_STAFF",
  "READ_ONLY",
] as const;

// ─── Org form schema ─────────────────────────────────────────────────────────

const orgSchema = z.object({
  name: z.string().min(1, "Name is required"),
  careInspectorateRegNumber: z.string().optional(),
  registeredAddress: z.string().optional(),
  registeredManagerName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  registrationConditions: z.string().optional(),
});

type OrgFormValues = z.infer<typeof orgSchema>;

// ─── New user form schema ────────────────────────────────────────────────────

const newUserSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().optional(),
  role: z.string().min(1, "Role is required"),
  tempPassword: z.string().min(8, "Minimum 8 characters"),
});

type NewUserValues = z.infer<typeof newUserSchema>;

// ─── Main page ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("organisation");
  const role = session?.user?.role as string | undefined;

  const isAdmin =
    role === "ORG_ADMIN" || role === "SUPER_ADMIN";

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <ShieldAlert className="h-10 w-10 mb-3" />
        <p className="text-sm font-medium">Access restricted</p>
        <p className="text-xs mt-1">
          You need Admin permissions to access settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Organisation settings &amp; user management
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "organisation" && <OrganisationTab />}
      {activeTab === "users" && <UsersTab />}
      {activeTab === "system" && <SystemTab />}
    </div>
  );
}

// ─── Organisation Tab ────────────────────────────────────────────────────────

function OrganisationTab() {
  const utils = trpc.useUtils();
  const { data: org, isPending } = trpc.settings.org.get.useQuery();

  const form = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: "",
      careInspectorateRegNumber: "",
      registeredAddress: "",
      registeredManagerName: "",
      phone: "",
      email: "",
      registrationConditions: "",
    },
  });

  useEffect(() => {
    if (org) {
      form.reset({
        name: org.name,
        careInspectorateRegNumber: org.careInspectorateRegNumber ?? "",
        registeredAddress: org.registeredAddress ?? "",
        registeredManagerName: org.registeredManagerName ?? "",
        phone: org.phone ?? "",
        email: org.email ?? "",
        registrationConditions: org.registrationConditions ?? "",
      });
    }
  }, [org, form]);

  const updateOrg = trpc.settings.org.update.useMutation({
    onSuccess: () => {
      toast.success("Organisation details updated.");
      utils.settings.org.get.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function onSubmit(values: OrgFormValues) {
    updateOrg.mutate(values);
  }

  if (isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organisation Details</CardTitle>
        <CardDescription>
          Update your organisation&apos;s registration and contact information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organisation Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="careInspectorateRegNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Care Inspectorate Reg. Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="registeredManagerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registered Manager</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="registeredAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registered Address</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="registrationConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Conditions</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={updateOrg.isPending}>
              {updateOrg.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ─── Users Tab ───────────────────────────────────────────────────────────────

function UsersTab() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data, isPending } = trpc.settings.users.list.useQuery({
    page,
    limit: 20,
    search: search || undefined,
  });

  const updateRole = trpc.settings.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated.");
      utils.settings.users.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deactivate = trpc.settings.users.deactivate.useMutation({
    onSuccess: () => {
      toast.success("User deactivated.");
      utils.settings.users.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const reactivate = trpc.settings.users.reactivate.useMutation({
    onSuccess: () => {
      toast.success("User reactivated.");
      utils.settings.users.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search users…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-64"
          />
          {data && (
            <span className="text-sm text-muted-foreground">
              {data.total} user{data.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add User</DialogTitle>
              <DialogDescription>
                Create a new user account. They&apos;ll use the temporary password to log in.
              </DialogDescription>
            </DialogHeader>
            <AddUserForm
              onSuccess={() => {
                setAddDialogOpen(false);
                utils.settings.users.list.invalidate();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name / Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Staff Link</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">
                        {user.name || user.email.split("@")[0]}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(role) =>
                        updateRole.mutate({ userId: user.id, role: role as typeof user.role })
                      }
                    >
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.staffMember ? (
                      <span className="text-sm">
                        {user.staffMember.firstName} {user.staffMember.lastName}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not linked</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deactivate.mutate({ userId: user.id })}
                        disabled={deactivate.isPending}
                      >
                        <UserX className="h-4 w-4 mr-1" /> Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => reactivate.mutate({ userId: user.id })}
                        disabled={reactivate.isPending}
                      >
                        <UserCheck className="h-4 w-4 mr-1" /> Reactivate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add User Form ───────────────────────────────────────────────────────────

function AddUserForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<NewUserValues>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      email: "",
      name: "",
      role: "",
      tempPassword: "",
    },
  });

  const createUser = trpc.settings.users.create.useMutation({
    onSuccess: () => {
      toast.success("User created successfully.");
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  function onSubmit(values: NewUserValues) {
    createUser.mutate({
      email: values.email,
      name: values.name || undefined,
      role: values.role as "CARER",
      tempPassword: values.tempPassword,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name (optional)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
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
          name="tempPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Temporary Password</FormLabel>
              <FormControl>
                <Input {...field} type="password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={createUser.isPending}>
          {createUser.isPending ? "Creating…" : "Create User"}
        </Button>
      </form>
    </Form>
  );
}

// ─── System Tab ──────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function SystemTab() {
  const { data: stats, isPending } = trpc.settings.org.getSystemStats.useQuery();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Session Timeout</CardDescription>
          <CardTitle className="text-2xl">30 minutes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Rolling inactivity window</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Audit Log Entries</CardDescription>
          <CardTitle className="text-2xl">
            {isPending ? "—" : stats?.auditLogCount.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Total recorded actions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Files Stored</CardDescription>
          <CardTitle className="text-2xl">
            {isPending ? "—" : stats?.fileCount.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {isPending ? "—" : formatBytes(stats?.totalFileSizeBytes ?? 0)} total
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
