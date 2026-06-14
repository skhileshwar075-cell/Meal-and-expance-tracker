import { Router } from "express";
import { db } from "@workspace/db";
import { billsTable, customersTable, attendanceTable, mealPlansTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

// GET /bills/student
router.get("/bills/student", requireAuth, requireRole("student"), async (req, res) => {
  try {
    // Find connection
    const conns = await db.execute(sql`
      SELECT sc.*, c.id as cust_id FROM service_connections sc
      JOIN customers c ON c.linked_student_id = (SELECT id FROM students WHERE user_id = ${req.user!.userId})
      WHERE sc.student_id = (SELECT id FROM students WHERE user_id = ${req.user!.userId}) AND sc.status = 'active'
      LIMIT 1
    `);
    if (!conns.rows || conns.rows.length === 0) { res.json([]); return; }
    const custId = (conns.rows[0] as any).cust_id;
    if (!custId) { res.json([]); return; }
    const bills = await db.select().from(billsTable).where(
      and(eq(billsTable.customerId, custId), sql`${billsTable.deletedAt} IS NULL`)
    );
    const [cust] = await db.select().from(customersTable).where(eq(customersTable.id, custId));
    res.json(bills.map(b => ({
      ...b, customerName: cust?.name ?? "",
      rate: Number(b.rate), discount: Number(b.discount), extraCharges: Number(b.extraCharges),
      totalAmount: Number(b.totalAmount), paidAmount: Number(b.paidAmount),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /bills
router.get("/bills", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const { customerId, month, year, status } = req.query;
    const customers = await db.select().from(customersTable).where(
      and(eq(customersTable.ownerId, ownerId), sql`${customersTable.deletedAt} IS NULL`)
    );
    const custIds = customers.map(c => c.id);
    if (custIds.length === 0) { res.json([]); return; }
    const custMap = Object.fromEntries(customers.map(c => [c.id, c.name]));
    const conditions = [
      sql`${billsTable.customerId} = ANY(ARRAY[${sql.join(custIds.map(id => sql`${id}`), sql`, `)}]::int[])`,
      sql`${billsTable.deletedAt} IS NULL`,
    ];
    if (customerId) conditions.push(eq(billsTable.customerId, Number(customerId)));
    if (month) conditions.push(eq(billsTable.month, Number(month)));
    if (year) conditions.push(eq(billsTable.year, Number(year)));
    if (status && status !== "all") conditions.push(eq(billsTable.status, String(status)));
    const rows = await db.select().from(billsTable).where(and(...conditions));
    res.json(rows.map(b => ({
      ...b, customerName: custMap[b.customerId] ?? "",
      rate: Number(b.rate), discount: Number(b.discount), extraCharges: Number(b.extraCharges),
      totalAmount: Number(b.totalAmount), paidAmount: Number(b.paidAmount),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /bills
router.post("/bills", requireAuth, requireRole("owner"), async (req, res) => {
  const { customerId, month, year, discount, extraCharges, notes, dueDate } = req.body;
  if (!customerId || !month || !year) {
    res.status(400).json({ error: "customerId, month, and year are required" });
    return;
  }
  try {
    const ownerId = req.user!.ownerId!;
    const [customer] = await db.select().from(customersTable).where(
      and(eq(customersTable.id, customerId), eq(customersTable.ownerId, ownerId))
    );
    if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }

    // Count attendance
    const m = String(month).padStart(2, "0");
    const lastDayOfMonth = new Date(Number(year), Number(month), 0).getDate();
    const monthEndStr = `${year}-${m}-${String(lastDayOfMonth).padStart(2, "0")}`;
    const attRecords = await db.select().from(attendanceTable).where(
      and(eq(attendanceTable.customerId, customerId), sql`date >= '${sql.raw(`${year}-${m}-01`)}' AND date <= '${sql.raw(monthEndStr)}'`)
    );
    const mealsConsumed = attRecords.reduce((s, a) => s + (a.morningPresent ? 1 : 0) + (a.eveningPresent ? 1 : 0), 0);

    // Get rate from meal plan
    let rate = 0;
    if (customer.planId) {
      const [plan] = await db.select().from(mealPlansTable).where(eq(mealPlansTable.id, customer.planId));
      if (plan) {
        rate = plan.billingType === "per_meal" && plan.pricePerMeal
          ? Number(plan.pricePerMeal)
          : Number(plan.pricePerMonth) / Math.max(1, mealsConsumed || 60);
      }
    } else {
      rate = 50; // default per meal rate
    }

    const baseAmount = customer.planId
      ? (await db.select().from(mealPlansTable).where(eq(mealPlansTable.id, customer.planId!)).then(p => p[0]?.billingType === "monthly" ? Number(p[0].pricePerMonth) : rate * mealsConsumed))
      : rate * mealsConsumed;
    const disc = Number(discount ?? 0);
    const extra = Number(extraCharges ?? 0);
    const totalAmount = Math.max(0, baseAmount - disc + extra);

    const [row] = await db.insert(billsTable).values({
      customerId, month, year, mealsConsumed,
      rate: String(rate), discount: String(disc), extraCharges: String(extra),
      totalAmount: String(totalAmount), status: "unpaid", paidAmount: "0",
      dueDate: dueDate ?? null, notes: notes ?? null,
    }).returning();

    // Update customer totalBilled
    await db.execute(sql`UPDATE customers SET total_billed = total_billed + ${totalAmount} WHERE id = ${customerId}`);

    res.status(201).json({
      ...row, customerName: customer.name,
      rate: Number(row.rate), discount: Number(row.discount), extraCharges: Number(row.extraCharges),
      totalAmount: Number(row.totalAmount), paidAmount: Number(row.paidAmount),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /bills/:id
router.get("/bills/:id", requireAuth, async (req, res) => {
  try {
    const [row] = await db.select().from(billsTable).where(
      and(eq(billsTable.id, Number(req.params.id)), sql`${billsTable.deletedAt} IS NULL`)
    );
    if (!row) { res.status(404).json({ error: "Bill not found" }); return; }
    const [cust] = await db.select().from(customersTable).where(eq(customersTable.id, row.customerId));
    res.json({
      ...row, customerName: cust?.name ?? "",
      rate: Number(row.rate), discount: Number(row.discount), extraCharges: Number(row.extraCharges),
      totalAmount: Number(row.totalAmount), paidAmount: Number(row.paidAmount),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /bills/:id
router.put("/bills/:id", requireAuth, requireRole("owner"), async (req, res) => {
  const { discount, extraCharges, notes, dueDate, status } = req.body;
  try {
    const [existing] = await db.select().from(billsTable).where(eq(billsTable.id, Number(req.params.id)));
    if (!existing) { res.status(404).json({ error: "Bill not found" }); return; }
    const disc = discount != null ? Number(discount) : Number(existing.discount);
    const extra = extraCharges != null ? Number(extraCharges) : Number(existing.extraCharges);
    const base = Number(existing.totalAmount) + Number(existing.discount) - Number(existing.extraCharges);
    const newTotal = Math.max(0, base - disc + extra);
    const [row] = await db.update(billsTable).set({
      discount: String(disc), extraCharges: String(extra),
      totalAmount: String(newTotal),
      notes: notes ?? undefined, dueDate: dueDate ?? undefined,
      status: status ?? undefined, updatedAt: new Date(),
    }).where(eq(billsTable.id, Number(req.params.id))).returning();
    const [cust] = await db.select().from(customersTable).where(eq(customersTable.id, row.customerId));
    res.json({
      ...row, customerName: cust?.name ?? "",
      rate: Number(row.rate), discount: Number(row.discount), extraCharges: Number(row.extraCharges),
      totalAmount: Number(row.totalAmount), paidAmount: Number(row.paidAmount),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
