# CI/CD Pipeline Manual — CareScot

This guide walks you through setting up the full deployment pipeline: **GitHub Actions -> Amazon ECR -> AWS App Runner**, with an RDS PostgreSQL database.

By the end, every `git push` to `main` will automatically lint, build a Docker image, push it to ECR, and deploy it to App Runner.

> **Never paste real values into this file.** Every value below (passwords, secrets, ARNs, account IDs, service URLs) is a placeholder for you to substitute *only in your terminal or in App Runner's environment configuration* — never in a file that gets committed to git, especially on a public repo. If you ever do commit a real secret, treat it as compromised and rotate it immediately rather than relying on removing it from a later commit.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Create the ECR Repository](#2-create-the-ecr-repository)
3. [Create the RDS PostgreSQL Database](#3-create-the-rds-postgresql-database)
4. [Create a VPC Connector for App Runner](#4-create-a-vpc-connector-for-app-runner)
5. [Create the App Runner Service](#5-create-the-app-runner-service)
6. [Set Up GitHub OIDC Authentication](#6-set-up-github-oidc-authentication)
7. [Add GitHub Secrets](#7-add-github-secrets)
8. [Test the Pipeline](#8-test-the-pipeline)
9. [Custom Domain (Optional)](#9-custom-domain-optional)
10. [Schedule the Compliance-Check Cron](#10-schedule-the-compliance-check-cron)
11. [Configure Third-Party Services (Sentry, SES, Stripe, Turnstile)](#11-configure-third-party-services-sentry-ses-stripe-turnstile)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

Before you start, make sure you have:

- An **AWS account** with admin access (or sufficient IAM permissions)
- The **AWS CLI v2** installed and configured (`aws configure`)
- A **GitHub repository** with this codebase pushed to it
- The GitHub repo must have a `main` branch

Confirm your AWS CLI is working:

```bash
aws sts get-caller-identity
```

This should return your account ID, ARN, and user ID.

---

## 2. Create the ECR Repository

Amazon ECR (Elastic Container Registry) stores your Docker images.

```bash
aws ecr create-repository \
  --repository-name carescot \
  --region eu-west-2 \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256
```

Note down the `repositoryUri` from the output — it looks like:

```
123456789012.dkr.ecr.eu-west-2.amazonaws.com/carescot
```

Set a lifecycle policy to keep costs down (keeps only the last 10 images):

```bash
aws ecr put-lifecycle-policy \
  --repository-name carescot \
  --region eu-west-2 \
  --lifecycle-policy-text '{
    "rules": [{
      "rulePriority": 1,
      "description": "Keep only last 10 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": { "type": "expire" }
    }]
  }'
```

---

## 3. Create the RDS PostgreSQL Database

App Runner needs a managed database. We use RDS PostgreSQL 16.

### 3a. Create a security group for the database

```bash
# Get your default VPC ID
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query "Vpcs[0].VpcId" --output text --region eu-west-2)

echo "VPC ID: $VPC_ID"

# Create a security group for the database
DB_SG_ID=$(aws ec2 create-security-group \
  --group-name carescot-db-sg \
  --description "CareScot RDS access" \
  --vpc-id $VPC_ID \
  --region eu-west-2 \
  --query "GroupId" --output text)

echo "DB Security Group: $DB_SG_ID"
```

### 3b. Allow inbound PostgreSQL traffic from within the VPC

```bash
VPC_CIDR=$(aws ec2 describe-vpcs \
  --vpc-ids $VPC_ID \
  --query "Vpcs[0].CidrBlock" --output text --region eu-west-2)

aws ec2 authorize-security-group-ingress \
  --group-id $DB_SG_ID \
  --protocol tcp \
  --port 5432 \
  --cidr $VPC_CIDR \
  --region eu-west-2
```

### 3c. Create a DB subnet group

```bash
SUBNET_IDS=($(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[*].SubnetId" --output text --region eu-west-2))

aws rds create-db-subnet-group \
  --db-subnet-group-name carescot-db-subnet \
  --db-subnet-group-description "CareScot DB subnets" \
  --subnet-ids "${SUBNET_IDS[@]}" \
  --region eu-west-2
```

### 3d. Create the RDS instance

Choose a strong password and save it securely (e.g. in AWS Secrets Manager).

```bash
aws rds create-db-instance \
  --db-instance-identifier carescot-db \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 16 \
  --master-username postgres \
  --master-user-password MY_PASSWORD_HERE \
  --allocated-storage 20 \
  --db-name carescot \
  --vpc-security-group-ids $DB_SG_ID \
  --db-subnet-group-name carescot-db-subnet \
  --no-publicly-accessible \
  --backup-retention-period 7 \
  --storage-encrypted \
  --region eu-west-2
```

Wait for the instance to become available (takes 5-10 minutes):

```bash
aws rds wait db-instance-available \
  --db-instance-identifier carescot-db \
  --region eu-west-2
```

Get the database endpoint:

```bash
DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier carescot-db \
  --query "DBInstances[0].Endpoint.Address" --output text --region eu-west-2)

echo "Database URL: postgresql://postgres:YOUR_STRONG_PASSWORD_HERE@$DB_ENDPOINT:5432/carescot?schema=public"
```

Save that full `DATABASE_URL` — you'll need it in Step 5.

---

## 4. Create a VPC Connector for App Runner

App Runner runs in AWS-managed infrastructure. To reach your private RDS instance, it needs a VPC Connector.

```bash
aws apprunner create-vpc-connector \
  --vpc-connector-name carescot-vpc-connector \
  --subnets "${SUBNET_IDS[@]}" \
  --security-groups $DB_SG_ID \
  --region eu-west-2
```

Note down the `VpcConnectorArn` from the output.

---

## 5. Create the App Runner Service

### 5a. Create an ECR access role for App Runner

App Runner needs permission to pull images from your private ECR repository.

```bash
# Create the trust policy
cat > /tmp/apprunner-trust.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "build.apprunner.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
EOF

# Create the role
aws iam create-role \
  --role-name carescot-apprunner-ecr-role \
  --assume-role-policy-document file:///tmp/apprunner-trust.json

# Attach the ECR read policy
aws iam attach-role-policy \
  --role-name carescot-apprunner-ecr-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess
```

Get the role ARN:

```bash
ECR_ROLE_ARN=$(aws iam get-role \
  --role-name carescot-apprunner-ecr-role \
  --query "Role.Arn" --output text)

echo "ECR Role ARN: $ECR_ROLE_ARN"
```

### 5b. Push an initial image

Before creating the service, you need at least one image in ECR. Build and push locally:

```bash
# Get your account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Login to ECR
aws ecr get-login-password --region eu-west-2 | \
  docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.eu-west-2.amazonaws.com

# Build and push
docker build -t $ACCOUNT_ID.dkr.ecr.eu-west-2.amazonaws.com/carescot:latest .
docker push $ACCOUNT_ID.dkr.ecr.eu-west-2.amazonaws.com/carescot:latest
```

### 5c. Generate an AUTH_SECRET

```bash
openssl rand -base64 32
```

Save this value — you'll use it below.

### 5d. Create the App Runner service

Replace the placeholder values below with your actual values:

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
VPC_CONNECTOR_ARN="arn:aws:apprunner:eu-west-2:${ACCOUNT_ID}:vpcconnector/carescot-vpc-connector/1/YOUR_CONNECTOR_ID"
ECR_ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/carescot-apprunner-ecr-role"

aws apprunner create-service \
  --service-name carescot \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "'"$ACCOUNT_ID"'.dkr.ecr.eu-west-2.amazonaws.com/carescot:latest",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "3000",
        "RuntimeEnvironmentVariables": {
          "DATABASE_URL": "postgresql://postgres:YOUR_DB_PASSWORD@YOUR_DB_ENDPOINT:5432/carescot?schema=public",
          "AUTH_SECRET": "YOUR_GENERATED_AUTH_SECRET",
          "AUTH_URL": "https://will-update-after-creation.awsapprunner.com",
          "STORAGE_PROVIDER": "local",
          "NODE_ENV": "production"
        }
      }
    },
    "AutoDeploymentsEnabled": false,
    "AuthenticationConfiguration": {
      "AccessRoleArn": "'"$ECR_ROLE_ARN"'"
    }
  }' \
  --instance-configuration '{
    "Cpu": "1024",
    "Memory": "2048"
  }' \
  --network-configuration '{
    "EgressConfiguration": {
      "EgressType": "VPC",
      "VpcConnectorArn": "'"$VPC_CONNECTOR_ARN"'"
    }
  }' \
  --health-check-configuration '{
    "Protocol": "HTTP",
    "Path": "/api/health",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  }' \
  --region eu-west-2
```

From the output, note down:
- `ServiceArn` — needed for GitHub Secrets
- `ServiceUrl` — your live app URL (e.g. `abc123.eu-west-2.awsapprunner.com`)

### 5e. Update AUTH_URL with the actual service URL

Once the service is created, update the `AUTH_URL` environment variable to match the service URL:

```bash
aws apprunner update-service \
  --service-arn arn:aws:apprunner:eu-west-2:${ACCOUNT_ID}:service/carescot/YOUR_SERVICE_ID \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "'"$ACCOUNT_ID"'.dkr.ecr.eu-west-2.amazonaws.com/carescot:latest",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "3000",
        "RuntimeEnvironmentVariables": {
          "DATABASE_URL": "postgresql://postgres:YOUR_DB_PASSWORD@YOUR_DB_ENDPOINT:5432/carescot?schema=public",
          "AUTH_SECRET": "YOUR_GENERATED_AUTH_SECRET",
          "AUTH_URL": "https://YOUR_SERVICE_URL.eu-west-2.awsapprunner.com",
          "STORAGE_PROVIDER": "local",
          "NODE_ENV": "production"
        }
      }
    },
    "AutoDeploymentsEnabled": false,
    "AuthenticationConfiguration": {
      "AccessRoleArn": "'"$ECR_ROLE_ARN"'"
    }
  }' \
  --region eu-west-2
```

---

## 6. Set Up GitHub OIDC Authentication

This lets GitHub Actions authenticate with AWS without storing long-lived access keys.

### 6a. Create the OIDC identity provider in AWS

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### 6b. Create the IAM role for GitHub Actions

Replace `YOUR_GITHUB_ORG` and `YOUR_REPO_NAME` with your actual values:

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

cat > /tmp/github-oidc-trust.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:Rahelio/care-scot:ref:refs/heads/main"
      }
    }
  }]
}
EOF

aws iam create-role \
  --role-name carescot-github-actions \
  --assume-role-policy-document file:///tmp/github-oidc-trust.json
```

### 6c. Attach permissions to the role

```bash
# ECR push/pull
cat > /tmp/github-actions-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "arn:aws:ecr:eu-west-2:${ACCOUNT_ID}:repository/carescot"
    },
    {
      "Effect": "Allow",
      "Action": [
        "apprunner:UpdateService",
        "apprunner:DescribeService"
      ],
      "Resource": "arn:aws:apprunner:eu-west-2:${ACCOUNT_ID}:service/carescot/*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name carescot-github-actions \
  --policy-name carescot-deploy \
  --policy-document file:///tmp/github-actions-policy.json
```

Get the role ARN:

```bash
aws iam get-role \
  --role-name carescot-github-actions \
  --query "Role.Arn" --output text
```

This outputs something like `arn:aws:iam::123456789012:role/carescot-github-actions`.

---

## 7. Add GitHub Secrets

Go to your GitHub repository: **Settings > Secrets and variables > Actions > New repository secret**.

Add these two secrets:

| Secret Name              | Value                                                         |
| ------------------------ | ------------------------------------------------------------- |
| `AWS_ROLE_ARN`           | `arn:aws:iam::123456789012:role/carescot-github-actions`      |
| `APP_RUNNER_SERVICE_ARN` | `arn:aws:apprunner:eu-west-2:123456789012:service/carescot/…` |

You can find the service ARN with:

```bash
aws apprunner list-services --region eu-west-2 \
  --query "ServiceSummaryList[?ServiceName=='carescot'].ServiceArn" --output text
```

---

## 8. Test the Pipeline

Push a commit to `main`:

```bash
git add .
git commit -m "Add CI/CD pipeline"
git push origin main
```

Then go to your GitHub repository **Actions** tab and watch the workflow run. It will:

1. **Lint & Type Check** — install deps, generate Prisma client, run ESLint + tsc
2. **Build & Deploy** — build the Docker image, push to ECR, update App Runner, wait for deployment

The first deployment takes around 5-8 minutes. Subsequent deployments are faster.

Once complete, visit your App Runner service URL to see the live app.

---

## 9. Custom Domain (Optional)

To use a custom domain instead of the default `*.awsapprunner.com` URL:

```bash
aws apprunner associate-custom-domain \
  --service-arn YOUR_SERVICE_ARN \
  --domain-name app.yourdomain.com \
  --region eu-west-2
```

This returns DNS validation records. Add them to your domain's DNS settings (CNAME records). Once validated, App Runner provisions a TLS certificate automatically.

Remember to update the `AUTH_URL` environment variable on the App Runner service to match your custom domain.

---

## 10. Schedule the Compliance-Check Cron

> **Heads up:** these EventBridge/Scheduler commands are less commonly used than the rest of this manual and haven't been run against a real AWS account while writing this — double-check flag names against the current AWS CLI docs if anything errors, rather than assuming a typo in your setup.

The app has a `POST /api/cron/check-compliance` endpoint that generates notifications for expiring PVG/SSSC/training, overdue reviews/plans/policies, and stale incidents. It does nothing on its own — something has to call it on a schedule. It's gated by a bearer token, so nothing runs unless `CRON_SECRET` is set both on the App Runner service and in the scheduler config below.

### 10a. Generate and set CRON_SECRET

```bash
openssl rand -base64 32
```

Add this as a `CRON_SECRET` runtime environment variable on the App Runner service (same way `DATABASE_URL`/`AUTH_SECRET` are set in step 5d) and redeploy.

### 10b. Create an EventBridge connection + API destination

```bash
aws events create-connection \
  --name carescot-cron-connection \
  --authorization-type API_KEY \
  --auth-parameters '{
    "ApiKeyAuthParameters": {
      "ApiKeyName": "Authorization",
      "ApiKeyValue": "Bearer YOUR_CRON_SECRET"
    }
  }' \
  --region eu-west-2

# Note the ConnectionArn from the output, then:
aws events create-api-destination \
  --name carescot-check-compliance \
  --connection-arn YOUR_CONNECTION_ARN \
  --invocation-endpoint "https://YOUR_SERVICE_URL/api/cron/check-compliance" \
  --http-method POST \
  --region eu-west-2
```

Note the `ApiDestinationArn` from the output — needed below.

### 10c. Create an IAM role EventBridge Scheduler can assume

```bash
cat > /tmp/scheduler-trust.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "scheduler.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role \
  --role-name carescot-scheduler-role \
  --assume-role-policy-document file:///tmp/scheduler-trust.json

cat > /tmp/scheduler-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "events:InvokeApiDestination",
    "Resource": "YOUR_API_DESTINATION_ARN"
  }]
}
EOF

aws iam put-role-policy \
  --role-name carescot-scheduler-role \
  --policy-name invoke-compliance-check \
  --policy-document file:///tmp/scheduler-policy.json
```

### 10d. Create the daily schedule

```bash
aws scheduler create-schedule \
  --name carescot-check-compliance-daily \
  --schedule-expression "rate(1 day)" \
  --flexible-time-window '{"Mode": "OFF"}' \
  --target '{
    "Arn": "YOUR_API_DESTINATION_ARN",
    "RoleArn": "YOUR_SCHEDULER_ROLE_ARN"
  }' \
  --region eu-west-2
```

### 10e. Verify it actually runs

Trigger it manually once to confirm the whole chain works before waiting for the schedule:

```bash
curl -X POST https://YOUR_SERVICE_URL/api/cron/check-compliance \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Should return `{"checked": N, "failed": 0, "results": [...]}`. If `failed` is 0 and `checked` matches your active org count, notifications for any due compliance items should now appear in-app.

---

## 11. Configure Third-Party Services (Sentry, SES, Stripe, Turnstile)

All of these are optional in the sense that the app boots and runs fine without them (each integration safely no-ops when its env vars are unset — see `.env.example` for the full list and what each one does). They're required before real customers use the product, though.

### 11a. Sentry (error tracking)

Create a project at sentry.io, then set on the App Runner service: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` (same value), and for readable stack traces in production, `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` so the build step can upload source maps.

### 11b. AWS SES (email)

1. Verify a sending domain or address in the SES console (same AWS account/region as everything else).
2. Request production access — SES starts in sandbox mode, where only verified recipient addresses can receive mail. This blocks real signups until lifted.
3. Set `SES_FROM_ADDRESS` on the App Runner service to the verified address.

### 11c. Stripe (billing)

1. Create a Stripe account (test mode is fine to start). Get the secret key from the Dashboard and set `STRIPE_SECRET_KEY` on App Runner.
2. Create a recurring Price with `graduated` tiered pricing, one tier per 5-seat block, for both a monthly and annual interval. Set the resulting Price IDs as `STRIPE_PRICE_MONTHLY_BLOCK`/`STRIPE_PRICE_ANNUAL_BLOCK`.
3. Add a webhook endpoint in the Stripe Dashboard pointing at `https://YOUR_SERVICE_URL/api/webhooks/stripe`, subscribed to at minimum: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. To comp a pilot customer's seats: create a 100%-off coupon in the Stripe Dashboard, generate a promotion code from it, and give that code to the pilot — they redeem it themselves during Checkout (the checkout flow has `allow_promotion_codes` enabled).

### 11d. Cloudflare Turnstile (signup CAPTCHA)

Create a free Turnstile widget at the Cloudflare dashboard for your domain. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` on App Runner. Without these, `/signup` has no CAPTCHA — rate limiting alone still applies, but bots aren't blocked at the form level.

---

## 12. Troubleshooting

### Build fails at `npm ci`
Check that `package-lock.json` is committed to git. The Docker build runs `npm ci` which requires it.

### Prisma migration fails on startup
The container runs `prisma migrate deploy` before starting the server. If this fails:
- Check `DATABASE_URL` is correct in App Runner environment variables
- Verify the VPC Connector is attached and the security group allows port 5432
- Check App Runner logs: **AWS Console > App Runner > your service > Logs**

### App Runner can't pull from ECR
Verify the `carescot-apprunner-ecr-role` has the `AWSAppRunnerServicePolicyForECRAccess` policy attached and is set as the access role on the service.

### GitHub Actions fails at "Configure AWS credentials"
- Verify the OIDC provider exists in IAM
- Check the trust policy `sub` condition matches your repo and branch exactly
- Ensure the role ARN in GitHub Secrets is correct

### App Runner health check fails
The health check is configured to hit `/api/health`. If this endpoint is missing or returns an error, check the build includes `src/app/api/health/route.ts`.

### Viewing App Runner logs
```bash
aws apprunner list-operations \
  --service-arn YOUR_SERVICE_ARN \
  --region eu-west-2

# Or view via the AWS Console:
# App Runner > Services > carescot > Logs
```

---

## Architecture Diagram

```
Developer                GitHub                    AWS
   |                       |                        |
   |  git push main        |                        |
   |---------------------->|                        |
   |                       |  Actions Workflow       |
   |                       |----.                    |
   |                       |    | 1. Lint + Typecheck|
   |                       |    | 2. Docker Build    |
   |                       |<---'                    |
   |                       |                        |
   |                       |  3. Push Image ------->| ECR
   |                       |                        |
   |                       |  4. Update Service --->| App Runner
   |                       |                        |   |
   |                       |                        |   | 5. Pull image from ECR
   |                       |                        |   | 6. Run migrations
   |                       |                        |   | 7. Start server
   |                       |                        |   |
   |                       |                        |   |----> RDS PostgreSQL
   |                       |                        |          (via VPC Connector)
```
