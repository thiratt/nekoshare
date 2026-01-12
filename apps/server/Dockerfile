FROM node:24.11.1-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS builder
RUN npm install
COPY . .
RUN npm run build

FROM base AS prod-deps
RUN npm install --omit=dev && npm cache clean --force

FROM node:24.11.1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json .

CMD ["node", "dist/index.js"]