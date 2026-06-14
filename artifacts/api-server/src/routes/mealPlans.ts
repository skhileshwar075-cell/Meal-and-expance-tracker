import { Router } from "express";
import { db } from "@workspace/db";
import { mealPlansTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

// GET /meal-plans
router.get("/meal-plans", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const rows = await db.select().from(mealPlansTable).where(
      and(eq(mealPlansTable.ownerId, req.user!.ownerId!), sql`${mealPlansTable.deletedAt} IS NULL`)
    );
    res.json(rows.map(p => ({ ...p, pricePerMonth: Number(p.pricePerMonth), pricePerMeal: p.pricePerMeal ? Number(p.pricePerMeal) : null })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /meal-plans
router.post("/meal-plans", requireAuth, requireRole("owner"), async (req, res) => {
  const { name, planType, pricePerMonth, pricePerMeal, billingType, isActive } = req.body;
  if (!name || !planType || pricePerMonth == null || !billingType) {
    res.status(400).json({ error: "name, planType, pricePerMonth, and billingType are required" });
    return;
  }
  try {
    const [row] = await db.insert(mealPlansTable).values({
      ownerId: req.user!.ownerId!,
      name, planType, pricePerMonth: String(pricePerMonth),
      pricePerMeal: pricePerMeal ? String(pricePerMeal) : null,
      billingType, isActive: isActive ?? true,
    }).returning();
    res.status(201).json({ ...row, pricePerMonth: Number(row.pricePerMonth), pricePerMeal: row.pricePerMeal ? Number(row.pricePerMeal) : null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /meal-plans/:id
router.put("/meal-plans/:id", requireAuth, requireRole("owner"), async (req, res) => {
  const { name, planType, pricePerMonth, pricePerMeal, billingType, isActive } = req.body;
  try {
    const [row] = await db.update(mealPlansTable).set({
      name: name ?? undefined, planType: planType ?? undefined,
      pricePerMonth: pricePerMonth != null ? String(pricePerMonth) : undefined,
      pricePerMeal: pricePerMeal != null ? String(pricePerMeal) : undefined,
      billingType: billingType ?? undefined, isActive: isActive ?? undefined,
      updatedAt: new Date(),
    }).where(and(eq(mealPlansTable.id, Number(req.params.id)), eq(mealPlansTable.ownerId, req.user!.ownerId!), sql`${mealPlansTable.deletedAt} IS NULL`)).returning();
    if (!row) { res.status(404).json({ error: "Meal plan not found" }); return; }
    res.json({ ...row, pricePerMonth: Number(row.pricePerMonth), pricePerMeal: row.pricePerMeal ? Number(row.pricePerMeal) : null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /meal-plans/:id
router.delete("/meal-plans/:id", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    await db.update(mealPlansTable).set({ deletedAt: new Date(), isActive: false }).where(
      and(eq(mealPlansTable.id, Number(req.params.id)), eq(mealPlansTable.ownerId, req.user!.ownerId!))
    );
    res.json({ message: "Meal plan deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
