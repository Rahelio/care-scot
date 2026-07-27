"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  trialing: { label: "Trial", variant: "secondary" },
  past_due: { label: "Past Due", variant: "destructive" },
  canceled: { label: "Canceled", variant: "outline" },
  unpaid: { label: "Unpaid", variant: "destructive" },
  incomplete: { label: "Incomplete", variant: "outline" },
  incomplete_expired: { label: "Expired", variant: "outline" },
};

export function BillingTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutResult = searchParams.get("checkout");

  const utils = trpc.useUtils();
  const { data: usage, isPending } = trpc.billing.getUsage.useQuery();

  useEffect(() => {
    if (checkoutResult === "success") {
      toast.success("Subscription updated — this can take a few seconds to reflect below.");
      utils.billing.getUsage.invalidate();
      router.replace("/settings");
    } else if (checkoutResult === "cancelled") {
      toast.info("Checkout cancelled — no changes were made.");
      router.replace("/settings");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutResult]);

  const checkoutMut = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (err) => toast.error(err.message),
  });

  const portalMut = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (err) => toast.error(err.message),
  });

  if (isPending || !usage) {
    return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
  }

  const statusMeta = usage.status ? STATUS_LABELS[usage.status] : null;
  const hasSubscription = usage.status !== null;
  const nearLimit = usage.activeUserCount >= usage.entitlement - 1;

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Seats &amp; billing
          </CardTitle>
          <CardDescription>
            First 5 users are free. Additional seats are billed per block of 5.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Users</p>
              <p className="text-2xl font-semibold" data-testid="seat-usage">
                {usage.activeUserCount}{" "}
                <span className="text-base font-normal text-muted-foreground">
                  / {usage.entitlement}
                </span>
              </p>
            </div>
            {statusMeta && <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>}
          </div>

          {nearLimit && (
            <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-md px-3 py-2">
              You&apos;re close to your seat limit. Add more seats below before
              inviting additional users.
            </p>
          )}

          {usage.cancelAtPeriodEnd && usage.currentPeriodEnd && (
            <p className="text-sm text-destructive">
              Your subscription will cancel at the end of the current period
              ({formatDate(usage.currentPeriodEnd)}).
            </p>
          )}

          {!usage.cancelAtPeriodEnd && usage.currentPeriodEnd && (
            <p className="text-sm text-muted-foreground">
              Current period ends {formatDate(usage.currentPeriodEnd)}.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            {hasSubscription ? (
              <Button
                onClick={() => portalMut.mutate()}
                disabled={portalMut.isPending}
              >
                {portalMut.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Opening…</>
                ) : "Manage Billing"}
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => checkoutMut.mutate({ interval: "month" })}
                  disabled={checkoutMut.isPending}
                >
                  {checkoutMut.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redirecting…</>
                  ) : "Subscribe monthly"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => checkoutMut.mutate({ interval: "year" })}
                  disabled={checkoutMut.isPending}
                >
                  Subscribe annually
                </Button>
              </>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Have a discount code? You can enter it during checkout.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
