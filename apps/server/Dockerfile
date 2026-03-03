FROM node:24.11.1-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile --filter server...

FROM deps AS build
COPY apps/server apps/server
COPY packages/contracts packages/contracts
RUN pnpm -C apps/server build

FROM build AS prod-deps
RUN pnpm --filter server deploy --prod --legacy /prod/server

FROM node:24.11.1-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod-deps /prod/server/node_modules ./node_modules
COPY --from=prod-deps /prod/server/package.json ./package.json
COPY --from=build /workspace/apps/server/dist ./dist

EXPOSE 7780 7781
CMD ["node", "dist/index.js"]
