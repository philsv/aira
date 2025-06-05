FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package files
COPY --from=builder /app/package*.json ./

# Install production dependencies
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production
ENV BACKEND_URL=http://localhost:8000
ENV NEXT_PUBLIC_UI_LANGUAGE=de

CMD ["npm", "start"]