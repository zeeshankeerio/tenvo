# Tenvo

Multi-tenant business operations platform: inventory, finance, POS, storefront, CRM, and industry-specific hubs. Built with Next.js App Router, Prisma, and PostgreSQL.

**Copyright © 2024-2026 [Mindscape Analytics LLC](https://www.mindscapeanalytics.com). All rights reserved.**  
This repository is proprietary software. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE). Unauthorized copying or distribution is prohibited.

## Prerequisites

- Node.js 20+ (or [Bun](https://bun.sh))
- PostgreSQL database (Supabase, Neon, RDS, or local)

## Local setup

1. Clone the repository and install dependencies:

   ```bash
   bun install
   # or: npm install
   ```

2. Copy environment template and fill values:

   ```bash
   cp .env.example .env.local
   ```

   Required for most flows: `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`. See `.env.example` for billing, auth, email, and AI keys.

3. Apply database migrations:

   ```bash
   bun run db:migrate
   ```

4. Start development:

   ```bash
   bun run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Validation before deploy

```bash
bun run validate:schema
bun run build
```

Full checklist: [docs/VALIDATION.md](./docs/VALIDATION.md).

## Deploy on Vercel

1. Import this repository in Vercel.
2. Set **Framework Preset** to Next.js (auto-detected).
3. Add environment variables from `.env.example` (production values). Minimum:
   - `DATABASE_URL`, `DIRECT_URL`
   - `BETTER_AUTH_SECRET` (32+ random characters)
   - `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` (your Vercel domain)
   - `BILLING_MODE`, Stripe or manual billing vars as needed
4. Build command: `bun run build` (or `npm run build`).
5. Install command: `bun install` (or `npm install`).
6. Optional: run `prisma migrate deploy` in a **Build** or post-deploy step if your pipeline does not run migrations separately.

Historical files under `archive/` and developer docs under `docs/` are excluded from deployment via `.vercelignore` but remain in git for reference.

## Documentation

| Topic | Location |
|-------|----------|
| Docs index | [docs/README.md](./docs/README.md) |
| Agent / workspace rules | [AGENTS.md](./AGENTS.md) |
| Database migrations | [docs/DATABASE_MIGRATIONS.md](./docs/DATABASE_MIGRATIONS.md) |
| Domain verticals | [docs/DOMAIN_VERTICALS.md](./docs/DOMAIN_VERTICALS.md) |
| Market readiness | [docs/MARKET_READINESS.md](./docs/MARKET_READINESS.md) |
| Windows migration helper | [docs/guides/WINDOWS_MIGRATION_SETUP.md](./docs/guides/WINDOWS_MIGRATION_SETUP.md) |

## Scripts (common)

| Command | Purpose |
|---------|---------|
| `bun run dev` | Development server |
| `bun run build` | Production build |
| `bun run lint` | ESLint |
| `bun run test` | Vitest |
| `bun run verify:domains` | Domain vertical wiring check |
| `bun run verify:mvp-launch` | MVP launch wiring check |

---

**Mindscape Analytics LLC** · [mindscapeanalytics.com](https://www.mindscapeanalytics.com) · Proprietary and confidential
