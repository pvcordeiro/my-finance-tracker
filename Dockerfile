FROM oven/bun:alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN bun run build



FROM oven/bun:alpine

WORKDIR /app

RUN apk add --no-cache curl

RUN addgroup -g 1001 -S nodejs && \
	adduser -S nextjs -u 1001

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN mkdir -p /app/data && \
	chown -R nextjs:nodejs /app

USER nextjs

ENV NODE_ENV=production \
	PORT=3000

EXPOSE 3000

LABEL org.opencontainers.image.title="My Finance Tracker" \
	org.opencontainers.image.description="Self-hosted personal finance tracker with multi-user and group support" \
	org.opencontainers.image.url="https://github.com/pvcordeiro/my-finance-tracker" \
	org.opencontainers.image.vendor="pvcordeiro" \
	org.opencontainers.image.licenses="MIT"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
	CMD curl -f http://localhost:3000/ || exit 1

# Use entrypoint script
ENTRYPOINT ["/entrypoint.sh"]
