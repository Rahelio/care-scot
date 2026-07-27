-- CreateTable
CREATE TABLE "organisation_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_subscription_item_id" TEXT,
    "stripe_price_id" TEXT,
    "status" TEXT,
    "billing_interval" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "current_period_end" TIMESTAMPTZ,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "organisation_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signup_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signup_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisation_subscriptions_organisation_id_key" ON "organisation_subscriptions"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "organisation_subscriptions_stripe_customer_id_key" ON "organisation_subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "organisation_subscriptions_stripe_subscription_id_key" ON "organisation_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "signup_attempts_email_created_at_idx" ON "signup_attempts"("email", "created_at");

-- CreateIndex
CREATE INDEX "signup_attempts_ip_address_created_at_idx" ON "signup_attempts"("ip_address", "created_at");

-- AddForeignKey
ALTER TABLE "organisation_subscriptions" ADD CONSTRAINT "organisation_subscriptions_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
