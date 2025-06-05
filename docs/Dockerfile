# Use the official Node.js 18 image as the base
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Add libc6-compat for compatibility with certain Node.js versions
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
COPY next.config.mjs ./
COPY tsconfig.json ./
COPY postcss.config.mjs ./
COPY source.config.ts ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry (optional but recommended for production)
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Create a production image
FROM base AS runner
WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package files and config files needed for production dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/source.config.ts ./
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/tsconfig.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy the built application files
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/.source ./.source

# Switch to non-root user
USER nextjs

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=3005

# Expose the port
EXPOSE 3005

# Start the application
CMD ["npm", "start"]