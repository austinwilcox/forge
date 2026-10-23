# syntax=docker/dockerfile:1.7

# ── Build ─────────────────────────────────────────────────────────────────────
# Runs on the build machine's native arch. The Nitro output is plain JS plus
# better-sqlite3 prebuilds for every platform, so one build serves amd64 and
# arm64 (Raspberry Pi 4/5) without slow emulated compiles.
FROM --platform=$BUILDPLATFORM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
ARG APP_COMMIT=
ENV APP_COMMIT=${APP_COMMIT}
COPY . .
RUN pnpm build && mkdir -p /out/data

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATABASE_PATH=/data/forge.db
WORKDIR /app
COPY --from=build --chown=node:node /app/.output ./.output
# No RUN steps here: the arm64 image assembles without CPU emulation.
COPY --from=build --chown=node:node /out/data /data
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", ".output/server/index.mjs"]
