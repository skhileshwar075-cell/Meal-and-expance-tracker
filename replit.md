# Smart Tiffin & Student Analytics Platform

A production-ready dual-role SaaS web app for students to track expenses, budgets, and meals — and for tiffin service owners to manage customers, attendance, billing, and payments — with rich analytics for both roles.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port from $PORT, default 5000)
- `pnpm --filter @workspace/smart-tiffin run dev` — run the frontend (port from $PORT)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed demo data
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Demo Credentials (after seed)

- **Student:** arjun@example.com / password123
- **Owner:** ramesh@tiffin.com / password123
- **Tiffin invite code:** PATEL1 (use in student Connection page to link to owner's service)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + ShadCN UI + Recharts
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Auth: JWT (access 15min, refresh 7d), stored in localStorage
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/smart-tiffin/` — React+Vite frontend
  - `src/pages/student/` — Dashboard, Expenses, Budgets, Meals, Analytics, Connection, Settings
  - `src/pages/owner/` — Dashboard, Customers, Attendance, MealPlans, Billing, Payments, Analytics, Settings
  - `src/components/layout/DashboardLayout.tsx` — sidebar/topbar shell with role-aware nav
  - `src/lib/auth.tsx` — AuthContext, JWT token management
  - `src/lib/api-client.ts` — wires auth token getter into generated fetch client
- `artifacts/api-server/` — Express 5 API server
  - `src/routes/` — one file per domain (auth, students, expenses, budgets, meals, owners, customers, mealPlans, attendance, billing, payments, studentAnalytics, ownerAnalytics, notifications, connections)
  - `src/middleware/auth.ts` — JWT verify middleware, requireRole helper
- `lib/db/` — Drizzle ORM schema (13 table files) + migrations
- `lib/api-client-react/` — Orval-generated React Query hooks
- `lib/api-zod/` — Orval-generated Zod schemas
- `scripts/src/seed.ts` — database seed with realistic demo data

## Architecture decisions

- **Contract-first API:** OpenAPI spec in `artifacts/api-spec/` drives both frontend hooks (Orval) and backend validation (Zod schemas from `drizzle-zod`). No hand-written fetch code.
- **Dual-role auth:** Single JWT payload carries `role` + `studentId`/`ownerId`. Route middleware enforces role boundaries.
- **Drizzle numeric fields return strings** — all route handlers convert with `Number()` before arithmetic.
- **Route ordering:** specific routes (e.g. `/expenses/summary`, `/budgets/current`) registered BEFORE parameterized routes (`:id`) in each route file to prevent false matches.
- **`lib/api-client-react/custom-fetch`** exported via `package.json` `exports` field — required by `src/lib/api-client.ts` to inject auth headers.

## Product

- **Student role:** track daily expenses by category, set monthly/weekly budgets with alert thresholds, log morning/evening meals on a calendar, view AI-style financial insights, connect to a tiffin service via invite code, see bills and payment status.
- **Owner role:** manage customers and meal plans, mark daily attendance (morning/evening) with bulk-mark shortcuts, generate monthly bills with discounts/extra charges, record payments, view revenue trends, retention rates, churn risk, and top customers.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Do not run `pnpm dev` at workspace root** — individual artifacts need env vars from workflow config.
- Verify artifacts with `pnpm --filter @workspace/<slug> run typecheck`, not `build`.
- `useToast` import path: `@/hooks/use-toast` (not `@/components/ui/use-toast`).
- Generated hooks take params as **first argument directly**: `useListExpenses({ month, year })` — NOT wrapped in `{ query: { params: ... } }`.
- After any schema or route change, run `pnpm --filter @workspace/api-spec run codegen` to regenerate hooks.
- `@workspace/api-client-react/custom-fetch` subpath export must be listed in `lib/api-client-react/package.json` exports.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- OpenAPI spec: `artifacts/api-spec/openapi.yaml`
