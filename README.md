# SplitEasy

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
| Frontend | React + TypeScript + Tailwind CSS (PWA) |
| Backend | Fastify + TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Hosting | AWS Lambda + API Gateway + RDS + S3 + CloudFront |
| IaC | Terraform |
| CI/CD | GitHub Actions |

## Key Design Decisions

- **No auth** — identity is a name + httpOnly session cookie per group. No accounts, no friction.
- **Debt simplification** — a greedy algorithm computes net balances and pairs max creditors against max debtors to minimize settlement transactions (O(n log n), optimal for small groups).
- **Integer cents** — all arithmetic is done in integer cents internally; stored as `DECIMAL(10,2)` in Postgres. Never `FLOAT`.
- **On-the-fly balance computation** — balances are recomputed from raw `ExpenseSplit` records on each request. No cache to go stale.
- **Serverless** — Lambda + API Gateway with Prisma connection pooling tuned for `db.t3.micro` limits.

## Project Status

In development. See [design-spec.md](design-spec.md) for the full technical design.

## License

[MIT](LICENSE)
