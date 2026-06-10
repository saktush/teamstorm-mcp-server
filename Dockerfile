# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Use Russian npm mirror
RUN npm config set registry https://registry.npmmirror.com

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:24-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Copy package files
COPY package*.json ./

# Use Russian npm mirror
RUN npm config set registry https://registry.npmmirror.com

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Entrypoint: start the server in HTTP mode
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'exec node dist/index.js "$@"' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh && \
    chown appuser:appgroup /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
