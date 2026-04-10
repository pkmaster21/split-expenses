# Tabby

A no-auth expense splitting PWA. Create a group via shareable link, add expenses with flexible splits, and get a simplified breakdown of who owes who — minimizing total settlement transactions.

Built as a portfolio project demonstrating full-stack TypeScript, AWS cloud-native deployment, and thoughtful API/data modeling.

## What it does

1. Alice creates a group ("Ski Trip 2026") and gets a shareable link
2. Friends open the link, enter their name, and join — no signup required
3. Anyone adds expenses with equal, exact, or percentage-based splits
4. The app computes a simplified settlement plan: the minimum number of transactions to zero out all balances

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + TypeScript + Tailwind CSS + TanStack Query (PWA) |
| Backend | Fastify 5 + TypeScript |
| Database | PostgreSQL via Neon (serverless) + Drizzle ORM |
| Hosting | AWS Lambda + API Gateway (backend) + Cloudflare Pages (frontend) |
| IaC | Terraform + Terraform Cloud |
| CI/CD | GitHub Actions |
| Monitoring | CloudWatch (backend) + Sentry (frontend) |

## Key Design Decisions

- **No auth** — identity is a name + httpOnly session cookie per group. No accounts, no friction.
- **Debt simplification** — a greedy algorithm computes net balances and pairs max creditors against max debtors to minimize settlement transactions (O(n log n), optimal for small groups).
- **Integer cents** — all arithmetic is done in integer cents internally; stored as `DECIMAL(10,2)` in Postgres. Never `FLOAT`.
- **On-the-fly balance computation** — balances are recomputed from raw `ExpenseSplit` records on each request. No cache to go stale.
- **Neon HTTP driver** — Drizzle connects to Neon via `@neondatabase/serverless`. Stateless per Lambda invocation — no connection pool config, no VPC required.
- **TanStack Query** — declarative server-state management on the frontend. Handles caching, background polling (12s interval), and online/offline coordination via `onlineManager`.
- **SSM Parameter Store** — secrets fetched at Lambda cold start, never in environment variables or source code.
- **Activity-based expiry** — groups expire 90 days after the last expense. Expired groups reject all write operations with `410 Gone`; read endpoints (balances, expenses) continue to work. Ghost members (those who left) remain in balance calculations to keep the ledger accurate.
- **Rate limiting** — global 100 requests/minute per IP; tighter limits on sensitive endpoints: 30 expense submissions/hour per member, 10 group joins/minute per IP.

## Architecture

```
Browser (React PWA)
    │  serves via
Cloudflare Pages
    │
    └─ /api/v1/*  → API Gateway (HTTP API)
                         │
                    Lambda (Fastify)
                         │
                  Neon PostgreSQL (Drizzle, HTTP driver)
```

## Monorepo Structure

```
split-expenses/
├── packages/
│   ├── api/          Fastify backend (Lambda-compatible)
│   ├── web/          React PWA (Vite + Tailwind)
│   └── shared/       Shared TypeScript types
├── infra/            Terraform (AWS infrastructure)
├── .github/
│   └── workflows/    GitHub Actions CI/CD
```

## Local Development

### Prerequisites

- Node.js 22+
- A [Neon](https://neon.tech) account with two databases: `tabby_prod` (production) and `tabby_test` (dev/test)

### First-Time Setup

```bash
# Install dependencies
npm install

# Build shared types
npm run build --workspace=packages/shared

# Copy env files and fill in your Neon connection strings
cp packages/api/.env.example packages/api/.env
cp packages/web/.env.example packages/web/.env

# Push schema to your Neon dev database
cd packages/api && npx drizzle-kit push
```

### Start Dev Servers

```bash
# Start API (port 3000)
npm run dev --workspace=packages/api

# Start web (port 5173)
npm run dev --workspace=packages/web
```

### Running Tests

Integration tests run against the Neon `tabby_test` database — no local database service required.

```bash
# Ensure DATABASE_URL is set in packages/api/.env, then:
cd packages/api

# Push schema to test DB (safe to run repeatedly)
npx drizzle-kit push --force

# Unit + integration tests
npx vitest run

# E2E tests (requires dev servers running)
cd ../web && npx playwright test
```

## API Reference

All routes prefixed `/api/v1`. OpenAPI docs at `/docs` when running locally.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/groups` | None | Create group + owner session |
| `GET` | `/groups/invite/:inviteCode` | None | Group metadata for join preview |
| `POST` | `/groups/invite/:inviteCode/join` | None | Join group, receive session |
| `GET` | `/groups/:id` | Session | Fetch group by stable ID |
| `GET` | `/groups/:id/members` | Session | List active members |
| `DELETE` | `/groups/:id/members/:memberId` | Admin+ | Remove member |
| `POST` | `/groups/:id/expenses` | Session | Add expense with splits |
| `GET` | `/groups/:id/expenses` | Session | List all expenses |
| `PATCH` | `/groups/:id/expenses/:expenseId` | Session | Edit expense |
| `DELETE` | `/groups/:id/expenses/:expenseId` | Session | Delete expense |
| `GET` | `/groups/:id/balances` | Session | Net balances + settlement plan. `Balance.netCents` and `Settlement.amount` are **integer cents** (divide by 100 for dollars). Includes ghost members (those who left) to keep the ledger accurate. |
| `PATCH` | `/groups/:id/settings` | Owner | Update name / regenerate invite |
| `GET` | `/groups/:id/activity` | Session | Activity log (most recent 50 entries) |

## Debt Simplification Algorithm

**Problem:** Given N people with various debts, find the minimum number of transactions to settle all balances.

**Approach:** Compute each person's net balance (total paid minus total owed). Then greedily pair the max creditor against the max debtor, settling the smaller amount, repeat until all balances zero.

**Complexity:** O(n log n) — fast enough for any realistic group size.

**Why greedy:** The exact minimum-transaction problem is NP-hard. Greedy is optimal or near-optimal for small groups (≤50 people) in negligible time.

## Roles & Permissions

| Action | Member | Admin | Owner |
|--------|--------|-------|-------|
| Add expenses | ✅ | ✅ | ✅ |
| Edit/delete own expense | ✅ | ✅ | ✅ |
| Edit/delete any expense | ❌ | ✅ | ✅ |
| Remove members | ❌ | ✅ | ✅ |
| Manage group settings | ❌ | ❌ | ✅ |

**Ownership recovery:** If the owner's session is lost, ownership transfers lazily to an admin (or oldest active member) on the next owner-level action.

## AWS Architecture Notes

- **Lambda cold starts:** Neon HTTP driver (`@neondatabase/serverless`) is stateless — no connection pool config, no VPC required. Each Lambda invocation connects to Neon over HTTPS.
- **Secrets:** Neon connection string and cookie secret stored in SSM Parameter Store as `SecureString`, fetched once at cold start and cached in memory.
- **CDN strategy:** Cloudflare Pages handles CDN, HTTPS, and SPA routing automatically — no cache invalidation step needed.

## CI/CD Pipeline

| Trigger | Jobs |
|---------|------|
| PR | Lint, TypeScript, Unit tests, Integration tests, Build check (parallel) |
| `v*` tag | Full test suite → Terraform plan + apply (manual approval gate) → Lambda deploy → Cloudflare Pages deploy |

## License

[MIT](LICENSE)
