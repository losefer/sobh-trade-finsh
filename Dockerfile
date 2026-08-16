# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm via npm (PATH is set correctly in Alpine)
RUN npm install -g pnpm@10.13.1

# Copy workspace config files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

# Copy source packages
COPY lib/ ./lib/
COPY artifacts/ ./artifacts/
COPY attached_assets/ ./attached_assets/

# Install all dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build frontend then backend
RUN pnpm --filter @workspace/attendance run build
RUN pnpm --filter @workspace/api-server run build

# Production stage (lean image)
FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/attendance/dist ./artifacts/attendance/dist

EXPOSE 5000
ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "artifacts/api-server/dist/index.mjs"]