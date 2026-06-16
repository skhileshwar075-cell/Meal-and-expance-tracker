import { Router } from "express";
import { db } from "@workspace/db";
import { expensesTable, budgetsTable } from "@workspace/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

function getMonthRange(year: number, month: number) {
  const m = String(month).padStart(2, "0");
  const daysInMonth = new Date(year, month, 0).getDate();
  return { start: `${year}-${m}-01`, end: `${year}-${m}-${daysInMonth}` };
}

// GET /analytics/student/spending-trend
router.get("/analytics/student/spending-trend", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const studentId = req.user!.studentId!;
    const period = (req.query.period as string) || "monthly";
    const months = Number(req.query.months) || 6;
    const now = new Date();

    if (period === "monthly") {
      const data = [];
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const { start, end } = getMonthRange(d.getFullYear(), d.getMonth() + 1);
        const rows = await db.select().from(expensesTable).where(
          and(eq(expensesTable.studentId, studentId), gte(expensesTable.date, start), lte(expensesTable.date, end), sql`${expensesTable.deletedAt} IS NULL`)
        );
        const amount = rows.reduce((s, e) => s + Number(e.amount), 0);
        data.push({ label: `${d.toLocaleString("default", { month: "short" })} ${d.getFullYear()}`, amount, date: start });
      }
      res.json({ period, data });
    } else if (period === "weekly") {
      const data = [];
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const rows = await db.select().from(expensesTable).where(
          and(eq(expensesTable.studentId, studentId),
            gte(expensesTable.date, weekStart.toISOString().split("T")[0]),
            lte(expensesTable.date, weekEnd.toISOString().split("T")[0]),
            sql`${expensesTable.deletedAt} IS NULL`)
        );
        const amount = rows.reduce((s, e) => s + Number(e.amount), 0);
        data.push({ label: `Week ${8 - i}`, amount, date: weekStart.toISOString().split("T")[0] });
      }
      res.json({ period, data });
    } else {
      // daily - last 30 days
      const data = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const rows = await db.select().from(expensesTable).where(
          and(eq(expensesTable.studentId, studentId), eq(expensesTable.date, dateStr), sql`${expensesTable.deletedAt} IS NULL`)
        );
        const amount = rows.reduce((s, e) => s + Number(e.amount), 0);
        data.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, amount, date: dateStr });
      }
      res.json({ period, data });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /analytics/student/scores
router.get("/analytics/student/scores", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const studentId = req.user!.studentId!;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const { start, end } = getMonthRange(year, month);

    const [budget] = await db.select().from(budgetsTable).where(
      and(eq(budgetsTable.studentId, studentId), eq(budgetsTable.month, month), eq(budgetsTable.year, year), sql`${budgetsTable.deletedAt} IS NULL`)
    );
    const monthlyBudget = budget ? Number(budget.monthlyAmount) : 0;

    const rows = await db.select().from(expensesTable).where(
      and(eq(expensesTable.studentId, studentId), gte(expensesTable.date, start), lte(expensesTable.date, end), sql`${expensesTable.deletedAt} IS NULL`)
    );
    const spent = rows.reduce((s, e) => s + Number(e.amount), 0);

    // Previous month
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prev = getMonthRange(prevYear, prevMonth);
    const prevRows = await db.select().from(expensesTable).where(
      and(eq(expensesTable.studentId, studentId), gte(expensesTable.date, prev.start), lte(expensesTable.date, prev.end), sql`${expensesTable.deletedAt} IS NULL`)
    );
    const prevSpent = prevRows.reduce((s, e) => s + Number(e.amount), 0);

    const daysInMonth = new Date(year, month, 0).getDate();
    const daysSoFar = now.getDate();
    const dailyRate = spent / Math.max(1, daysSoFar);
    const projectedTotal = dailyRate * daysInMonth;
    const daysLeft = daysInMonth - daysSoFar;

    const budgetRiskScore = monthlyBudget > 0
      ? Math.min(100, Math.round((projectedTotal / monthlyBudget) * 100))
      : 50;

    const savingsAmount = monthlyBudget - spent;
    const savingsRate = monthlyBudget > 0 ? Math.max(0, Math.round((savingsAmount / monthlyBudget) * 100)) : 0;
    const expenseGrowthRate = prevSpent > 0 ? Math.round(((spent - prevSpent) / prevSpent) * 100) : 0;

    // Financial discipline: based on budget adherence + savings
    const budgetAdherence = monthlyBudget > 0 ? Math.max(0, 100 - budgetRiskScore) : 50;
    const financialDisciplineScore = Math.round((budgetAdherence * 0.6) + (savingsRate * 0.4));

    res.json({ budgetRiskScore, financialDisciplineScore, savingsRate, expenseGrowthRate, savingsAmount });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /analytics/student/insights
router.get("/analytics/student/insights", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const studentId = req.user!.studentId!;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const { start, end } = getMonthRange(year, month);

    const [budget] = await db.select().from(budgetsTable).where(
      and(eq(budgetsTable.studentId, studentId), eq(budgetsTable.month, month), eq(budgetsTable.year, year), sql`${budgetsTable.deletedAt} IS NULL`)
    );
    const monthlyBudget = budget ? Number(budget.monthlyAmount) : 0;
    const rows = await db.select().from(expensesTable).where(
      and(eq(expensesTable.studentId, studentId), gte(expensesTable.date, start), lte(expensesTable.date, end), sql`${expensesTable.deletedAt} IS NULL`)
    );
    const spent = rows.reduce((s, e) => s + Number(e.amount), 0);

    // Category breakdown
    const byCat: Record<string, number> = {};
    rows.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount); });

    // Previous month for comparison
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prev = getMonthRange(prevYear, prevMonth);
    const prevRows = await db.select().from(expensesTable).where(
      and(eq(expensesTable.studentId, studentId), gte(expensesTable.date, prev.start), lte(expensesTable.date, prev.end), sql`${expensesTable.deletedAt} IS NULL`)
    );
    const prevByCat: Record<string, number> = {};
    prevRows.forEach(e => { prevByCat[e.category] = (prevByCat[e.category] || 0) + Number(e.amount); });

    const insights = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysLeft = daysInMonth - now.getDate();
    const dailyRate = spent / Math.max(1, now.getDate());
    const projectedTotal = dailyRate * daysInMonth;

    if (monthlyBudget > 0 && projectedTotal > monthlyBudget) {
      insights.push({ id: "exceed-budget", type: "budget_warning", message: `You may exceed your budget in ${Math.max(0, daysLeft)} days at current spending rate.`, severity: "danger", category: null });
    }
    Object.entries(byCat).forEach(([cat, amt]) => {
      const prev = prevByCat[cat] || 0;
      if (prev > 0 && amt > prev * 1.3) {
        const pct = Math.round(((amt - prev) / prev) * 100);
        insights.push({ id: `cat-${cat}`, type: "spending_pattern", message: `You spent ${pct}% more on ${cat} this month compared to last month.`, severity: "warning", category: cat });
      }
    });
    if (byCat["food"] && spent > 0 && byCat["food"] / spent > 0.5) {
      insights.push({ id: "food-high", type: "spending_pattern", message: "Food expenses account for more than 50% of your total spending.", severity: "info", category: "food" });
    }
    if (spent < monthlyBudget * 0.3 && now.getDate() > 15) {
      insights.push({ id: "saving-well", type: "saving_tip", message: "Great job! You are well under budget this month. Consider saving the surplus.", severity: "info", category: null });
    }

    // Deduplicate by both id and message before returning
    const seenIds = new Set<string>();
    const seenMessages = new Set<string>();
    const uniqueInsights = insights.filter(ins => {
      const msgKey = ins.message.trim().toLowerCase();
      if (seenIds.has(ins.id) || seenMessages.has(msgKey)) return false;
      seenIds.add(ins.id);
      seenMessages.add(msgKey);
      return true;
    });

    res.json(uniqueInsights.slice(0, 5));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /analytics/student/expense-patterns
router.get("/analytics/student/expense-patterns", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const studentId = req.user!.studentId!;
    const now = new Date();
    // Last 3 months
    const rows: Array<typeof expensesTable.$inferSelect> = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const { start, end } = getMonthRange(d.getFullYear(), d.getMonth() + 1);
      const r = await db.select().from(expensesTable).where(
        and(eq(expensesTable.studentId, studentId), gte(expensesTable.date, start), lte(expensesTable.date, end), sql`${expensesTable.deletedAt} IS NULL`)
      );
      rows.push(...r);
    }

    // Category frequency
    const byCat: Record<string, { total: number; count: number }> = {};
    rows.forEach(e => {
      if (!byCat[e.category]) byCat[e.category] = { total: 0, count: 0 };
      byCat[e.category].total += Number(e.amount);
      byCat[e.category].count++;
    });
    const totalSpent = rows.reduce((s, e) => s + Number(e.amount), 0);
    const frequentCategories = Object.entries(byCat).map(([category, d]) => ({
      category, amount: d.total, count: d.count,
      percentage: totalSpent > 0 ? Math.round((d.total / totalSpent) * 100) : 0,
    })).sort((a, b) => b.count - a.count);

    const recurringExpenses = Object.entries(byCat)
      .filter(([_, d]) => d.count >= 5)
      .map(([category, d]) => ({
        category,
        averageAmount: Math.round(d.total / d.count),
        frequency: "monthly",
        count: d.count,
      }));

    // Weekly pattern
    const weeklyPattern = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, i) => {
      const amount = rows.filter(e => new Date(e.date).getDay() === i).reduce((s, e) => s + Number(e.amount), 0);
      return { label, amount, date: null };
    });

    res.json({ recurringExpenses, frequentCategories, weeklyPattern });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
