"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [verified, setVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const verifyMut = trpc.signup.verifyEmail.useMutation({
    onSuccess: () => setVerified(true),
    onError: (err) => setErrorMessage(err.message || "Something went wrong."),
  });

  function handleVerify() {
    setErrorMessage(null);
    verifyMut.mutate({ token, email });
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-background p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            CS
          </div>
          <div>
            <p className="font-semibold leading-none">CareScot</p>
            <p className="text-xs text-muted-foreground mt-0.5">Care Management</p>
          </div>
        </div>

        {verified ? (
          <div className="space-y-4">
            <h1 className="text-xl font-semibold tracking-tight">Account verified</h1>
            <p className="text-sm text-muted-foreground">
              Your organisation is ready. You can now sign in.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Go to sign in</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <h1 className="text-xl font-semibold tracking-tight">Verify your email</h1>
            <p className="text-sm text-muted-foreground">
              Click below to activate your CareScot account.
            </p>

            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}

            <Button
              className="w-full"
              onClick={handleVerify}
              disabled={!token || !email || verifyMut.isPending}
            >
              {verifyMut.isPending ? "Verifying…" : "Verify my email"}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
