# Stage 1: Build the types and server
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy monorepo configuration and workspace metadata
COPY package*.json ./
COPY apps/server/package*.json ./apps/server/
COPY packages/types/package*.json ./packages/types/

# Install dependencies for all workspaces
RUN npm ci

# Copy workspace source files
COPY packages/types ./packages/types
COPY apps/server ./apps/server

# Build types and server
RUN npm run build --workspace=@william/types
RUN npm run build --workspace=@william/server

# Stage 2: Production runtime environment
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

COPY package*.json ./
COPY apps/server/package*.json ./apps/server/
COPY packages/types/package*.json ./packages/types/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compilation artifacts from builder stage
COPY --from=builder /usr/src/app/packages/types/dist ./packages/types/dist
COPY --from=builder /usr/src/app/apps/server/dist ./apps/server/dist

EXPOSE 3005

ENV NODE_ENV=production
ENV PORT=3005

CMD ["npm", "run", "start", "--workspace=@william/server"]
