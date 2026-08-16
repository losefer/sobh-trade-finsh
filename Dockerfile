# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm via standalone script (no corepack, no npm global)
RUN wget -qO /bin/pnpm "https://github.com/pnpm/pnpm/releases/latest/download/pnpm-linuxstatic-x64" && chmod +x /bin/pnpm

# Copy workspace config files first
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

# Copy lib packages
COPY lib/ ./lib/

# Copy artifacts
COPY artifacts/ ./artifacts/

# Copy attached assets if needed
COPY attached_assets/ ./attached_assets/ 2>/dev/null || true

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build frontend
RUN pnpm --filter @workspace/attendance run build

# Build backend
RUN pnpm --filter @workspace/api-server run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/attendance/dist ./artifacts/attendance/dist

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "artifacts/api-server/dist/index.mjs"]