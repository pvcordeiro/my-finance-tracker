FROM oven/bun:alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
COPY . .

RUN bun install --frozen-lockfile
RUN bun run build



FROM oven/bun:alpine

WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production

CMD ["bun", "server.js"]
