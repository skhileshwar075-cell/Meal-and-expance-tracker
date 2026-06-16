# Smart Tiffin & Student Analytics Platform

A production-ready dual-role SaaS web app for students to track expenses, budgets, and meals — and for tiffin service owners to manage customers, attendance, billing, and payments — with rich analytics for both roles.

## Run & Operate

```bash
bash start.sh                                                        # start both services
PORT=8080 pnpm --filter @workspace/backend run dev                  # backend only
PORT=8081 BASE_PATH=/ pnpm --filter @workspace/frontend run dev     # frontend only
pnpm run typecheck                                                   # full typecheck
pnpm run build                                                       # typecheck + build all
pnpm --filter @workspace/db run push                                 # push DB schema (dev)
pnpm --filter @workspace/db run push-force                           # force push schema
pnpm --filter @workspace/scripts run seed                            # seed demo data
```

Required env vars: `DATABASE_URL` (Postgres connection string), `JWT_SECRET` (JWT signing secret).

## Startup

The app is launched via `bash start.sh` which:
1. Kills any stale processes on ports 8080 and 8081
2. Starts `@workspace/backend` on port 8080 (`PORT=8080`)
3. Starts `@workspace/frontend` on port 8081 (`PORT=8081 BASE_PATH=/`)
4. Forwards SIGTERM to both on stop

Replit runs each service as a separate artifact workflow:
- `artifacts/backend: API Server` — port 8080
- `artifacts/frontend: web` — port 8081
- `artifacts/mockup-sandbox: Component Preview Server` — port 8082 (canvas design tool)

## Demo Credentials (after seed)

- **Student:** arjun@example.com / password123
- **Student:** priya@example.com / password123
- **Owner:** ramesh@tiffin.com / password123
- **Tiffin invite code:** PATEL1 (enter in student Connection page to link to owner's service)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7 + Tailwind CSS 4 + ShadCN UI + Recharts + Wouter
- API: Express 5
- DB: PostgreSQL 16 + Drizzle ORM
- Validation: Zod, drizzle-zod
- Auth: JWT (access 15 min, refresh 7 days), stored in localStorage
- API contracts: OpenAPI spec in `lib/api-spec/`, Orval generates hooks + Zod schemas

## Where things live

- `artifacts/frontend/` — React+Vite frontend
  - `src/pages/student/` — Dashboard, Expenses, Budgets, Meals, Analytics, Connection, Settings
  - `src/pages/owner/` — Dashboard, Customers, Attendance, MealPlans, Billing, Payments, Analytics, Settings
  - `src/components/layout/DashboardLayout.tsx` — sidebar/topbar shell with role-aware nav
  - `src/lib/auth.tsx` — AuthContext, JWT token management
  - `src/lib/api-client.ts` — wires auth token getter into generated fetch client
- `artifacts/backend/` — Express 5 API server
  - `src/routes/` — auth, students, expenses, budgets, meals, owners, customers, mealPlans, attendance, billing, payments, studentAnalytics, ownerAnalytics, notifications, connections, reminders
  - `src/middleware/auth.ts` — JWT verify middleware, requireRole helper
- `lib/db/` — Drizzle ORM schema + push config
- `lib/api-client-react/` — Orval-generated React Query hooks
- `lib/api-zod/` — Orval-generated Zod schemas
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `scripts/src/seed.ts` — idempotent demo data seeder

## Architecture decisions

- **Dual-role auth:** Single JWT carries `role` + `studentId`/`ownerId`. Route middleware enforces role boundaries.
- **Drizzle numeric fields return strings** — all route handlers must `Number()` before arithmetic.
- **Route ordering:** specific routes (`/expenses/summary`, `/budgets/current`) registered BEFORE parameterized routes (`:id`).
- **`collectionRate`** — backend returns 0–100 (already ×100). Never multiply again on the frontend.
- **Payments transaction safety** — `POST /payments` runs inside `db.transaction()`, caps at remaining balance.
- **Duplicate bill guard** — `POST /bills` returns 409 for duplicate customer+month+year.
- **Reminders mock mode** — if Twilio env vars absent, logs to console + `reminder_logs` table, no real send.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **PostgreSQL DATE type** — compute last day with `new Date(year, month, 0).getDate()`. Hardcoding `31` causes 500s for short months.
- **`useToast` import:** `@/hooks/use-toast` — not `@/components/ui/use-toast`.
- **Orval hook signatures:** params as first arg directly — `useListExpenses({ month, year })` not `{ query: { params: ... } }`.
- **`@workspace/api-client-react/custom-fetch`** subpath must be listed in `lib/api-client-react/package.json` exports.
- **`pnpm --filter db push`** is wrong — correct command is `pnpm --filter @workspace/db run push`.
