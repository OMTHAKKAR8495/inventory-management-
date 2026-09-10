# ==============================================================================
# ProvisionSmart — Production Multi-Stage Dockerfile
# ==============================================================================

# Stage 1: Base image with native compilation dependencies
FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: Install all dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Stage 3: Build the Next.js application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 4: Minimal production runner
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user and persistent storage directories
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/data/backups /app/data/uploads && \
    chown -R nextjs:nodejs /app/data

# Copy built application assets and dependencies
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

VOLUME ["/app/data"]

CMD ["npm", "run", "start"]
