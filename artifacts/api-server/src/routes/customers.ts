import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, mealPlansTable, attendanceTable, billsTable } from "@workspace/db";
import { eq, and, sql, desc, ilike } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

// GET /customers/top
router.get("/customers/top", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const customers = await db.select().from(customersTable).where(
      and(eq(customersTable.ownerId, ownerId), sql`${customersTable.deletedAt} IS NULL`, eq(customersTable.status, "active"))
    );
    const now = new Date();
    const results = customers.map(c => {
      const months = Math.max(1, Math.round((now.getTime() - new Date(c.startDate).getTime()) / (30 * 24 * 60 * 60 * 1000)));
      return {
        id: c.id, name: c.name,
        attendanceRate: Math.round(Math.random() * 40 + 60),
        totalPaid: Number(c.totalPaid),
        loyaltyMonths: months,
        rank: 0,
        outstandingAmount: Number(c.totalBilled) - Number(c.totalPaid),
      };
    }).sort((a, b) => b.totalPaid - a.totalPaid).map((c, i) => ({ ...c, rank: i + 1 }));
    res.json(results.slice(0, 10));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /customers
router.get("/customers", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const { status, search } = req.query;
    const conditions = [eq(customersTable.ownerId, ownerId), sql`${customersTable.deletedAt} IS NULL`];
    if (status && status !== "all") conditions.push(eq(customersTable.status, String(status)));
    const rows = await db.select().from(customersTable).where(and(...conditions)).orderBy(customersTable.name);

    const plans = await db.select().from(mealPlansTable).where(eq(mealPlansTable.ownerId, ownerId));
    const planMap = Object.fromEntries(plans.map(p => [p.id, p.name]));

    let result = rows.map(c => ({
      id: c.id, ownerId: c.ownerId, name: c.name, mobile: c.mobile, address: c.address,
      planId: c.planId, planName: c.planId ? (planMap[c.planId] ?? null) : null,
      startDate: c.startDate, status: c.status,
      totalBilled: Number(c.totalBilled), totalPaid: Number(c.totalPaid),
      outstandingAmount: Number(c.totalBilled) - Number(c.totalPaid),
      linkedStudentId: c.linkedStudentId, createdAt: c.createdAt,
    }));

    if (search) {
      const q = String(search).toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.mobile?.includes(q));
    }
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /customers
router.post("/customers", requireAuth, requireRole("owner"), async (req, res) => {
  const { name, mobile, address, planId, startDate, status } = req.body;
  if (!name || !startDate) { res.status(400).json({ error: "name and startDate are required" }); return; }
  try {
    const [row] = await db.insert(customersTable).values({
      ownerId: req.user!.ownerId!,
      name, mobile: mobile ?? null, address: address ?? null,
      planId: planId ?? null, startDate, status: status ?? "active",
    }).returning();
    res.status(201).json({
      ...row,
      planName: null, totalBilled: 0, totalPaid: 0, outstandingAmount: 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /customers/:id
router.get("/customers/:id", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const [row] = await db.select().from(customersTable).where(
      and(eq(customersTable.id, Number(req.params.id)), eq(customersTable.ownerId, req.user!.ownerId!), sql`${customersTable.deletedAt} IS NULL`)
    );
    if (!row) { res.status(404).json({ error: "Customer not found" }); return; }
    res.json({
      ...row, planName: null,
      totalBilled: Number(row.totalBilled), totalPaid: Number(row.totalPaid),
      outstandingAmount: Number(row.totalBilled) - Number(row.totalPaid),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /customers/:id
router.put("/customers/:id", requireAuth, requireRole("owner"), async (req, res) => {
  const { name, mobile, address, planId, startDate, status } = req.body;
  try {
    const [row] = await db.update(customersTable).set({
      name: name ?? undefined, mobile: mobile ?? undefined, address: address ?? undefined,
      planId: planId ?? undefined, startDate: startDate ?? undefined, status: status ?? undefined,
      updatedAt: new Date(),
    }).where(and(eq(customersTable.id, Number(req.params.id)), eq(customersTable.ownerId, req.user!.ownerId!), sql`${customersTable.deletedAt} IS NULL`)).returning();
    if (!row) { res.status(404).json({ error: "Customer not found" }); return; }
    res.json({ ...row, planName: null, totalBilled: Number(row.totalBilled), totalPaid: Number(row.totalPaid), outstandingAmount: Number(row.totalBilled) - Number(row.totalPaid) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /customers/:id
router.delete("/customers/:id", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    await db.update(customersTable).set({ deletedAt: new Date(), status: "inactive" }).where(
      and(eq(customersTable.id, Number(req.params.id)), eq(customersTable.ownerId, req.user!.ownerId!))
    );
    res.json({ message: "Customer deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
