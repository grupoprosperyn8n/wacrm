FROM node:22-alpine AS base

# Build-time args for Next.js (needed because next-intl inlines messages)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_LOCALE=en

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_LOCALE=$NEXT_PUBLIC_APP_LOCALE

WORKDIR /app

# Install build toolchain (Python needed for node-gyp deps)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json ./

# Install ALL deps (devDependencies needed for next build)
RUN npm install

# Copy source
COPY . .

# Build
RUN npm run build

# Production image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Copy built artifacts from build stage
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/next.config.ts ./
COPY --from=base /app/src/i18n ./src/i18n
COPY --from=base /app/messages ./messages

EXPOSE 3000

CMD ["npm", "start"]
