# Tabby — Todo

---

### Local Development Setup

These steps get the app running on your machine.

#### Neon Database

- [ ] Create a free account at https://neon.tech
- [ ] Create a new project (region: us-east-1)
- [ ] Create two databases inside the project: `tabby_prod` and `tabby_test`
- [ ] Add `DATABASE_URL` to `packages/api/.env` (pointing at `tabby_test`)
- [ ] Run `cd packages/api && npx drizzle-kit push --force` to create tables in the test database

---

### Production Setup

These steps require manual action outside the codebase to get the app deployed.

#### GitHub Repository Secrets

Go to **Settings → Secrets and variables → Actions** and add:

- [ ] `AWS_ACCESS_KEY_ID`
- [ ] `AWS_SECRET_ACCESS_KEY`
- [ ] `TF_STATE_BUCKET` — S3 bucket name for Terraform remote state
- [ ] `PROD_DATABASE_URL` — full Neon connection string for the `tabby_prod` production database
- [ ] `COOKIE_SECRET` — long random string (`openssl rand -base64 32`)
- [ ] `PROD_API_URL` — API Gateway URL (from Terraform output after first apply)
- [ ] `PROD_CF_DISTRIBUTION_ID` — CloudFront distribution ID (from Terraform output)
- [ ] `PROD_CORS_ORIGIN` — CloudFront URL or custom domain for prod
- [ ] `SENTRY_DSN` — from Sentry.io project settings (optional)

#### GitHub Environments

- [ ] Create `production` environment with required reviewers to gate the Terraform apply

#### First Terraform Apply

- [ ] Create an S3 bucket for Terraform remote state; enable versioning
- [ ] Run locally once to provision infrastructure:
  ```bash
  cd infra
  terraform init -backend-config="bucket=<your-tf-state-bucket>"
  terraform apply \
    -var="neon_database_url=<your-neon-url>" \
    -var="cookie_secret=<random-secret>" \
    -var="cors_origin=https://placeholder.cloudfront.net"
  ```
- [ ] Note `api_gateway_url` and `cloudfront_url` from Terraform outputs
- [ ] Update `PROD_API_URL`, `PROD_CORS_ORIGIN`, and `PROD_CF_DISTRIBUTION_ID` secrets
- [ ] Re-run apply with the correct `cors_origin`

#### Domain & HTTPS (Optional)

- [ ] Purchase a domain via Route 53 or any registrar
- [ ] Request ACM certificate in us-east-1 for the domain
- [ ] Add ACM ARN to the CloudFront Terraform config
- [ ] Create a Route 53 A alias record pointing to the CloudFront distribution

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

- [ ] **Terraform state locking** — add a DynamoDB table for state locking (`dynamodb_table` in the S3 backend config) to prevent concurrent apply conflicts if more than one person ever deploys
- [ ] **Lambda provisioned concurrency** — optional; eliminates cold-start latency on the first request after inactivity; set to 1 on the production alias once traffic justifies it
