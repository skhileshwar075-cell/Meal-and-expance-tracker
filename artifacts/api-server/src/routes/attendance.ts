import { Router } from "express";
import { db } from "@workspace/db";
import { attendanceTable, customersTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

// GET /attendance/today
router.get("/attendance/today", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const dateStr = new Date().toISOString().split("T")[0];
    const customers = await db.select().from(customersTable).where(
      and(eq(customersTable.ownerId, ownerId), eq(customersTable.status, "active"), sql`${customersTable.deletedAt} IS NULL`)
    );
    const custIds = customers.map(c => c.id);
    const records = custIds.length > 0
      ? await db.select().from(attendanceTable).where(and(sql`${attendanceTable.customerId} = ANY(ARRAY[${sql.join(custIds.map(id => sql`${id}`), sql`, `)}]::int[])`, eq(attendanceTable.date, dateStr)))
      : [];
    const morningCount = records.filter(r => r.morningPresent).length;
    const eveningCount = records.filter(r => r.eveningPresent).length;
    const custMap = Object.fromEntries(customers.map(c => [c.id, c.name]));
    res.json({
      date: dateStr,
      totalCustomers: customers.length,
      morningCount,
      eveningCount,
      records: records.map(r => ({ ...r, customerName: custMap[r.customerId] ?? "" })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /attendance/forecast
router.get("/attendance/forecast", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    // Look at last 30 days
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const customers = await db.select().from(customersTable).where(
      and(eq(customersTable.ownerId, ownerId), eq(customersTable.status, "active"), sql`${customersTable.deletedAt} IS NULL`)
    );
    const custIds = customers.map(c => c.id);
    const records = custIds.length > 0
      ? await db.select().from(attendanceTable).where(
          and(
            sql`${attendanceTable.customerId} = ANY(ARRAY[${sql.join(custIds.map(id => sql`${id}`), sql`, `)}]::int[])`,
            gte(attendanceTable.date, thirtyDaysAgo.toISOString().split("T")[0])
          )
        )
      : [];
    const avgMorning = records.length > 0 ? records.filter(r => r.morningPresent).length / 30 : 0;
    const avgEvening = records.length > 0 ? records.filter(r => r.eveningPresent).length / 30 : 0;
    const confidence = Math.min(95, Math.max(50, records.length > 0 ? 70 + records.length / 10 : 50));
    res.json({
      date: tomorrowStr,
      predictedMorning: Math.round(avgMorning),
      predictedEvening: Math.round(avgEvening),
      morningConfidence: confidence,
      eveningConfidence: confidence,
      basedOnDays: Math.min(30, records.length),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /attendance
router.get("/attendance", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const { date, customerId, month, year } = req.query;
    const customers = await db.select().from(customersTable).where(
      and(eq(customersTable.ownerId, ownerId), sql`${customersTable.deletedAt} IS NULL`)
    );
    const custIds = customers.map(c => c.id);
    if (custIds.length === 0) { res.json([]); return; }
    const custMap = Object.fromEntries(customers.map(c => [c.id, c.name]));
    const conditions = [sql`${attendanceTable.customerId} = ANY(ARRAY[${sql.join(custIds.map(id => sql`${id}`), sql`, `)}]::int[])`];
    if (date) conditions.push(eq(attendanceTable.date, String(date)));
    if (customerId) conditions.push(eq(attendanceTable.customerId, Number(customerId)));
    if (month && year) {
      const m = String(month).padStart(2, "0");
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const endDate = `${year}-${m}-${String(lastDay).padStart(2, "0")}`;
      conditions.push(gte(attendanceTable.date, `${year}-${m}-01`));
      conditions.push(lte(attendanceTable.date, endDate));
    }
    const records = await db.select().from(attendanceTable).where(and(...conditions));
    res.json(records.map(r => ({ ...r, customerName: custMap[r.customerId] ?? "" })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /attendance
router.post("/attendance", requireAuth, requireRole("owner"), async (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    res.status(400).json({ error: "records array is required" });
    return;
  }
  try {
    const ownerId = req.user!.ownerId!;
    const customers = await db.select().from(customersTable).where(
      and(eq(customersTable.ownerId, ownerId), sql`${customersTable.deletedAt} IS NULL`)
    );
    const custMap = Object.fromEntries(customers.map(c => [c.id, c]));
    const results = [];
    for (const rec of records) {
      if (!custMap[rec.customerId]) continue;
      const [existing] = await db.select().from(attendanceTable).where(
        and(eq(attendanceTable.customerId, rec.customerId), eq(attendanceTable.date, rec.date))
      );
      if (existing) {
        const [row] = await db.update(attendanceTable).set({
          morningPresent: rec.morningPresent, eveningPresent: rec.eveningPresent,
          notes: rec.notes ?? existing.notes, updatedAt: new Date(),
        }).where(eq(attendanceTable.id, existing.id)).returning();
        results.push({ ...row, customerName: custMap[rec.customerId].name });
      } else {
        const [row] = await db.insert(attendanceTable).values({
          customerId: rec.customerId, date: rec.date,
          morningPresent: rec.morningPresent, eveningPresent: rec.eveningPresent,
          notes: rec.notes ?? null,
        }).returning();
        results.push({ ...row, customerName: custMap[rec.customerId].name });
      }
    }
    res.json(results);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
