# Vishnu Finance

India-focused personal finance app: bank PDF import, salary-scaled phase planning, plan adherence, AI advisor, and net worth tracking.

**Stack:** Next.js 16 · React 19 · PostgreSQL (Supabase) · Prisma · Capacitor mobile · Python PDF parser · Google Gemini (free tier)

**Live:** https://vishun-finance.vercel.app/

---

## Quick start

```bash
cp .env.example .env.local
# Fill DATABASE_URL, JWT_SECRET, GOOGLE_API_KEY (see .env.example)

npm install
npm run db:push          # apply Prisma schema
npm run dev              # Next.js on :3000
npm run python:dev       # optional: local Python parser on :8000
```

---

## Main routes

| Route | Purpose |
|-------|---------|
| `/dashboard` | Net flow, safe-to-spend, plan adherence |
| `/transactions` | Import bank PDFs, recurring detection, CSV export |
| `/plans` / `/phase-plan` | Salary-scaled phase plan |
| `/advisor` | AI copilot (Gemini, guardrailed) |
| `/financial-health` | Health score |
| `/investments` | MF research (mfdata.in), retirement sim, CAS upload |
| `/settings` | Profile, net worth, categories, exports |

---

## Environment variables

See [`.env.example`](./.env.example) for the full list. Required for local dev:

- `DATABASE_URL` / `DIRECT_URL` — Supabase PostgreSQL
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — auth (min 32 chars)
- `GOOGLE_API_KEY` — Gemini advisor

Optional free-tier integrations:

- `SENTRY_DSN` — error tracking
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — distributed rate limits
- `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` — background jobs
- `CRON_SECRET` — protect `/api/cron/*` (Bearer token)

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm test` | Vitest unit tests |
| `npm run lint` | ESLint |
| `npm run db:studio` | Prisma Studio |

---

## Mobile (Capacitor)

The supported mobile path is **Capacitor** wrapping the deployed web app.

```bash
npx cap sync android
npx cap open android
```

---

## Architecture highlights

- **PDF import moat** — Python parser on Vercel; no paid Account Aggregator required
- **API auth** — `withAuth()` on sensitive routes; JWT middleware for pages
- **Free observability** — Sentry (optional), GitHub Actions CI
- **Deferred paid features** — documented in [`docs/DEFERRED_PAID_FEATURES.md`](./docs/DEFERRED_PAID_FEATURES.md)

---

## CI

GitHub Actions runs lint → test → build on push/PR (see [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)).

---

## License

Private project — all rights reserved.
