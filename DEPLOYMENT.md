# Praivox — Deployment Portability

This document responds directly to the two Deployment Requirements
addendums (Multi-Platform Hosting, and Cloud & Server Hosting) and
records how each acceptance criterion is met.

---

## 1. Multi-Platform Hosting addendum

### Current state
Deployed on Vercel today. This section confirms nothing below ties the
app to Vercel specifically.

### Vercel-specific features audit
The codebase was audited for hard dependencies on Vercel-only
infrastructure:

| Feature | Used? | Notes |
|---|---|---|
| Vercel KV | No | — |
| Vercel Edge Config | No | — |
| Vercel Cron (`vercel.json`) | No | Scheduling lives in n8n (external, cloud-hosted), which calls a plain `/api/cron/ingest` route — this already works identically on any host |
| Vercel Image Optimization | No | `next.config.mjs` sets `images.unoptimized: true` |
| `@vercel/analytics` | Yes | The only Vercel-specific package. It no-ops silently on any other host (confirmed by design of the package) — it does not throw errors or break the build elsewhere. Safe to leave in; can be removed with a one-line change in `app/layout.tsx` if the client wants zero Vercel references |

**Conclusion:** the app has no hard Vercel lock-in. The scheduled
aggregation workflow's independence from Vercel (it lives in n8n) was
already a deliberate architecture choice made earlier in the build,
and it directly satisfies this addendum's core requirement.

### Where else this build runs, with configuration changes only
- **Netlify** — supports Next.js server rendering + API routes natively via its Next.js runtime. Set the same environment variables in Netlify's dashboard.
- **Render / Railway / Fly.io / DigitalOcean App Platform** — all run a standard `npm run build && npm start` Node.js server. This is exactly what this app is (no static export). Point each at this repo, set env vars, done.
- **Cloudflare Pages** — needs the `@cloudflare/next-on-pages` adapter, since Cloudflare's runtime differs from Node.js. Not configured in this build by default (only worth adding if the client specifically picks Cloudflare).

### What *can't* run on static-only hosting
This app is **not a static site** — it has:
- Server-side authentication (session cookies, checked in `proxy.ts`)
- Live database reads/writes on every request (Prisma + Postgres)
- API routes (`/api/admin/*`, `/api/cron/ingest`)

So any platform that only offers static file hosting (e.g. plain GitHub
Pages, or Cloudflare Pages *without* the Next.js adapter) cannot run
the admin panel or the aggregation ingest endpoint. Every platform
listed above supports a Node.js server runtime, so this doesn't
apply to any of them — it's noted here only because the addendum asks
for it to be documented explicitly.

---

## 2. Cloud & Server Hosting addendum

### Containerization
A `Dockerfile` (multi-stage build) and `docker-compose.yml` are
included at the project root. The image:
- Runs `prisma generate` and `next build` in a build stage
- Produces a minimal production image using Next.js's `standalone`
  output mode (set in `next.config.mjs`)
- Takes all configuration via environment variables at *run time* —
  nothing is baked into the image

This same image runs unmodified on:
- **AWS** — ECS/Fargate, EC2 (via `docker run`), or Lightsail
- **Azure** — Container Apps, or App Service (container mode)
- **Google Cloud Platform** — Cloud Run, or Compute Engine
- **Any self-hosted VPS** — via `docker compose up -d`

### Build & run
```
docker build -t praivox .
docker run -p 3000:3000 --env-file .env.production praivox
```
or, for a full self-hosted stack including Postgres:
```
docker compose up -d
```

### The scheduled aggregation workflow
This already runs as an **externally-triggered process** (n8n, cloud-
hosted), calling a plain HTTPS endpoint (`/api/cron/ingest`) on a
schedule. This satisfies the addendum's requirement directly — it was
never tied to Vercel Cron or any serverless-platform-specific
scheduler. Moving the web app to AWS/Azure/GCP/a VPS requires no
change to the scheduling approach: n8n just points its HTTP node at
the new URL.

If n8n itself needs to be self-hosted (rather than n8n.cloud), it also
runs from an official Docker image, so it fits the same
containerized-deployment story.

### Data store
Currently Neon (managed Postgres). Nothing in the codebase depends on
a Neon-specific feature — it's a standard `DATABASE_URL` connection
string read by Prisma. Any standard Postgres works as a drop-in
replacement:
- AWS RDS for Postgres
- Azure Database for PostgreSQL
- Google Cloud SQL for Postgres
- A self-hosted Postgres container (see `docker-compose.yml`, which
  includes an optional `db` service for exactly this case)

Swapping providers is a one-line `DATABASE_URL` change — no code
changes, no migration-tooling changes (Prisma's migration files are
already plain, provider-agnostic SQL for Postgres).

### Acceptance criteria — status

| Criterion | Status |
|---|---|
| Full stack stands up on a fresh cloud VM/VPS from container + config alone | ✅ `Dockerfile` + `docker-compose.yml` provided |
| No Vercel-specific dependency | ✅ Audited above; only `@vercel/analytics`, which degrades gracefully |
| Scheduled workflow keeps working (incl. concurrency gate) regardless of host | ✅ Workflow lives in n8n, independent of where the web app is hosted; concurrency gate logic lives in `lib/aggregate.ts`, runs identically anywhere the app is deployed |
| Same codebase redeploys to at least one alternative platform, config-only | ✅ Render/Railway/Fly.io/DigitalOcean App Platform all work with zero code changes (see Section 1) |
