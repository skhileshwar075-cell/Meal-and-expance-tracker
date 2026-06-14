import { Router } from "express";
import { db } from "@workspace/db";
import { expensesTable } from "@workspace/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

// GET /expenses
router.get("/expenses", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const studentId = req.user!.studentId!;
    const { month, year, category } = req.query;
    const conditions = [eq(expensesTable.studentId, studentId), sql`${expensesTable.deletedAt} IS NULL`];
    if (month && year) {
      const m = String(month).padStart(2, "0");
      conditions.push(gte(expensesTable.date, `${year}-${m}-01`));
      conditions.push(lte(expensesTable.date, `${year}-${m}-31`));
    }
    if (category) conditions.push(eq(expensesTable.category, String(category)));
    const rows = await db.select().from(expensesTable).where(and(...conditions)).orderBy(desc(expensesTable.date));
    res.json(rows.map(e => ({ ...e, amount: Number(e.amount) })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /expenses
router.post("/expenses", requireAuth, requireRole("student"), async (req, res) => {
  const { date, category, amount, description } = req.body;
  if (!date || !category || amount == null) {
    res.status(400).json({ error: "date, category, and amount are required" });
    return;
  }
  try {
    const [row] = await db.insert(expensesTable).values({
      studentId: req.user!.studentId!,
      date,
      category,
      amount: String(amount),
      description: description ?? null,
    }).returning();
    res.status(201).json({ ...row, amount: Number(row.amount) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /expenses/summary
router.get("/expenses/summary", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const studentId = req.user!.studentId!;
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();
    const m = String(month).padStart(2, "0");
    const rows = await db.select().from(expensesTable).where(
      and(
        eq(expensesTable.studentId, studentId),
        gte(expensesTable.date, `${year}-${m}-01`),
        lte(expensesTable.date, `${year}-${m}-31`),
        sql`${expensesTable.deletedAt} IS NULL`
      )
    );
    const total = rows.reduce((s, e) => s + Number(e.amount), 0);
    const byCat: Record<string, { amount: number; count: number }> = {};
    rows.forEach(e => {
      if (!byCat[e.category]) byCat[e.category] = { amount: 0, count: 0 };
      byCat[e.category].amount += Number(e.amount);
      byCat[e.category].count++;
    });
    const daysInMonth = new Date(year, month, 0).getDate();
    const byCategory = Object.entries(byCat).map(([category, d]) => ({
      category,
      amount: d.amount,
      percentage: total > 0 ? Math.round((d.amount / total) * 100) : 0,
      count: d.count,
    })).sort((a, b) => b.amount - a.amount);
    const topCategory = byCategory.length > 0 ? byCategory[0].category : null;
    res.json({
      total,
      byCategory,
      dailyAverage: total / daysInMonth,
      daysInMonth,
      topCategory,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /expenses/:id
router.get("/expenses/:id", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const [row] = await db.select().from(expensesTable).where(
      and(eq(expensesTable.id, Number(req.params.id)), eq(expensesTable.studentId, req.user!.studentId!), sql`${expensesTable.deletedAt} IS NULL`)
    );
    if (!row) { res.status(404).json({ error: "Expense not found" }); return; }
    res.json({ ...row, amount: Number(row.amount) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /expenses/:id
router.put("/expenses/:id", requireAuth, requireRole("student"), async (req, res) => {
  const { date, category, amount, description } = req.body;
  try {
    const [row] = await db.update(expensesTable).set({
      date: date ?? undefined,
      category: category ?? undefined,
      amount: amount != null ? String(amount) : undefined,
      description: description ?? undefined,
      updatedAt: new Date(),
    }).where(
      and(eq(expensesTable.id, Number(req.params.id)), eq(expensesTable.studentId, req.user!.studentId!), sql`${expensesTable.deletedAt} IS NULL`)
    ).returning();
    if (!row) { res.status(404).json({ error: "Expense not found" }); return; }
    res.json({ ...row, amount: Number(row.amount) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /expenses/:id
router.delete("/expenses/:id", requireAuth, requireRole("student"), async (req, res) => {
  try {
    await db.update(expensesTable).set({ deletedAt: new Date() }).where(
      and(eq(expensesTable.id, Number(req.params.id)), eq(expensesTable.studentId, req.user!.studentId!))
    );
    res.json({ message: "Expense deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
