# Tabby

An expense splitting PWA with Google OAuth. Sign in, create groups, invite friends via shareable links, add expenses with flexible splits, and get a simplified breakdown of who owes who — minimizing total settlement transactions.

Built as a portfolio project demonstrating full-stack TypeScript, AWS cloud-native deployment, and thoughtful API/data modeling.

## What it does

1. Alice signs in with her Google account
2. She creates a group ("Ski Trip 2026") and gets a shareable invite link
3. Friends sign in, open the link, and join the group
4. Anyone adds expenses with equal, exact, or percentage-based splits
5. The app computes a simplified settlement plan: the minimum number of transactions to zero out all balances
6. Each user sees all their groups on the home page

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + TypeScript + Tailwind CSS + TanStack Query (PWA) |
| Backend | Fastify 5 + TypeScript |
| Database | PostgreSQL via Neon (serverless) + Drizzle ORM |
| Auth | Google OAuth 2.0 (authorization code flow) |
| Hosting | AWS Lambda + API Gateway (backend) + Cloudflare Pages (frontend) |
| IaC | Terraform + Terraform Cloud |
| CI/CD | GitHub Actions |
| Monitoring | CloudWatch (backend) + Sentry (frontend) |

## Key Design Decisions

- **Google OAuth** — persistent identity across devices. Users sign in with Google, sessions stored in the database with hashed tokens in httpOnly cookies. Supports multi-group membership from a single account.
- **Dual-path session resolution** — backward-compatible with pre-auth anonymous sessions. New sessions resolve through the `sessions` table; legacy anonymous sessions fall back to `members.sessionToken`.
- **Debt simplification** — a greedy algorithm computes net balances and pairs max creditors against max debtors to minimize settlement transactions (O(n log n), optimal for small groups).
- **Integer cents** — all arithmetic is done in integer cents internally; stored as `DECIMAL(10,2)` in Postgres. Never `FLOAT`.
- **On-the-fly balance computation** — balances are recomputed from raw `ExpenseSplit` records on each request. No cache to go stale.
- **Neon HTTP driver** — Drizzle connects to Neon via `@neondatabase/serverless`. Stateless per Lambda invocation — no connection pool config, no VPC required.
- **TanStack Query** — declarative server-state management on the frontend. Handles caching, background polling (12s interval), and online/offline coordination via `onlineManager`.
- **SSM Parameter Store** — secrets (including Google OAuth credentials) fetched at Lambda cold start, never in environment variables or source code.
- **Activity-based expiry** — groups expire 90 days after the last expense. Expired groups reject all write operations with `410 Gone`; read endpoints (balances, expenses) continue to work. Ghost members (those who left) remain in balance calculations to keep the ledger accurate.
- **Rate limiting** — global 100 requests/minute per IP; tighter limits on sensitive endpoints: 30 expense submissions/hour per member, 10 group joins/minute per IP.

## Architecture

```
Browser (React PWA)
    |  serves via
Cloudflare Pages
    |
    +- /api/v1/*  -> API Gateway (HTTP API)
                         |
                    Lambda (Fastify)
                         |
                  Neon PostgreSQL (Drizzle, HTTP driver)
                         |
                  Google OAuth (token exchange)
```

## Monorepo Structure

```
split-expenses/
+-- packages/
|   +-- api/          Fastify backend (Lambda-compatible)
|   +-- web/          React PWA (Vite + Tailwind)
|   +-- shared/       Shared TypeScript types
+-- infra/            Terraform (AWS infrastructure)
+-- .github/
|   +-- workflows/    GitHub Actions CI/CD
+-- docs/             Design spec, TODO, future features
```

## Local Development

### Prerequisites

- Node.js 22+
- A [Neon](https://neon.tech) account with two databases: `tabby_prod` (production) and `tabby_test` (dev/test)
- A [Google Cloud](https://console.cloud.google.com) project with OAuth 2.0 credentials

### First-Time Setup

```bash
# Install dependencies
npm install

# Build shared types
npm run build --workspace=packages/shared

# Copy env files and fill in your values
cp packages/api/.env.example packages/api/.env
cp packages/web/.env.example packages/web/.env

# Required env vars in packages/api/.env:
#   DATABASE_URL         - Neon connection string
#   COOKIE_SECRET        - random string (openssl rand -base64 32)
#   GOOGLE_CLIENT_ID     - from Google Cloud Console
#   GOOGLE_CLIENT_SECRET - from Google Cloud Console
#   GOOGLE_REDIRECT_URI  - http://localhost:3000/api/v1/auth/google/callback

# Push schema to your Neon dev database
cd packages/api && npx drizzle-kit push
```

### Start Dev Servers

```bash
# Start both API (port 3000) and web (port 5173)
npm run dev
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
| `GET` | `/auth/google` | None | Redirect to Google OAuth |
| `GET` | `/auth/google/callback` | None | OAuth callback |
| `GET` | `/auth/me` | Session | Current user |
| `POST` | `/auth/logout` | Session | End session |
| `GET` | `/me/groups` | Session | List user's groups |
| `POST` | `/groups` | Session | Create group |
| `GET` | `/groups/invite/:inviteCode` | None | Group metadata for join preview |
| `POST` | `/groups/invite/:inviteCode/join` | Session | Join group |
| `GET` | `/groups/:id` | Session | Fetch group by stable ID |
| `GET` | `/groups/:id/me` | Session | Current user's member record |
| `GET` | `/groups/:id/members` | Session | List active members |
| `DELETE` | `/groups/:id/members/:memberId` | Owner | Remove member |
| `POST` | `/groups/:id/expenses` | Session | Add expense with splits |
| `GET` | `/groups/:id/expenses` | Session | List all expenses |
| `PATCH` | `/groups/:id/expenses/:expenseId` | Session | Edit expense |
| `DELETE` | `/groups/:id/expenses/:expenseId` | Session | Delete expense |
| `GET` | `/groups/:id/balances` | Session | Net balances + settlement plan (integer cents) |
| `PATCH` | `/groups/:id/settings` | Owner | Update name / regenerate invite |
| `GET` | `/groups/:id/activity` | Session | Activity log (most recent 50 entries) |

## Debt Simplification Algorithm

**Problem:** Given N people with various debts, find the minimum number of transactions to settle all balances.

**Approach:** Compute each person's net balance (total paid minus total owed). Then greedily pair the max creditor against the max debtor, settling the smaller amount, repeat until all balances zero.

**Complexity:** O(n log n) — fast enough for any realistic group size.

**Why greedy:** The exact minimum-transaction problem is NP-hard. Greedy is optimal or near-optimal for small groups (≤50 people) in negligible time.

## Roles & Permissions

| Action | Member | Owner |
|--------|--------|-------|
| Add expenses | yes | yes |
| Edit/delete own expense | yes | yes |
| Edit/delete any expense | no | yes |
| Remove members | no | yes |
| Manage group settings | no | yes |

**Ownership recovery:** With Google OAuth, ownership is tied to the user account rather than a browser session. If ownership needs to transfer, it happens lazily to the oldest active member on the next owner-level action.

## AWS Architecture Notes

- **Lambda cold starts:** Neon HTTP driver (`@neondatabase/serverless`) is stateless — no connection pool config, no VPC required. Each Lambda invocation connects to Neon over HTTPS.
- **Secrets:** Neon connection string, cookie secret, and Google OAuth credentials stored in SSM Parameter Store as `SecureString`, fetched once at cold start and cached in memory.
- **CDN strategy:** Cloudflare Pages handles CDN, HTTPS, and SPA routing automatically — no cache invalidation step needed.

## CI/CD Pipeline

| Trigger | Jobs |
|---------|------|
| PR | Lint, TypeScript, Unit tests, Integration tests, Build check (parallel) |
| `v*` tag | Full test suite -> Terraform plan + apply (manual approval gate) -> Lambda deploy -> Cloudflare Pages deploy |

## License

[MIT](LICENSE)
