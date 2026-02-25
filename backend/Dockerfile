# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: deps — install production dependencies only
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy manifests only (layer cache: only re-runs if package.json changes)
COPY package.json package-lock.json* ./

RUN npm ci --omit=dev --ignore-scripts


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: build — compile TypeScript
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Install ALL dependencies (including devDeps for tsc)
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copy source and compile
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN npm run build


# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: production — lean final image
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy compiled output + production node_modules
COPY --from=build   /app/dist        ./dist
COPY --from=deps    /app/node_modules ./node_modules
COPY package.json ./

# Create uploads directory with correct permissions
RUN mkdir -p uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

# Health check — Docker will mark container unhealthy if this fails
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health/ping || exit 1

CMD ["node", "dist/server.js"]


# ─────────────────────────────────────────────────────────────────────────────
# Stage 4: development — hot reload with tsx
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS development

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

EXPOSE 3000

CMD ["npm", "run", "dev"]
