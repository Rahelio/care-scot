"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
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
import { TurnstileWidget } from "@/components/modules/turnstile-widget";

const schema = z.object({
  organisationName: z.string().min(1, "Organisation name is required"),
  email: z.string().email("Please enter a valid email address"),
  // Mirrors passwordSchema in src/server/shared/validators.ts — kept in
  // sync manually so the form catches a weak password before the round
  // trip to the server, which enforces the same rule regardless.
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[a-zA-Z]/, "Password must include at least one letter")
    .regex(/[0-9]/, "Password must include at least one number"),
});

type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { organisationName: "", email: "", password: "" },
  });

  const signupMut = trpc.signup.create.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (err) => setServerError(err.message || "Something went wrong."),
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    await signupMut.mutateAsync({ ...values, turnstileToken });
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 py-12">
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

        {submitted ? (
          <div className="space-y-4">
            <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We&apos;ve sent a verification link to your email address. Click
              it to activate your organisation — the first 5 users are free.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Create your organisation
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                First 5 users free. No card required to get started.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="organisationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organisation name</FormLabel>
                      <FormControl>
                        <Input placeholder="Highland Home Care Ltd" {...field} />
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
                      <FormLabel>Your email</FormLabel>
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
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {siteKey && (
                  <TurnstileWidget siteKey={siteKey} onVerify={setTurnstileToken} />
                )}

                {serverError && (
                  <p className="text-sm text-destructive">{serverError}</p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    form.formState.isSubmitting || (!!siteKey && !turnstileToken)
                  }
                >
                  {form.formState.isSubmitting ? "Creating…" : "Create organisation"}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By continuing, you agree to our{" "}
                  <Link href="/terms" className="hover:underline">Terms</Link>
                  {" and "}
                  <Link href="/privacy" className="hover:underline">Privacy Policy</Link>.
                </p>

                <Button asChild variant="ghost" className="w-full">
                  <Link href="/login">Already have an account? Sign in</Link>
                </Button>
              </form>
            </Form>
          </>
        )}
      </div>
    </main>
  );
}
