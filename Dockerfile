# Build stage
FROM node:22-slim AS builder

WORKDIR /app

RUN npm install -g pnpm@10.13.1

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./
COPY lib/ ./lib/
COPY artifacts/ ./artifacts/
COPY attached_assets/ ./attached_assets/

RUN pnpm install --frozen-lockfile --ignore-scripts

RUN pnpm --filter @workspace/attendance run build
RUN pnpm --filter @workspace/api-server run build

# Production stage - keep all node_modules needed at runtime
FROM node:22-slim AS runner

WORKDIR /app

RUN npm install -g pnpm@10.13.1

# Copy workspace files for pnpm to work
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./
COPY lib/ ./lib/
COPY artifacts/api-server/package.json ./artifacts/api-server/package.json
COPY artifacts/api-server/tsconfig.json ./artifacts/api-server/tsconfig.json

# Install only production deps
RUN pnpm install --frozen-lockfile --ignore-scripts --prod

# Copy built dist files
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/attendance/dist ./artifacts/attendance/dist

EXPOSE 5000
ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "artifacts/api-server/dist/index.mjs"]