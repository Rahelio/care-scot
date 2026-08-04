"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  code: z.string().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/clients";

  const [serverError, setServerError] = useState<string | null>(null);
  // Password verified but the account has MFA enabled — reveal the code
  // input and resubmit with email+password+code rather than a separate
  // step/endpoint, since Credentials providers only get one authorize() call.
  const [mfaRequired, setMfaRequired] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", code: "" },
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      ...(mfaRequired && useRecoveryCode && { recoveryCode: values.code }),
      ...(mfaRequired && !useRecoveryCode && { totpCode: values.code }),
      redirect: false,
    });

    if (result?.code === "mfa_required") {
      setMfaRequired(true);
      return;
    }
    if (result?.code === "mfa_invalid") {
      setServerError(
        useRecoveryCode ? "That recovery code is invalid or already used." : "Incorrect code — please try again."
      );
      return;
    }
    if (result?.error) {
      setServerError("Invalid email or password.");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
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

        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {mfaRequired ? "Enter your code" : "Sign in"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mfaRequired
              ? useRecoveryCode
                ? "Enter one of your unused recovery codes."
                : "Enter the 6-digit code from your authenticator app."
              : "Enter your email and password to continue"}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className={mfaRequired ? "hidden" : undefined}>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className={mfaRequired ? "hidden" : undefined}>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mfaRequired && (
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{useRecoveryCode ? "Recovery code" : "Authenticator code"}</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="one-time-code"
                        autoFocus
                        placeholder={useRecoveryCode ? "XXXX-XXXX-XXXX" : "123456"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            {mfaRequired && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:underline"
                onClick={() => {
                  setUseRecoveryCode((v) => !v);
                  form.setValue("code", "");
                  setServerError(null);
                }}
              >
                {useRecoveryCode ? "Use your authenticator app instead" : "Use a recovery code instead"}
              </button>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
            </Button>

            <Button asChild variant="ghost" className="w-full">
              <Link href="/signup">New organisation? Create an account</Link>
            </Button>
          </form>
        </Form>

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          {" · "}
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
        </p>
      </div>
    </main>
  );
}
