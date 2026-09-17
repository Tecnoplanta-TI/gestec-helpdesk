FROM node:24-bookworm-slim AS dependencies

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-bookworm-slim AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_HELP_DESK_JORNADA_ONLY=false
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_HELP_DESK_JORNADA_ONLY=$NEXT_PUBLIC_HELP_DESK_JORNADA_ONLY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

RUN npm run db:generate
RUN npm run build

FROM node:24-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 gestec && \
    useradd --system --uid 1001 --gid gestec --create-home gestec

COPY --from=builder --chown=gestec:gestec /app/public ./public
COPY --from=builder --chown=gestec:gestec /app/.next/standalone ./
COPY --from=builder --chown=gestec:gestec /app/.next/static ./.next/static

RUN mkdir -p /app/storage/attachments && chown -R gestec:gestec /app/storage

USER gestec
EXPOSE 3000

CMD ["node", "server.js"]
