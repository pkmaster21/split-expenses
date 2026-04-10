# Tabby — Todo

---

### Local Development Setup

These steps get the app running on your machine.

#### Neon Database

- [x] Create a free account at https://neon.tech
- [x] Create a new project (region: us-east-1)
- [x] Create two databases inside the project: `tabby_prod` and `tabby_test`
- [x] Add `DATABASE_URL` to `packages/api/.env` (pointing at `tabby_test`)
- [x] Run `cd packages/api && npx drizzle-kit push --force` to create tables in the test database

---

### Production Setup

These steps require manual action outside the codebase to get the app deployed.

#### GitHub Repository Secrets

Go to **Settings → Secrets and variables → Actions** and add:

- [x] `AWS_ACCESS_KEY_ID`
- [x] `AWS_SECRET_ACCESS_KEY`
- [x] `DATABASE_URL` — full Neon connection string for the `tabby_test` database (used by integration tests in CI)
- [x] `PROD_DATABASE_URL` — full Neon connection string for the `tabby_prod` production database
- [x] `COOKIE_SECRET` — long random string (`openssl rand -base64 32`)
- [x] `PROD_API_GATEWAY_URL` — API Gateway URL (from Terraform output after first apply)
- [x] `CLOUDFLARE_API_TOKEN` — Cloudflare API token with `Pages:Edit` permission
- [x] `CLOUDFLARE_ACCOUNT_ID` — from Cloudflare dashboard
- [x] `TF_API_TOKEN` — from Terraform Cloud → User Settings → Tokens
- [x] `PROD_CORS_ORIGIN` — Cloudflare Pages URL (e.g. `https://tabby.pages.dev`) or custom domain
- [ ] `SENTRY_DSN` — from Sentry.io project settings (optional)

#### GitHub Environments

- [x] Create `production` environment with required reviewers to gate the Terraform apply

#### Migration Prerequisite

- [ ] Complete the CloudFront → Cloudflare migration — see [TODO-migration.md](TODO-migration.md)

#### First Terraform Apply

- [x] Infrastructure provisioned and state imported into Terraform Cloud
- [x] `api_gateway_url`: `https://fv2ywhx3oa.execute-api.us-east-1.amazonaws.com/`
- [x] Variables configured in Terraform Cloud workspace (`tabby-workspace`)

#### Sentry (Optional)

- [ ] Create a Sentry project at https://sentry.io
- [ ] Add `SENTRY_DSN` to GitHub secrets and `packages/web/.env`

---

### Remaining Code Work

#### v2 Features

- [ ] **Edit expense UI** — backend (`PATCH /groups/:id/expenses/:expenseId`) and `api.updateExpense()` are fully implemented; only the DashboardPage edit button + modal is missing
- [ ] **Admin role management** — no endpoint or UI to promote members to admin or demote admins; needs a new API route (`PATCH /groups/:id/members/:memberId/role`) and SettingsPage UI (owner capability per design spec)
- [ ] **`GET /groups/:id/me` endpoint** — would let the API identify the current member directly, removing reliance on `member_hint_${groupId}` localStorage
- [ ] **Custom confirmation dialogs** — replace browser `confirm()` popups (delete expense, remove member, regenerate link) with styled in-app modals; currently works but looks jarring

#### Testing

- [ ] **Rate limit test** — 31st expense within an hour should return 429 (currently untested)
- [ ] **Expense edit test** — add integration test for `PATCH /groups/:id/expenses/:expenseId` (endpoint exists but has no test)
- [ ] **Group expiration test** — verify that posting to an expired group returns 410 (logic exists, untested)
- [x] **Permission enforcement tests** — member cannot remove another member (should 403); member cannot delete someone else's expense (should 403) *(covered in `api.test.ts`)*

#### Developer Experience

- [ ] **Pre-push typecheck hook** — add `.git/hooks/pre-push` to run `npm run typecheck` before each push
- [ ] **Mobile QA** — test layout on iPhone Safari and Android Chrome
- [ ] **PWA install** — verify install prompt on Android Chrome and iOS "Add to Home Screen"
- [ ] **Load test** — 50-member group, 200 expenses, verify `/balances` responds in <500ms
- [ ] **SNS alarms** — wire CloudWatch alarms to an SNS topic + email subscription

#### Infrastructure

- [x] **Terraform state locking** — handled automatically by Terraform Cloud (migrated from S3 backend)
- [ ] **Lambda provisioned concurrency** — optional; eliminates cold-start latency on the first request after inactivity; set to 1 on the production alias once traffic justifies it
