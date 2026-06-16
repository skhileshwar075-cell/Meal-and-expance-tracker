import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, studentsTable, expensesTable, budgetsTable, mealRecordsTable } from "@workspace/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

// GET /students/profile
router.get("/students/profile", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.userId, req.user!.userId));
    if (!student) {
      res.status(404).json({ error: "Student profile not found" });
      return;
    }
    res.json({
      id: student.id,
      userId: student.userId,
      name: user.name,
      email: user.email,
      phone: student.phone,
      college: student.college,
      address: student.address,
      profilePicture: student.profilePicture,
      createdAt: student.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /students/profile
router.put("/students/profile", requireAuth, requireRole("student"), async (req, res) => {
  const { name, phone, college, address } = req.body;
  try {
    if (name) {
      await db.update(usersTable).set({ name, updatedAt: new Date() }).where(eq(usersTable.id, req.user!.userId));
    }
    await db.update(studentsTable).set({
      phone: phone ?? undefined,
      college: college ?? undefined,
      address: address ?? undefined,
      updatedAt: new Date(),
    }).where(eq(studentsTable.userId, req.user!.userId));

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.userId, req.user!.userId));
    res.json({
      id: student.id, userId: student.userId, name: user.name, email: user.email,
      phone: student.phone, college: student.college, address: student.address,
      profilePicture: student.profilePicture, createdAt: student.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /students/dashboard
router.get("/students/dashboard", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const studentId = req.user!.studentId!;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Get current budget
    const [budget] = await db.select().from(budgetsTable).where(
      and(eq(budgetsTable.studentId, studentId), eq(budgetsTable.month, month), eq(budgetsTable.year, year))
    );
    const monthlyBudget = budget ? Number(budget.monthlyAmount) : 0;

    // Total spent this month
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${monthStr}-${String(lastDay).padStart(2, "0")}`;
    const expenses = await db.select().from(expensesTable).where(
      and(
        eq(expensesTable.studentId, studentId),
        gte(expensesTable.date, `${monthStr}-01`),
        lte(expensesTable.date, monthEnd),
        sql`${expensesTable.deletedAt} IS NULL`
      )
    );
    const amountSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const remainingBudget = Math.max(0, monthlyBudget - amountSpent);
    const savings = monthlyBudget - amountSpent;

    // Meals this month
    const mealRecs = await db.select().from(mealRecordsTable).where(
      and(
        eq(mealRecordsTable.studentId, studentId),
        gte(mealRecordsTable.date, `${monthStr}-01`),
        lte(mealRecordsTable.date, monthEnd)
      )
    );
    const totalMeals = mealRecs.reduce((s, m) => s + (m.morningMeal ? 1 : 0) + (m.eveningMeal ? 1 : 0), 0);

    // Budget risk score
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysLeft = daysInMonth - now.getDate();
    const dailyRate = amountSpent / Math.max(1, now.getDate());
    const projectedTotal = dailyRate * daysInMonth;
    const budgetRiskScore = monthlyBudget > 0
      ? Math.min(100, Math.round((projectedTotal / monthlyBudget) * 100))
      : 0;

    // Recent expenses
    const recentExpenses = await db.select().from(expensesTable).where(
      and(eq(expensesTable.studentId, studentId), sql`${expensesTable.deletedAt} IS NULL`)
    ).orderBy(desc(expensesTable.createdAt)).limit(5);

    // Simple alerts
    const alerts = [];
    if (budgetRiskScore > 80) {
      alerts.push({ id: "budget-risk", type: "budget_warning", message: `You may exceed your budget in ${daysLeft} days at current spending rate.`, severity: "danger", category: null });
    } else if (budgetRiskScore > 60) {
      alerts.push({ id: "budget-warning", type: "budget_warning", message: "Your spending is tracking above budget. Consider reducing expenses.", severity: "warning", category: null });
    }

    res.json({
      monthlyBudget,
      amountSpent,
      remainingBudget,
      totalMeals,
      savings,
      budgetRiskScore,
      recentExpenses: recentExpenses.map(e => ({
        id: e.id, studentId: e.studentId, date: e.date, category: e.category,
        amount: Number(e.amount), description: e.description, createdAt: e.createdAt
      })),
      alerts,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
