FROM node:24.11.1-alpine3.22 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/app-ui/package.json packages/app-ui/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/nk-websocket/package.json packages/nk-websocket/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
RUN pnpm install --frozen-lockfile --filter web...

FROM deps AS build
ARG WEB_API_BASE_URL
ARG WEB_WS_BASE_URL
COPY apps/web apps/web
COPY packages/app-ui packages/app-ui
COPY packages/ui packages/ui
COPY packages/contracts packages/contracts
COPY packages/nk-websocket packages/nk-websocket
COPY packages/eslint-config packages/eslint-config
COPY packages/typescript-config packages/typescript-config
RUN VITE_API_BASE_URL="$WEB_API_BASE_URL" VITE_WS_BASE_URL="$WEB_WS_BASE_URL" pnpm -C apps/web build

FROM nginxinc/nginx-unprivileged:1.29-alpine-slim AS runner
COPY apps/web/docker/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
