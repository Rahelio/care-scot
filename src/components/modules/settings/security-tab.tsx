"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, Copy, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const codeSchema = z.object({ code: z.string().length(6, "Enter the 6-digit code") });
type CodeValues = z.infer<typeof codeSchema>;

const passwordSchema = z.object({ password: z.string().min(1, "Password is required") });
type PasswordValues = z.infer<typeof passwordSchema>;

export function SecurityTab() {
  const utils = trpc.useUtils();
  const { data: status, isPending } = trpc.mfa.getStatus.useQuery();

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  if (isPending) {
    return <div className="h-32 w-full animate-pulse rounded bg-muted" />;
  }

  return (
    <div className="max-w-xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status?.enabled ? (
              <ShieldCheck className="h-5 w-5 text-green-600" />
            ) : (
              <ShieldOff className="h-5 w-5 text-muted-foreground" />
            )}
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            {status?.enabled
              ? "Enabled — sign-in requires a code from your authenticator app in addition to your password."
              : "Not enabled. Add an authenticator app (e.g. Google Authenticator, 1Password) for an extra layer of protection on your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status?.enabled ? (
            <Button variant="outline" onClick={() => setDisableOpen(true)}>
              Disable two-factor authentication
            </Button>
          ) : (
            <Button onClick={() => setEnrollOpen(true)}>Enable two-factor authentication</Button>
          )}
        </CardContent>
      </Card>

      <EnrollDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        onEnrolled={(codes) => {
          setEnrollOpen(false);
          setRecoveryCodes(codes);
          utils.mfa.getStatus.invalidate();
        }}
      />

      <DisableDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        onDisabled={() => {
          setDisableOpen(false);
          utils.mfa.getStatus.invalidate();
        }}
      />

      <RecoveryCodesDialog codes={recoveryCodes} onClose={() => setRecoveryCodes(null)} />
    </div>
  );
}

function EnrollDialog({
  open,
  onOpenChange,
  onEnrolled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnrolled: (recoveryCodes: string[]) => void;
}) {
  const [setup, setSetup] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);

  const begin = trpc.mfa.beginEnrollment.useMutation({
    onSuccess: (data) => setSetup(data),
    onError: (err) => toast.error(err.message),
  });

  const confirm = trpc.mfa.confirmEnrollment.useMutation({
    onSuccess: (data) => {
      setSetup(null);
      form.reset();
      onEnrolled(data.recoveryCodes);
    },
    onError: (err) => toast.error(err.message),
  });

  const form = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  // Radix's Dialog onOpenChange fires for its own internal interactions
  // (Escape, overlay click) but NOT just because a parent-controlled `open`
  // prop flipped to true — so kicking off enrollment has to react to `open`
  // itself, not be bundled into a handler that a programmatic open never calls.
  const beginMutate = begin.mutate;
  useEffect(() => {
    if (open && !setup) {
      beginMutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSetup(null);
      form.reset();
    }
    onOpenChange(next);
  }

  function onSubmit(values: CodeValues) {
    confirm.mutate({ code: values.code });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set up two-factor authentication</DialogTitle>
          <DialogDescription>
            Scan the QR code with your authenticator app, then enter the 6-digit code it generates to confirm.
          </DialogDescription>
        </DialogHeader>

        {begin.isPending || !setup ? (
          <div className="h-48 w-full animate-pulse rounded bg-muted" />
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Image
                src={setup.qrCodeDataUrl}
                alt="Scan with your authenticator app"
                width={200}
                height={200}
                className="rounded-md border"
                unoptimized
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Can&apos;t scan? Enter this key manually:{" "}
              <code className="font-mono">{setup.secret}</code>
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>6-digit code</FormLabel>
                      <FormControl>
                        <Input autoComplete="one-time-code" placeholder="123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={confirm.isPending}>
                  {confirm.isPending ? "Confirming…" : "Confirm and enable"}
                </Button>
              </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DisableDialog({
  open,
  onOpenChange,
  onDisabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDisabled: () => void;
}) {
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });

  const disable = trpc.mfa.disable.useMutation({
    onSuccess: () => {
      toast.success("Two-factor authentication disabled.");
      form.reset();
      onDisabled();
    },
    onError: (err) => toast.error(err.message),
  });

  function onSubmit(values: PasswordValues) {
    disable.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) form.reset(); onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable two-factor authentication</DialogTitle>
          <DialogDescription>
            Confirm your password to turn off two-factor authentication. Your recovery codes will be invalidated.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" variant="destructive" className="w-full" disabled={disable.isPending}>
              {disable.isPending ? "Disabling…" : "Disable two-factor authentication"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function RecoveryCodesDialog({ codes, onClose }: { codes: string[] | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!codes) return;
    await navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={codes !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save your recovery codes</DialogTitle>
          <DialogDescription>
            Each code can be used once to sign in if you lose access to your authenticator app. Store
            them somewhere safe — they won&apos;t be shown again.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/30 p-4 font-mono text-sm">
          {codes?.map((code) => <span key={code}>{code}</span>)}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? "Copied" : "Copy codes"}
          </Button>
          <Button className="flex-1" onClick={onClose}>
            I&apos;ve saved these
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
