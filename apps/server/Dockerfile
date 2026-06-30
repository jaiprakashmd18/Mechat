# ── Build stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./package.json
COPY apps/server/package.json ./apps/server/package.json
RUN npm install --workspace=apps/server --include-workspace-root

COPY apps/server ./apps/server
RUN npm run prisma:generate --workspace=apps/server
RUN npm run build --workspace=apps/server

# ── Production stage ─────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S mechat && adduser -S mechat -G mechat

COPY package.json ./package.json
COPY apps/server/package.json ./apps/server/package.json
RUN npm install --workspace=apps/server --include-workspace-root --omit=dev

COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/prisma ./apps/server/prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

RUN mkdir -p /app/apps/server/uploads && chown -R mechat:mechat /app

USER mechat
WORKDIR /app/apps/server

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', r => process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/index.js"]
