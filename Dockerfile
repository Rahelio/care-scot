# ── Stage 1: Install dependencies ─────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build the application ───────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# ── Stage 3: Production-only dependencies ─────────────────────────────
FROM node:20-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 4: Production runner ────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache libc6-compat
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy Prisma schema + migrations (needed for migrate deploy)
COPY --from=builder /app/prisma ./prisma

# Copy Next.js standalone output (includes server.js + traced node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Overlay ALL production node_modules (adds prisma CLI + transitive deps like effect)
COPY --from=prod-deps /app/node_modules ./node_modules

# Overlay generated Prisma client with correct Alpine engine binary
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && HOSTNAME=0.0.0.0 node server.js"]
