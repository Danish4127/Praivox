# Praivox — Docker image for cloud/server deployment (AWS, Azure, GCP, or
# any self-managed VPS). This satisfies the "Cloud & Server Hosting"
# deployment addendum - the app runs the same way in a container
# regardless of which cloud/host it lands on.
#
# Build:  docker build -t praivox .
# Run:    docker run -p 3000:3000 --env-file .env.production praivox
#
# All configuration (DATABASE_URL, ADMIN_EMAIL, SESSION_SECRET, etc.)
# is passed in via environment variables at run time - nothing is
# baked into the image, per the addendum's "externalized config" requirement.

# ---- Stage 1: install dependencies ----
FROM node:20-slim AS deps
WORKDIR /app
# openssl is required by Prisma's query engine on Debian-based images
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci

# ---- Stage 2: build the app ----
FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL isn't needed to build - prisma generate only reads the
# schema file, it doesn't connect to a real database at build time.
RUN npx prisma generate
RUN npm run build

# ---- Stage 3: run the app ----
FROM node:20-slim AS runner
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
# Next.js standalone server binds to "localhost" by default - inside a
# container, that's only reachable from WITHIN the container itself.
# Railway (and most cloud platforms) proxy traffic in from OUTSIDE the
# container, which needs the app listening on 0.0.0.0 (all network
# interfaces). Without this, you get "Application failed to respond"
# even though the app is running fine and the port matches.
ENV HOSTNAME=0.0.0.0

# Next.js "standalone" output already contains a minimal server + the
# node_modules it actually needs - but Prisma's engine binaries need to
# be copied in explicitly (a well-known gap in Next's file tracing).
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000
CMD ["node", "server.js"]
