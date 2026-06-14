---
name: Smart Tiffin Project Setup
description: Key quirks and decisions for the Smart Tiffin & Student Analytics Platform
---

## Orval-generated hook call signature
Params go as the **first argument directly**, NOT wrapped in `{ query: { params: ... } }`:
```ts
useListExpenses({ month, year })          // ✓ correct
useListExpenses({ query: { params: ... }}) // ✗ wrong — causes TS2353
```
**Why:** Orval generates `(params?: ParamsType, options?: QueryOptions)` signatures.

## useToast import path
`@/hooks/use-toast` — NOT `@/components/ui/use-toast` (that file doesn't exist in this project).

## api-client-react custom-fetch subpath export
`lib/api-client-react/package.json` must have `"./custom-fetch": "./src/custom-fetch.ts"` in `exports` for `src/lib/api-client.ts` to import `setAuthTokenGetter`.

## Bill / TopCustomer optional fields
`Bill.paidAmount` and `Bill.discount` are optional (`?`) in the schema — always guard with `!= null` before use.
`TopCustomer` uses `.name` (not `.customerName`).

## Drizzle numeric fields return strings
All route handlers must convert with `Number()` before arithmetic on numeric DB columns.

## Route ordering
Specific routes (e.g. `/expenses/summary`, `/budgets/current`) must be registered BEFORE parameterized routes (`:id`) in each Express route file.

## Seed script
`pnpm --filter @workspace/scripts run seed` — idempotent (checks for existing data before inserting). Requires `drizzle-orm` and `pg` in scripts dependencies.

## Demo credentials
- Student: arjun@example.com / password123
- Owner: ramesh@tiffin.com / password123
- Invite code: PATEL1 (student uses this in Connection page to link to owner's service)
