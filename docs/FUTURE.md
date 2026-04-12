# Tabby — Future Features

---

### v2 Features

- [ ] **Admin role management** — no endpoint or UI to promote members to admin or demote admins; needs a new API route (`PATCH /groups/:id/members/:memberId/role`) and SettingsPage UI (owner capability per design spec)
- [ ] **Push notifications** for new expenses (service worker integration, Notification API)
- [ ] **WebSocket real-time updates** (API Gateway WebSocket APIs, connection management)
- [ ] **Offline expense queue** (IndexedDB, sync on reconnect)
- [ ] **Expense categories with spending breakdowns** (data viz, charting)
- [ ] **Settle-up flow with Venmo/Zelle deep links** (mobile deep linking)
- [ ] **Export ledger to CSV**
- [ ] **Scheduled data cleanup** — soft-delete expired group data 30 days after expiration via EventBridge + Lambda

---

### Testing

- [ ] **Rate limit test** — 31st expense within an hour should return 429 (currently untested)
- [ ] **Expense edit test** — add integration test for `PATCH /groups/:id/expenses/:expenseId` (endpoint exists but has no test)
- [ ] **Group expiration test** — verify that posting to an expired group returns 410 (logic exists, untested)
- [x] **Permission enforcement tests** — member cannot remove another member (should 403); member cannot delete someone else's expense (should 403) *(covered in `api.test.ts`)*

---

### Developer Experience

- [ ] **Pre-push typecheck hook** — add `.git/hooks/pre-push` to run `npm run typecheck` before each push
- [ ] **Mobile QA** — test layout on iPhone Safari and Android Chrome
- [ ] **PWA install** — verify install prompt on Android Chrome and iOS "Add to Home Screen"
- [ ] **Load test** — 50-member group, 200 expenses, verify `/balances` responds in <500ms
- [ ] **SNS alarms** — wire CloudWatch alarms to an SNS topic + email subscription

---

### Infrastructure

- [x] **Terraform state locking** — handled automatically by Terraform Cloud (migrated from S3 backend)
- [ ] **Lambda provisioned concurrency** — optional; eliminates cold-start latency on the first request after inactivity; set to 1 on the production alias once traffic justifies it
