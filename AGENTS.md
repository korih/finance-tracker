<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Finance Tracker — Project Guide

## Stack
- **Framework:** Next.js 16 (App Router, server components, server actions)
- **Runtime:** Cloudflare Workers via `@opennextjs/cloudflare`
- **Database:** Cloudflare D1 (SQLite) — accessed via `getDB()` from `src/lib/db.ts`
- **Auth:** Auth.js v5 with Google OAuth (JWT strategy, no DB adapter)
- **AI:** Cloudflare Workers AI binding (`env.AI`)

## Architecture

### Data flow
Transactions enter via a GET ingest endpoint (`/api/ingest?id=<api_id>&merchant=...&amount=...&card=...`). There is no Google Sheets integration. Each user has one account (`user_accounts` table) with a stable `spreadsheet_id` (UUID) used as a namespace across all data tables.

### Key tables
`user_accounts`, `transactions`, `income_entries`, `categories`, `recurring_rules`, `savings_goals`

All data tables have `spreadsheet_id` and `user_id` columns for namespacing.

### Auth ID
`session.user.id` = Google OAuth `providerAccountId` (numeric). Pinned in the JWT callback via `account.providerAccountId` so it never changes across sign-out/sign-in cycles.

## Conventions
- `params` and `searchParams` in page/layout components are **Promises** — always `await` them
- Server actions must call `auth()` and check `session?.user?.id` before doing anything
- D1 does not support `BEGIN`/`COMMIT` via the HTTP API — use `db.batch()` for atomic operations
- Migrations live in `migrations/` — apply with `npx wrangler d1 migrations apply DB --local` (dev) or `--remote` (prod)
