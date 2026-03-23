# Migration Todo — Drizzle ORM + Neon + TanStack Query

Replaces Prisma + RDS with Drizzle ORM + Neon (serverless PostgreSQL),
and replaces manual fetch/state management with TanStack Query on the frontend.

---

### Phase 1 — Neon Setup (Manual)

- [x] Create a free account at https://neon.tech
- [x] Create a new project (region: us-east-1 to match existing infra)
- [x] Create two databases inside the project: `tabby` and `tabby_test`
- [x] Copy the connection strings for both — they look like:
  `postgresql://user:pass@ep-xyz.us-east-1.aws.neon.tech/tabby?sslmode=require`
- [x] Add `DATABASE_URL` to `packages/api/.env` (pointing at the `tabby` Neon database)
- [x] Add `TEST_DATABASE_URL` to `packages/api/.env` (pointing at the `tabby_test` Neon database)

Tests always run against `tabby_test` — both locally and in CI. There is no local database service; the Neon HTTP driver connects over HTTPS and cannot connect to a local Postgres instance. Delete `docker-compose.yml` from the repo root (see Phase 14).

---

### Phase 2 — Backend: Remove Prisma

- [x] Uninstall Prisma packages from `packages/api`:
  - Remove `@prisma/client` from dependencies
  - Remove `prisma` from devDependencies
- [x] Delete `packages/api/prisma/` directory (schema + migrations)
- [x] Remove all `db:generate`, `db:migrate`, `db:migrate:deploy`, `db:studio` scripts from `packages/api/package.json`
- [x] Remove `binaryTargets` concern from Lambda build script (no longer needed)
- [x] Remove the `@prisma` and `.prisma` copy steps from the esbuild Lambda bundle script in `production.yml` (Neon HTTP driver has no native binaries)
- [x] Verify `@neondatabase/serverless` is **bundled** (not externalized) in the esbuild Lambda config — it must be present in the zip since the Lambda runtime won't have it in `node_modules`

---

### Phase 3 — Backend: Install Drizzle

- [x] Add to `packages/api` dependencies:
  - `drizzle-orm`
  - `@neondatabase/serverless`
- [x] Add to `packages/api` devDependencies:
  - `drizzle-kit`
- [x] Add scripts to `packages/api/package.json`:
  - `"db:push": "drizzle-kit push"` — syncs schema to DB without migration files (dev/CI)
  - `"db:migrate": "drizzle-kit migrate"` — generates and applies versioned SQL migrations (prod)
  - `"db:studio": "drizzle-kit studio"` — visual DB browser (replaces Prisma Studio)

---

### Phase 4 — Backend: Write Drizzle Schema

Create `packages/api/src/db/schema.ts` with Drizzle table definitions that mirror the current Prisma schema:

- [x] Define `memberRoleEnum` using `pgEnum('member_role', ['owner', 'admin', 'member'])`
- [x] Define `splitTypeEnum` using `pgEnum('split_type', ['equal', 'exact', 'percentage'])`
- [x] Define `groups` table (`id`, `name`, `inviteCode`, `createdAt`, `expiresAt`)
- [x] Define `members` table (`id`, `groupId`, `displayName`, `role`, `sessionToken`, `joinedAt`, `leftAt`)
- [x] Define `expenses` table (`id`, `groupId`, `paidBy`, `amount`, `description`, `splitType`, `createdAt`, `updatedAt`)
  - `updatedAt` must use `.$onUpdate(() => new Date())` — Drizzle has no built-in `@updatedAt` equivalent; this ensures it auto-updates on every `db.update()` call
- [x] Define `expenseSplits` table (`id`, `expenseId`, `memberId`, `amount`)
- [x] Define `activityLog` table (`id`, `groupId`, `message`, `createdAt`)
- [x] Add `onDelete: 'cascade'` to FK columns where the parent cascade-deletes:
  - `members.groupId` → `groups.id`
  - `expenses.groupId` → `groups.id`
  - `expenseSplits.expenseId` → `expenses.id`
  - `activityLog.groupId` → `groups.id`
- [x] Add `onDelete: 'restrict'` to FK columns that reference members — prevents accidental hard-deletes from corrupting the financial ledger:
  - `expenses.paidBy` → `members.id`
  - `expenseSplits.memberId` → `members.id`
  - Note: members are soft-deleted via `leftAt` in normal operation so these FKs are never broken in practice. Hard deletes only occur at the group level (via group cascade), which deletes expenses and splits before members in the same transaction.
- [x] Add all indexes (inviteCode unique, groupId FKs, sessionToken)
- [x] Export inferred TypeScript types from schema (`type Group = typeof groups.$inferSelect`, etc.)
- [x] Cross-check Drizzle-inferred types against `packages/shared/src/types.ts` — shared types remain the source of truth for the frontend; update `shared/src/types.ts` manually if any field names or shapes differ (do not import `drizzle-orm` into the shared package)

---

### Phase 5 — Backend: Drizzle Client

Delete `packages/api/src/db.ts` and create `packages/api/src/db/index.ts`:

- [x] Import `neon` from `@neondatabase/serverless` and `drizzle` from `drizzle-orm/neon-http`
- [x] Create the Drizzle client using the Neon HTTP driver (stateless, ideal for Lambda)
- [x] Export the `db` instance and the schema tables for use in routes/services
- [x] Remove the `globalThis` Prisma singleton pattern (not needed — Neon HTTP driver is stateless, no connection pool)
- [x] Update all imports across route and service files from `'../db.js'` to `'../db/index.js'`

---

### Phase 6 — Backend: Rewrite Queries

Replace every `prisma.*` call with Drizzle query syntax across all route and service files.

#### `src/routes/groups.ts`
- [x] `POST /groups` — rewrite `prisma.group.create` with nested member as two separate inserts in a batch (`db.batch([db.insert(groups), db.insert(members)])`) using pre-generated UUID for groupId; neon-http driver does not support `db.transaction()` — use `db.batch()` for atomic multi-insert operations
- [x] `GET /groups/invite/:inviteCode` — rewrite `prisma.group.findUnique` as `db.select().from(groups).where(eq(groups.inviteCode, inviteCode))` (public, used by join page). Note path change from `/:inviteCode` to `/invite/:inviteCode` to avoid route conflict with `/:id`; memberCount computed as a separate Drizzle count query (correlated SQL subquery unreliable with neon-http)
- [x] `GET /groups/:id` — **new authenticated endpoint** for SettingsPage to fetch current group name and inviteCode by stable ID; `db.select().from(groups).where(eq(groups.id, id))`. Requires session token.
- [x] `PATCH /groups/:id/settings` — rewrite `prisma.group.update` as `db.update(groups).set(...).where(...)`
- [x] `GET /groups/:id/activity` — rewrite `prisma.activityLog.findMany` as `db.select().from(activityLog).where(...).orderBy(desc(...)).limit(50)`
- [x] Update `packages/web/src/lib/api.ts` — change `getGroupByInviteCode` to call `GET /api/v1/groups/invite/${inviteCode}` and `joinGroup` to call `POST /api/v1/groups/invite/${inviteCode}/join` (both paths move under `/invite/` for consistency)
- [x] Add `getGroup(groupId: string)` to `packages/web/src/lib/api.ts` — calls `GET /api/v1/groups/${groupId}`, used by SettingsPage in Phase 13

#### `src/routes/members.ts`
- [x] `POST /groups/invite/:inviteCode/join` — rewrite member creation and group expiry check; note path change from `POST /groups/:inviteCode/join` for consistency with other invite routes
- [x] `GET /members` — rewrite active member list query
- [x] `DELETE /members/:memberId` — rewrite soft-delete

#### `src/routes/expenses.ts`
- [x] `POST /expenses` — rewrite using `db.batch()` with pre-generated expenseId UUID: batch inserts expense + splits atomically, then updates group expiresAt separately; `db.transaction()` not supported by neon-http driver
- [x] `GET /expenses` — rewrite with join to splits
- [x] `PATCH /expenses/:id` — rewrite: delete old splits sequentially, then `db.batch([update expense, insert new splits])`; conditional on split change; pass `updatedAt: new Date()` explicitly alongside `.$onUpdate` on the schema
- [x] `DELETE /expenses/:id` — rewrite delete expense + splits

#### `src/routes/balances.ts`
- [x] Rewrite expenses + splits join query for balance computation

#### `src/services/ownership.ts`
- [x] Rewrite all `prisma.member.*` and `prisma.activityLog.*` calls

#### `src/plugins/session.ts`
- [x] Rewrite `prisma.member.findFirst` token lookup as Drizzle query

#### `src/__tests__/api.test.ts`
- [x] Replace `import { prisma } from '../db.js'` with the Drizzle `db` instance and schema tables from `'../db/index.js'`
- [x] Rewrite `afterAll` — remove `prisma.$disconnect()` (Neon HTTP driver is stateless, no connection to close)
- [x] Rewrite `afterEach` cleanup — replace each `prisma.*.deleteMany()` call with `db.delete(table)` in the same FK-safe order (`activityLog` → `expenseSplits` → `expenses` → `members` → `groups`)
- [x] Remove the localhost:5433 fallback URL from `src/__tests__/setup.ts` — `TEST_DATABASE_URL` always points at the Neon `tabby_test` database

---

### Phase 7 — Backend: Migrations

- [x] Create `drizzle.config.ts` in `packages/api` pointing at `src/db/schema.ts`, with `out: 'drizzle'` so migration files land in `packages/api/drizzle/` — drizzle-kit auto-loads `.env`, so `DATABASE_URL` drives which database is targeted
- [x] Run `drizzle-kit push` against both `tabby` and `tabby_test` Neon databases to create the tables (initial setup only)
- [x] Verify tables created correctly (Drizzle push reported "Changes applied" for both databases)
- [x] For all future schema changes: run `drizzle-kit migrate` to generate versioned SQL files in `drizzle/`. Commit the generated files — they are applied by CI/CD before each production deploy (see Phase 9)

---

### Phase 8 — Infrastructure: Remove RDS, Simplify Terraform

- [x] Delete `infra/modules/rds/` directory entirely
- [x] Remove `rds` module call from `infra/main.tf`
- [x] Remove VPC, subnets, and security group resources from `infra/main.tf` (Lambda no longer needs VPC access)
- [x] Remove VPC config block from `infra/modules/lambda/main.tf`
- [x] Remove `vpc_subnet_ids` and `vpc_security_group_ids` from Lambda resource
- [x] Add `neon_database_url` as a new sensitive variable to `infra/variables.tf` — this will hold the full Neon connection string
- [x] Update the SSM module call in `infra/main.tf` — replace `database_url = "postgresql://${var.db_username}:${var.db_password}@${module.rds.endpoint}/${var.db_name}"` with `database_url = var.neon_database_url` (the old construction references `module.rds.endpoint` which no longer exists after RDS is removed; passing the value directly avoids a Terraform plan error)
- [x] Update `infra/modules/ssm/main.tf` — `DATABASE_URL` SecureString parameter remains, no structural changes needed; value is now sourced from `var.neon_database_url`
- [x] Update `infra/outputs.tf` — remove `rds_endpoint` output
- [x] Update `infra/variables.tf` — remove `db_password` and `db_username` variables
- [x] Update `infra/modules/lambda/main.tf` IAM policy — remove RDS permissions, keep SSM + CloudWatch

---

### Phase 9 — CI/CD Updates

- [x] Update `.github/workflows/pr.yml` integration test job:
  - Remove the `postgres` service container (`docker-compose.yml` has been deleted; CI no longer uses a local Postgres instance)
  - Remove `Run Prisma migrations` step
  - Add `TEST_DATABASE_URL` as a GitHub secret pointing at the Neon `tabby_test` database
  - Add `Run Drizzle push` step: `npx drizzle-kit push --force` before tests (non-interactive, safe for CI; `--force` ensures a clean schema even if a prior run left it in a broken state)
  - Note: `pr.yml` already uses `npx vitest run` for the test command — no change needed there
  - Add `concurrency` group to serialize runs and prevent parallel PRs from conflicting on the shared `tabby_test` database:
    ```yaml
    concurrency:
      group: integration-tests
      cancel-in-progress: false
    ```
- [x] Delete `.github/workflows/staging.yml` — staging environment is removed; the pipeline is now PR → CI tests → merge to main → deploy to production
- [x] Update `.github/workflows/production.yml`:
  - Replace `npx jest --forceExit` with `npx vitest run`
  - Remove RDS-related Terraform variables (`db_password`, `db_username`)
  - Pass Neon connection string to Terraform: `-var="neon_database_url=${{ secrets.NEON_DATABASE_URL }}"` — add `NEON_DATABASE_URL` as a GitHub repository secret
  - Add `Run Drizzle migrate` step **before** the Lambda deploy: `npx drizzle-kit migrate` (applies pending versioned SQL migration files to the production Neon database)
  - Add the same `concurrency: integration-tests / cancel-in-progress: false` group to the test job

---

### Phase 10 — Frontend: Install TanStack Query

- [x] Add `@tanstack/react-query@^5` to `packages/web` dependencies (v5 — compatible with React 18 and Vite)
- [x] Add `@tanstack/react-query-devtools` to devDependencies (shows query cache state in browser)

**v5 API notes to keep in mind throughout Phases 11–13:**
- Query options are passed as a single object: `useQuery({ queryKey: [...], queryFn: ... })`
- Use `isPending` (not `isLoading`) to check mutation in-flight state
- `isLoading` on a query means "no cached data AND currently fetching" — correct for initial load

---

### Phase 11 — Frontend: QueryClient Setup

- [x] Create `packages/web/src/lib/queryClient.ts` — instantiate and export a `QueryClient` with sensible defaults:
  - `staleTime: 10_000` (data considered fresh for 10s, avoids redundant refetches)
  - `retry: 1`
- [x] In the same file, wire `onlineManager` to the browser's native network events so TanStack Query automatically pauses/resumes all queries when the device goes offline/online:
  ```ts
  import { onlineManager } from '@tanstack/react-query';
  onlineManager.setEventListener((setOnline) => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });
  ```
- [x] Create `packages/web/src/lib/queryKeys.ts` — centralized query key registry to ensure consistent cache invalidation:
  ```ts
  export const queryKeys = {
    group: (groupId: string) => ['group', groupId] as const,
    members: (groupId: string) => ['members', groupId] as const,
    expenses: (groupId: string) => ['expenses', groupId] as const,
    balances: (groupId: string) => ['balances', groupId] as const,
    activity: (groupId: string) => ['activity', groupId] as const,
  };
  ```
- [x] Wrap the router in `App.tsx` with `<QueryClientProvider client={queryClient}>`
- [x] Add `<ReactQueryDevtools />` inside the provider (dev only, tree-shaken in production builds)

---

### Phase 12 — Frontend: Rewrite DashboardPage

- [x] Replace the three `useState` declarations for `members`, `expenses`, `balances` with three `useQuery` calls
- [x] Replace `loading` state with `isLoading` from the members query
- [x] Replace `error` state with `isError`/`error` from query results
- [x] Replace `handleAddExpense` with a `useMutation` that calls `api.createExpense` and invalidates `queryKeys.expenses(groupId)` and `queryKeys.balances(groupId)` on success
- [ ] Replace `handleUpdateExpense` with a `useMutation` that calls `api.updateExpense` and invalidates `queryKeys.expenses(groupId)` and `queryKeys.balances(groupId)` on success — **deferred to v2** (edit expense UI not yet built)
- [x] Replace `handleDeleteExpense` with a `useMutation` that calls `api.deleteExpense` and invalidates `queryKeys.expenses(groupId)` and `queryKeys.balances(groupId)` on success
- [x] Pass `refetchInterval: 12_000` to each query — TanStack Query automatically pauses polling when offline via `onlineManager` (replaces `usePolling` + `useOnlineStatus`)
- [x] Pass `refetchIntervalInBackground: false` (pauses polling when the tab is hidden — replaces the `visibilitychange` logic in `usePolling`)
- [x] Keep `lastUpdated` display — set it from the `dataUpdatedAt` property TanStack Query provides on each query result
- [x] Replace `useOnlineStatus()` usage for disabling the "Add expense" button with `useSyncExternalStore(onlineManager.subscribe, onlineManager.isOnline)` — `useNetworkMode` is not exported from `@tanstack/react-query` v5
- [x] Delete `usePolling.ts` hook (no longer used)

---

### Phase 13 — Frontend: Rewrite SettingsPage

- [x] Add `useQuery` for group data using `queryKeys.group(groupId)` hitting `GET /groups/:id`
- [x] Replace manual `useState` + `useEffect` data fetching with `useQuery` for members using `queryKeys.members(groupId)`
- [x] Replace `handleUpdateSettings` with `useMutation` that invalidates `queryKeys.group(groupId)` on success (covers both name and regenerated inviteCode)
- [x] Replace `removeMember` with a `useMutation` that calls `api.removeMember` and invalidates `queryKeys.members(groupId)` on success
- [x] Add `useQuery` for activity log using `queryKeys.activity(groupId)` hitting `GET /groups/:id/activity` — display ownership transfer events (e.g., "Alice is now the group owner") in the settings view

---

### Phase 14 — Cleanup

- [x] Run `npm run typecheck` across all packages and fix any type errors
- [x] Run `npm run test` — all 29 Vitest tests pass against the Neon test database
- [x] Delete `usePolling.ts` if not already done
- [x] Delete `useOnlineStatus.ts` (replaced by `onlineManager` + `useSyncExternalStore` from TanStack Query)
- [x] Delete `docker-compose.yml` from the repo root (no local database service needed; tests always run against Neon `tabby_test`)
- [x] Overhaul `docs/todo.md` — rewritten to reflect the current Drizzle + Neon + TanStack Query + Vitest stack and the simplified PR → prod pipeline
- [x] Update `README.md` architecture section
- [x] Fix `member_hint_${groupId}` localStorage — `CreateGroupPage` and `JoinPage` now write `localStorage.setItem(\`member_hint_${group.id}\`, member.id)` immediately after a successful create/join before navigating to the dashboard
- [x] Delete `infra/modules/rds/` directory — already unlinked from `infra/main.tf`

**Deferred to v2:**
- Edit expense UI — `api.updateExpense()` and `PATCH /groups/:id/expenses/:expenseId` are fully implemented on both frontend and backend; only the DashboardPage UI (edit button + modal) is missing
- Admin role management — no endpoint or UI exists to promote members to admin or demote admins back to member (owner capability per design spec); both a new API route and SettingsPage UI are needed

**Future TODO:**
- Pre-push typecheck hook — add `.git/hooks/pre-push` script to run `npm run typecheck` across all packages automatically before each `git push`; no extra dependencies needed
