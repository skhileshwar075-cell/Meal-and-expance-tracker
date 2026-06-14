import { Router } from "express";
import { db } from "@workspace/db";
import { budgetsTable, expensesTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

// GET /budgets
router.get("/budgets", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const rows = await db.select().from(budgetsTable).where(
      and(eq(budgetsTable.studentId, req.user!.studentId!), sql`${budgetsTable.deletedAt} IS NULL`)
    );
    res.json(rows.map(b => ({
      ...b, monthlyAmount: Number(b.monthlyAmount),
      weeklyAmount: b.weeklyAmount ? Number(b.weeklyAmount) : null,
      alertThreshold: b.alertThreshold ? Number(b.alertThreshold) : null,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /budgets
router.post("/budgets", requireAuth, requireRole("student"), async (req, res) => {
  const { month, year, monthlyAmount, weeklyAmount, alertThreshold } = req.body;
  if (!month || !year || monthlyAmount == null) {
    res.status(400).json({ error: "month, year, and monthlyAmount are required" });
    return;
  }
  try {
    const [row] = await db.insert(budgetsTable).values({
      studentId: req.user!.studentId!,
      month,
      year,
      monthlyAmount: String(monthlyAmount),
      weeklyAmount: weeklyAmount ? String(weeklyAmount) : null,
      alertThreshold: alertThreshold ? String(alertThreshold) : null,
    }).returning();
    res.status(201).json({
      ...row,
      monthlyAmount: Number(row.monthlyAmount),
      weeklyAmount: row.weeklyAmount ? Number(row.weeklyAmount) : null,
      alertThreshold: row.alertThreshold ? Number(row.alertThreshold) : null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /budgets/current
router.get("/budgets/current", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const studentId = req.user!.studentId!;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const [budget] = await db.select().from(budgetsTable).where(
      and(eq(budgetsTable.studentId, studentId), eq(budgetsTable.month, month), eq(budgetsTable.year, year), sql`${budgetsTable.deletedAt} IS NULL`)
    );
    const monthlyAmount = budget ? Number(budget.monthlyAmount) : 0;
    const m = String(month).padStart(2, "0");
    const rows = await db.select().from(expensesTable).where(
      and(eq(expensesTable.studentId, studentId), gte(expensesTable.date, `${year}-${m}-01`), lte(expensesTable.date, `${year}-${m}-31`), sql`${expensesTable.deletedAt} IS NULL`)
    );
    const spent = rows.reduce((s, e) => s + Number(e.amount), 0);
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysLeft = daysInMonth - now.getDate();
    const dailyRate = spent / Math.max(1, now.getDate());
    const projectedSpend = dailyRate * daysInMonth;
    res.json({
      budget: budget ? {
        ...budget, monthlyAmount: Number(budget.monthlyAmount),
        weeklyAmount: budget.weeklyAmount ? Number(budget.weeklyAmount) : null,
        alertThreshold: budget.alertThreshold ? Number(budget.alertThreshold) : null,
      } : null,
      spent,
      remaining: Math.max(0, monthlyAmount - spent),
      percentUsed: monthlyAmount > 0 ? Math.round((spent / monthlyAmount) * 100) : 0,
      daysLeft,
      projectedSpend,
      isAtRisk: projectedSpend > monthlyAmount,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /budgets/:id
router.put("/budgets/:id", requireAuth, requireRole("student"), async (req, res) => {
  const { month, year, monthlyAmount, weeklyAmount, alertThreshold } = req.body;
  try {
    const [row] = await db.update(budgetsTable).set({
      month: month ?? undefined,
      year: year ?? undefined,
      monthlyAmount: monthlyAmount != null ? String(monthlyAmount) : undefined,
      weeklyAmount: weeklyAmount != null ? String(weeklyAmount) : undefined,
      alertThreshold: alertThreshold != null ? String(alertThreshold) : undefined,
      updatedAt: new Date(),
    }).where(and(eq(budgetsTable.id, Number(req.params.id)), eq(budgetsTable.studentId, req.user!.studentId!))).returning();
    if (!row) { res.status(404).json({ error: "Budget not found" }); return; }
    res.json({
      ...row,
      monthlyAmount: Number(row.monthlyAmount),
      weeklyAmount: row.weeklyAmount ? Number(row.weeklyAmount) : null,
      alertThreshold: row.alertThreshold ? Number(row.alertThreshold) : null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
