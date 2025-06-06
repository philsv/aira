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
COPY . .

# Copy the built application files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/.source ./.source

# Set environment variables for production
ENV NODE_ENV=production

# Expose the port
EXPOSE 3007

# Start the application
CMD ["next", "start", "-p", "3007"]