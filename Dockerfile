# syntax=docker/dockerfile:1

# Tech Triage Platform - Node.js Application
# Following Docker best practices from official documentation

ARG NODE_VERSION=20.18.0

# =====================================
# Base stage for shared configuration
# =====================================
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /usr/src/app
EXPOSE 3000

# =====================================
# Dependencies stage - install packages
# =====================================
FROM base AS deps
# Install dependencies separately to keep build caching efficient without BuildKit
COPY package.json package-lock.json ./
# Prisma generate runs in postinstall; schema must exist before `npm ci`.
COPY prisma ./prisma
RUN npm ci --include=dev

# =====================================
# Build stage - compile application
# =====================================
FROM deps AS build
# Copy source code and build the application
COPY . .
# Generate Prisma client
RUN npx prisma generate
# Build Next.js application (will fail if linting/type errors exist)
ENV DOCKER_BUILD=true
RUN npm run build

# =====================================
# Production dependencies
# =====================================
FROM base AS prod-deps
COPY package.json package-lock.json ./
# Prisma generate runs during `npm ci`, so copy schema before installing deps.
COPY prisma ./prisma
RUN npm ci --omit=dev

# =====================================
# Final production stage
# =====================================
FROM base AS final

# Use production node environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built application from build stage
COPY --from=build --chown=node:node /usr/src/app/.next/standalone ./
COPY --from=build --chown=node:node /usr/src/app/.next/static ./.next/static
COPY --from=build --chown=node:node /usr/src/app/public ./public

# Copy Prisma files for database operations
COPY --from=build --chown=node:node /usr/src/app/prisma ./prisma
COPY --from=build --chown=node:node /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=node:node /usr/src/app/node_modules/@prisma ./node_modules/@prisma

# Copy production dependencies
COPY --from=prod-deps --chown=node:node /usr/src/app/node_modules ./node_modules

# Copy the container startup script used for migrations/seeding
COPY --from=build --chown=node:node /usr/src/app/scripts/start.sh ./start.sh

# Ensure the startup script is executable before switching users
RUN chmod +x ./start.sh

# Run the application as a non-root user
USER node

# Run through the startup script so migrations and seeding work in any environment
CMD ["./start.sh"]
