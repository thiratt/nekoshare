FROM node:24.11.1-alpine3.22 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate
WORKDIR /workspace

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/i18n/package.json packages/i18n/package.json
RUN pnpm install --frozen-lockfile --filter server...

FROM deps AS build
COPY apps/server apps/server
COPY packages/contracts packages/contracts
COPY packages/eslint-config packages/eslint-config
COPY packages/i18n packages/i18n
RUN pnpm -C apps/server build
RUN if [ -f /workspace/apps/server/.package.prod.json ]; then \
      mkdir -p /prod/server && \
      cp /workspace/apps/server/.package.prod.json /prod/server/package.json && \
      cd /prod/server && \
      pnpm install --prod --no-frozen-lockfile --config.auto-install-peers=false; \
    else \
      pnpm --filter server deploy --prod --legacy /prod/server; \
    fi

FROM node:24.11.1-alpine3.22 AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /prod/server ./
COPY --from=build /workspace/apps/server/dist ./dist
COPY --from=build /workspace/apps/server/drizzle ./drizzle

EXPOSE 7780 7781
CMD ["node", "dist/index.mjs"]
