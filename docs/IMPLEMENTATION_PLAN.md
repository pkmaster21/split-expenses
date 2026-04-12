# Implementation Plan: Auth + All Features

## Context

Tabby currently uses anonymous cookie-per-group sessions. To support multiple groups per user and a home page listing all groups, we need real authentication. Two existing features (edit expense UI, confirmation dialogs) are independent of auth and can ship first. After all code phases, we'll update documentation.

**Manual steps**: After each phase, I'll flag anything you need to create manually (e.g., Google OAuth credentials, GitHub secrets) before we move on.

---

## Phase 1: Independent Features (no auth needed)

### 1.1 Edit Expense UI
Backend PATCH endpoint already exists. Frontend-only work.

- **`packages/web/src/components/AddExpenseModal.tsx`** — Refactor to support an `initialExpense` prop for edit mode. Pre-populate fields when editing. Change submit button text to "Save changes".
- **`packages/web/src/pages/DashboardPage.tsx`** — Add `editingExpense` state, edit button (pencil icon) next to delete button (guarded by existing `canEdit`), `updateExpenseMutation` using `api.updateExpense`, render modal in edit mode.

### 1.2 Custom Confirmation Dialogs
Replace all three `confirm()` calls with styled modals.

- **Create `packages/web/src/components/ConfirmDialog.tsx`** — Built on existing `Modal`. Props: `open`, `onClose`, `onConfirm`, `title`, `message`, `confirmLabel`, `variant` ("danger"|"default"), `loading`.
- **`packages/web/src/pages/DashboardPage.tsx`** — Replace `confirm('Delete this expense?')` with state-driven ConfirmDialog.
- **`packages/web/src/pages/SettingsPage.tsx`** — Replace both `confirm()` calls (regenerate link, remove member).

**Manual steps after Phase 1**: None.

---

## Phase 2: Google OAuth

### 2.1 Database Schema Changes
- **`packages/api/src/db/schema.ts`** — Add:
  - `users` table: id, email, name, avatarUrl, googleId (unique), createdAt
  - `sessions` table: id, userId (FK → users), tokenHash (unique), createdAt, expiresAt
  - `members` table changes: add nullable `userId` (FK → users), make `sessionToken` nullable, add unique index on (userId, groupId) where userId is not null
- Run `drizzle-kit generate` to create migration, then `drizzle-kit push` for dev

### 2.2 Backend Auth Routes
- **Create `packages/api/src/routes/auth.ts`**:
  - `GET /auth/google` — Redirect to Google consent screen with CSRF state cookie
  - `GET /auth/google/callback` — Exchange code for tokens, upsert user, create session, set cookie, redirect to frontend
  - `GET /auth/me` — Return current user or 401
  - `POST /auth/logout` — Delete session, clear cookie
- **`packages/api/src/app.ts`** — Register auth routes
- Use raw fetch to Google token endpoint (no `@fastify/oauth2` dependency)
- Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### 2.3 Session Plugin Refactor
- **`packages/api/src/plugins/session.ts`** — Dual-path resolution:
  1. **New path**: cookie → hash → `sessions.tokenHash` → join `users` → set `request.user`
  2. **Legacy fallback**: cookie → hash → `members.sessionToken` → set `request.member` (keeps existing anonymous sessions working)
  3. For group routes: if `request.user` is set, resolve `request.member` via `userId + groupId`
- Add `request.user: User | null` decoration
- `requireSession` checks `request.user` OR `request.member` (legacy)

### 2.4 Refactor Create/Join Flows
- **`packages/api/src/routes/groups.ts`** — `POST /groups`: require auth, create member with `userId`, no session token generation
- **`packages/api/src/routes/members.ts`** — Join endpoint: require auth, check for existing membership, create member with `userId`, default displayName to user.name

### 2.5 Frontend Auth Layer
- **Create `packages/web/src/lib/auth.tsx`** — AuthContext providing `{ user, isLoading, login, logout }`. `login()` redirects to `/api/v1/auth/google`. On mount, fetches `/auth/me`.
- **Create `packages/web/src/components/ProtectedRoute.tsx`** — Redirects to /login if not authenticated
- **Create `packages/web/src/pages/LoginPage.tsx`** — "Sign in with Google" button
- **`packages/web/src/App.tsx`** — Wrap in AuthProvider, add /login route, protect group routes
- **`packages/web/src/pages/CreateGroupPage.tsx`** — Remove localStorage member_hint, pre-fill displayName from user
- **`packages/web/src/pages/JoinPage.tsx`** — Same
- **`packages/web/src/pages/DashboardPage.tsx`** — Resolve currentMember by matching `userId` from members list against `auth.user.id` (interim until Phase 3.1)
- **`packages/web/src/pages/SettingsPage.tsx`** — Same
- **`packages/shared/src/types.ts`** — Add `User` type, add `userId` to `Member`

### 2.6 Infrastructure
- Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to Terraform SSM params and Lambda env vars
- Add `GOOGLE_REDIRECT_URI` env var to Lambda config

**Manual steps after Phase 2**:

1. **Create a Google Cloud project and OAuth credentials:**
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Click the project dropdown at the top → "New Project" → name it "Tabby" → Create
   - In the left sidebar, go to **APIs & Services → OAuth consent screen**
   - Choose "External" user type → Create
   - Fill in: App name ("Tabby"), User support email (your email), Developer contact email (your email) → Save and Continue
   - Scopes: click "Add or Remove Scopes", check `email` and `profile` (or `openid`, `email`, `profile`) → Update → Save and Continue
   - Test users: add your own email → Save and Continue → Back to Dashboard
   - In the left sidebar, go to **APIs & Services → Credentials**
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Name: "Tabby Web"
   - Authorized redirect URIs — add both:
     - `http://localhost:3000/api/v1/auth/google/callback` (local dev)
     - `https://<your-api-gateway-url>/api/v1/auth/google/callback` (production)
   - Click Create → copy the **Client ID** and **Client Secret**

2. **Add secrets to GitHub:** Go to repo Settings → Secrets and variables → Actions → add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

3. **Add to local dev:** Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `packages/api/.env`

Note: While the OAuth consent screen is in "Testing" mode, only test users you've added can sign in. To allow anyone, you'd later click "Publish App" on the consent screen — Google may require a brief review.

---

## Phase 3: Multi-group Features (requires Phase 2)

### 3.1 GET /groups/:id/me Endpoint
- **`packages/api/src/routes/members.ts`** — Add `GET /groups/:id/me`, returns `request.member`
- **`packages/web/src/lib/api.ts`** — Add `getCurrentMember(groupId)` method
- **`packages/web/src/pages/DashboardPage.tsx`** — Replace localStorage member_hint with `useQuery` to `/groups/:id/me`
- **`packages/web/src/pages/SettingsPage.tsx`** — Same
- Remove all `member_hint` localStorage usage

### 3.2 Home Page with Group List
- **Create `packages/api/src/routes/user.ts`** — `GET /me/groups`: returns all groups for authenticated user with member count and role
- **`packages/api/src/app.ts`** — Register user routes
- **`packages/web/src/lib/api.ts`** — Add `getMyGroups()` method
- **`packages/web/src/pages/HomePage.tsx`** — Redesign: show group list if logged in, landing page if not. Group cards with name, member count, role badge. "Create a group" button.
- **`packages/shared/src/types.ts`** — Add `GroupListItem` type

### 3.3 Branding & Visual Refresh
- **Logo** — Create an SVG logo of a tabby cat holding a check/receipt. Best-effort SVG; can be replaced with a professionally designed version later.
- **Slogan** — Add a short tagline that makes the "tabs" connection clear (e.g., "Keep your tabs in check." or "A tabby that tracks your tabs."). Displayed on the login page and home page.
- **Background** — Add faint cat face silhouettes as a subtle background pattern (CSS/SVG). Applied to the login page, home page, and possibly as a light watermark on other pages.

### 3.4 Navigation
- Add both a clickable header logo AND a back button to navigate to the home page from dashboard/settings pages

### 3.5 Create Multiple Groups
Mostly automatic after 3.2. Minor wiring:
- **`packages/web/src/pages/CreateGroupPage.tsx`** — Invalidate `myGroups` query after creation
- **`packages/web/src/pages/JoinPage.tsx`** — Invalidate `myGroups` query after join

**Manual steps after Phase 3**: None.

---

## Phase 4: Smoke Tests & Documentation

### 4.1 Update Smoke Tests
- **`packages/web/e2e/smoke.spec.ts`** — Update to account for the login flow. The smoke test will need to either:
  - Mock the Google OAuth flow (set a session cookie directly via the test API/helper), or
  - Add a test-only auth bypass (e.g., `POST /auth/test-login` only in test/dev env)
- **`packages/web/e2e/helpers.ts`** — Add `login()` helper that sets up an authenticated session for tests
- Keep tests minimal to avoid 429 from Neon free tier — no new DB-heavy test cases

### 4.2 Update Documentation
- **`docs/design-spec.md`** — Significant updates:
  - Update title/intro from "no-auth" to describe the new auth model
  - Rewrite "Identity & Session Design" section to cover Google OAuth + dual-path session resolution
  - Update "User Flow" to include sign-in step
  - Update "Data Model" with users and sessions tables, userId on members
  - Update "API Surface" table with new auth routes and updated auth requirements
  - Update "Permissions & Roles" to reflect user-based identity
  - Update "Resolved Decisions" section
- **`docs/TODO.md`** — Update setup steps to include Google OAuth credentials
- **`docs/FUTURE.md`** — Remove completed features, add any new future ideas discovered during implementation
- **`README.md`** — Update with auth setup instructions, new features, updated architecture description

**Manual steps after Phase 4**: None.

---

## Backward Compatibility

- Existing anonymous members (no userId, have sessionToken) continue working via the legacy session path
- No forced migration — anonymous members remain functional alongside authenticated members

---

## Verification

**Phase 1**: Edit expense modal works, all confirm() replaced with styled dialogs

**Phase 2**: OAuth flow works end-to-end, creating/joining groups ties to authenticated user, legacy anonymous sessions still work, /auth/me returns user, logout works

**Phase 3**: Home page lists all groups, creating/joining a second group works, currentMember resolved server-side, no localStorage member_hint usage remains, both logo and back button navigate home, new logo/slogan/background visible on login and home pages

**Phase 4**: Smoke tests pass with auth flow, docs are up to date
