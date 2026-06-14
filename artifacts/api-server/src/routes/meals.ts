import { Router } from "express";
import { db } from "@workspace/db";
import { mealRecordsTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

// GET /meals
router.get("/meals", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const studentId = req.user!.studentId!;
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();
    const m = String(month).padStart(2, "0");
    const rows = await db.select().from(mealRecordsTable).where(
      and(eq(mealRecordsTable.studentId, studentId), gte(mealRecordsTable.date, `${year}-${m}-01`), lte(mealRecordsTable.date, `${year}-${m}-31`))
    );
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /meals
router.post("/meals", requireAuth, requireRole("student"), async (req, res) => {
  const { date, morningMeal, eveningMeal, notes } = req.body;
  if (!date) { res.status(400).json({ error: "date is required" }); return; }
  try {
    const studentId = req.user!.studentId!;
    // Upsert: check if exists
    const [existing] = await db.select().from(mealRecordsTable).where(
      and(eq(mealRecordsTable.studentId, studentId), eq(mealRecordsTable.date, date))
    );
    if (existing) {
      const [row] = await db.update(mealRecordsTable).set({
        morningMeal: morningMeal ?? existing.morningMeal,
        eveningMeal: eveningMeal ?? existing.eveningMeal,
        notes: notes ?? existing.notes,
        updatedAt: new Date(),
      }).where(eq(mealRecordsTable.id, existing.id)).returning();
      res.status(201).json(row);
    } else {
      const [row] = await db.insert(mealRecordsTable).values({
        studentId,
        date,
        morningMeal: morningMeal ?? false,
        eveningMeal: eveningMeal ?? false,
        notes: notes ?? null,
      }).returning();
      res.status(201).json(row);
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /meals/summary
router.get("/meals/summary", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const studentId = req.user!.studentId!;
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();
    const m = String(month).padStart(2, "0");
    const rows = await db.select().from(mealRecordsTable).where(
      and(eq(mealRecordsTable.studentId, studentId), gte(mealRecordsTable.date, `${year}-${m}-01`), lte(mealRecordsTable.date, `${year}-${m}-31`))
    );
    const totalMorning = rows.filter(r => r.morningMeal).length;
    const totalEvening = rows.filter(r => r.eveningMeal).length;
    const totalMeals = totalMorning + totalEvening;
    const daysTracked = rows.length;
    res.json({ totalMorning, totalEvening, totalMeals, daysTracked, averageMealsPerDay: daysTracked > 0 ? totalMeals / daysTracked : 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
