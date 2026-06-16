# SmartTiffin — Student & Tiffin Owner Platform

A dual-role SaaS web application connecting students with home tiffin services. Students track meals, expenses, and budgets; tiffin owners manage customers, attendance, billing, and payments — with rich analytics for both sides.

---

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Push database schema
pnpm --filter @workspace/db run push

# 3. Seed demo data
pnpm --filter @workspace/scripts run seed

# 4. Start the app
bash start.sh
```

The app runs at **http://localhost:8081** (frontend) and **http://localhost:8080** (API).

---

## Demo Credentials

| Role    | Email                 | Password     |
|---------|-----------------------|--------------|
| Student | arjun@example.com     | password123  |
| Student | priya@example.com     | password123  |
| Owner   | ramesh@tiffin.com     | password123  |

**Invite code:** `PATEL1` — students enter this in the Connection page to link to the owner's tiffin service.

---

## Tech Stack

| Layer      | Technology                                          |
|------------|-----------------------------------------------------|
| Runtime    | Node.js 24, TypeScript 5.9                          |
| Frontend   | React 19, Vite 7, Tailwind CSS 4, ShadCN UI, Wouter |
| Charts     | Recharts                                            |
| Backend    | Express 5                                           |
| Database   | PostgreSQL 16 + Drizzle ORM                         |
| Validation | Zod, drizzle-zod                                    |
| Auth       | JWT (access 15 min / refresh 7 days)                |
| Monorepo   | pnpm workspaces                                     |

---

## Project Structure

```
/
├── artifacts/
│   ├── backend/           # Express 5 API server  →  port 8080, path /api
│   └── frontend/          # React + Vite web app  →  port 8081, path /
├── lib/
│   ├── db/                # Drizzle ORM schema + push config
│   ├── api-spec/          # OpenAPI spec (openapi.yaml)
│   ├── api-client-react/  # Orval-generated React Query hooks
│   └── api-zod/           # Orval-generated Zod schemas
├── scripts/
│   └── src/seed.ts        # Idempotent demo data seeder
├── start.sh               # Starts backend + frontend together
├── pnpm-workspace.yaml
└── README.md
```

### Backend routes (`artifacts/backend/src/routes/`)

| File                  | Domain                                          |
|-----------------------|-------------------------------------------------|
| `auth.ts`             | Login, register, refresh, logout                |
| `students.ts`         | Student profile & dashboard                     |
| `expenses.ts`         | Expense CRUD + summary                          |
| `budgets.ts`          | Budget CRUD + current period                    |
| `meals.ts`            | Meal log CRUD + summary                         |
| `owners.ts`           | Owner profile                                   |
| `customers.ts`        | Customer CRUD + summary                         |
| `mealPlans.ts`        | Meal plan management                            |
| `attendance.ts`       | Daily attendance marking (bulk)                 |
| `billing.ts`          | Bill generation & management                    |
| `payments.ts`         | Payment recording & reconcile                   |
| `connections.ts`      | Student ↔ owner invite-code flow                |
| `reminders.ts`        | SMS/WhatsApp reminders via Twilio               |
| `studentAnalytics.ts` | Spending insights, wellness scores, trends      |
| `ownerAnalytics.ts`   | Revenue, retention, churn, top customers        |
| `notifications.ts`    | In-app notification feed                        |

### Frontend pages (`artifacts/frontend/src/pages/`)

**Student role** — `src/pages/student/`

| Page         | Description                                              |
|--------------|----------------------------------------------------------|
| `Dashboard`  | Spending summary, meal overview, linked service status   |
| `Expenses`   | CRUD expense log with category breakdown                 |
| `Budgets`    | Monthly/weekly budgets with alert thresholds             |
| `Meals`      | Calendar meal log (morning / evening)                    |
| `Analytics`  | Financial insights, wellness scores, spending trends     |
| `Connection` | Enter invite code, view bills and payment history        |
| `Settings`   | Profile management                                       |

**Owner role** — `src/pages/owner/`

| Page         | Description                                              |
|--------------|----------------------------------------------------------|
| `Dashboard`  | Collection totals, outstanding, customer count, rate     |
| `Customers`  | Customer CRUD with meal plan assignment                  |
| `MealPlans`  | Create / edit meal plan pricing                          |
| `Attendance` | Daily bulk attendance marking grid                       |
| `Billing`    | Generate monthly bills, apply discounts / extra charges  |
| `Payments`   | Record payments (cash/UPI/bank/cheque), reconcile totals |
| `Analytics`  | Revenue trends, retention, churn risk, top customers     |
| `Settings`   | Owner profile & service settings                         |

---

## Common Commands

```bash
# Start everything
bash start.sh

# Start services individually
PORT=8080 pnpm --filter @workspace/backend run dev
PORT=8081 BASE_PATH=/ pnpm --filter @workspace/frontend run dev

# Database
pnpm --filter @workspace/db run push          # Push schema (dev)
pnpm --filter @workspace/db run push-force    # Force push (drops conflicts)
pnpm --filter @workspace/scripts run seed     # Seed demo data

# Code quality
pnpm run typecheck                            # Full typecheck
pnpm run build                                # Typecheck + build all
```

---

## Environment Variables

| Variable             | Required | Description                                    |
|----------------------|----------|------------------------------------------------|
| `DATABASE_URL`       | Yes      | PostgreSQL connection string                   |
| `JWT_SECRET`         | Yes      | JWT signing secret                             |
| `TWILIO_ACCOUNT_SID` | No       | Twilio account SID (SMS/WhatsApp reminders)    |
| `TWILIO_AUTH_TOKEN`  | No       | Twilio auth token                              |
| `TWILIO_FROM_NUMBER` | No       | Sender phone number                            |
| `TWILIO_CHANNEL`     | No       | `sms` or `whatsapp`                            |

> If Twilio vars are absent the reminders feature runs in **mock mode** — it logs to console and records to `reminder_logs` but sends no real messages.

---

## Known Gotchas

- **Drizzle numeric columns return strings** — always `Number()` before arithmetic.
- **PostgreSQL DATE range** — compute last day with `new Date(year, month, 0).getDate()`; never hardcode `31`.
- **Route ordering** — register specific routes (`/expenses/summary`) before parameterized ones (`:id`).
- **`collectionRate`** — already 0–100 from the backend; do not multiply by 100 again on the frontend.
- **`useToast`** — import from `@/hooks/use-toast`, not `@/components/ui/use-toast`.
- **Orval hook params** — first argument directly: `useListExpenses({ month, year })`, not `{ query: { ... } }`.
- **Payments** — `POST /bills` returns 409 if a non-deleted bill already exists for the same customer + month + year.
