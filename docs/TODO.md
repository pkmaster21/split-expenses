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
- [x] `GOOGLE_CLIENT_ID` — from Google Cloud Console OAuth credentials
- [x] `GOOGLE_CLIENT_SECRET` — from Google Cloud Console OAuth credentials
- [ ] `SENTRY_DSN` — from Sentry.io project settings (optional)

#### Google Cloud OAuth

- [x] Create a Google Cloud project and OAuth consent screen
- [x] Create OAuth 2.0 client credentials (Web application type)
- [x] Add authorized redirect URIs:
  - `http://localhost:3000/api/v1/auth/google/callback` (local dev)
  - `https://<api-gateway-url>/api/v1/auth/google/callback` (production)
- [x] Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` to `packages/api/.env`

#### GitHub Environments

- [x] Create `production` environment with required reviewers to gate the Terraform apply

#### First Terraform Apply

- [x] Infrastructure provisioned and state imported into Terraform Cloud
- [x] `api_gateway_url`: `https://fv2ywhx3oa.execute-api.us-east-1.amazonaws.com/`
- [x] Variables configured in Terraform Cloud workspace (`tabby-workspace`)

#### Sentry (Optional)

- [ ] Create a Sentry project at https://sentry.io
- [ ] Add `SENTRY_DSN` to GitHub secrets and `packages/web/.env`

---

See [FUTURE.md](FUTURE.md) for planned features and remaining code work.
