# Finance Tracker

Personal finance dashboard powered by Next.js, Cloudflare Workers, and D1.

## Local development

```bash
npm install
npm run dev        # Next.js dev server with Turbopack at http://localhost:3000
```

### Local database

```bash
# Apply all pending migrations to the local D1 database
npx wrangler d1 migrations apply finance-tracker-db --local

# Check which migrations have / haven't been applied locally
npx wrangler d1 migrations list finance-tracker-db --local
```

### Preview (Cloudflare Workers runtime, local)

Builds the Worker bundle and runs it locally via `wrangler dev`:

```bash
npm run preview
```

---

## Production deployment

### 1. Apply database migrations (remote D1)

Always run this **before** deploying code that introduces new tables or columns:

```bash
# Check pending migrations
npx wrangler d1 migrations list finance-tracker-db --remote

# Apply pending migrations
npx wrangler d1 migrations apply finance-tracker-db --remote
```

### 2. Deploy the Worker

```bash
npm run deploy     # builds the Worker bundle then deploys via wrangler
```

Or as separate steps:

```bash
npm run build:worker          # compile with @opennextjs/cloudflare
npx wrangler deploy           # upload to Cloudflare
```

### Logs (production)

```bash
npx wrangler tail             # stream live logs from the production Worker
```

---

## Creating a new migration

```bash
# 1. Generate the migration file
npx wrangler d1 migrations create finance-tracker-db <migration-name>

# 2. Edit the generated SQL file in migrations/

# 3. Test locally first
npx wrangler d1 migrations apply finance-tracker-db --local

# 4. Apply to production
npx wrangler d1 migrations apply finance-tracker-db --remote
```
