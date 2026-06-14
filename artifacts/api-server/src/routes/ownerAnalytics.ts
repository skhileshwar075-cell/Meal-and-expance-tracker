import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, billsTable, paymentsTable, attendanceTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

function getMonthRange(year: number, month: number) {
  const m = String(month).padStart(2, "0");
  return { start: `${year}-${m}-01`, end: `${year}-${m}-31` };
}

// GET /analytics/owner/revenue
router.get("/analytics/owner/revenue", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const months = Number(req.query.months) || 6;
    const now = new Date();
    const customers = await db.select().from(customersTable).where(
      and(eq(customersTable.ownerId, ownerId), sql`${customersTable.deletedAt} IS NULL`)
    );
    const custIds = customers.map(c => c.id);

    const data = [];
    let prevTotal = 0;
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      let total = 0;
      if (custIds.length > 0) {
        const bills = await db.select().from(billsTable).where(
          and(sql`${billsTable.customerId} = ANY(ARRAY[${sql.join(custIds.map(id => sql`${id}`), sql`, `)}]::int[])`, eq(billsTable.month, month), eq(billsTable.year, year), sql`${billsTable.deletedAt} IS NULL`)
        );
        total = bills.reduce((s, b) => s + Number(b.paidAmount), 0);
      }
      data.push({ label: `${d.toLocaleString("default", { month: "short" })} ${year}`, amount: total, date: `${year}-${String(month).padStart(2, "0")}-01` });
      prevTotal = i === 1 ? total : prevTotal;
    }
    const totalRevenue = data.reduce((s, d) => s + d.amount, 0);
    const lastAmount = data[data.length - 1]?.amount || 0;
    const growth = prevTotal > 0 ? Math.round(((lastAmount - prevTotal) / prevTotal) * 100) : 0;
    res.json({ period: "monthly", data, totalRevenue, growth });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /analytics/owner/retention
router.get("/analytics/owner/retention", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const all = await db.select().from(customersTable).where(
      and(eq(customersTable.ownerId, ownerId), sql`${customersTable.deletedAt} IS NULL`)
    );
    const active = all.filter(c => c.status === "active");
    const lost = all.filter(c => c.status === "inactive");
    const newCustomers = all.filter(c => new Date(c.createdAt) > thirtyDaysAgo).length;
    const retentionRate = all.length > 0 ? Math.round((active.length / all.length) * 100) : 0;
    const avgTenure = active.length > 0
      ? active.reduce((s, c) => s + (now.getTime() - new Date(c.startDate).getTime()) / (30 * 24 * 60 * 60 * 1000), 0) / active.length
      : 0;
    res.json({ activeCustomers: active.length, lostCustomers: lost.length, newCustomers, retentionRate, averageTenureMonths: Math.round(avgTenure) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /analytics/owner/churn
router.get("/analytics/owner/churn", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const now = new Date();
    const customers = await db.select().from(customersTable).where(
      and(eq(customersTable.ownerId, ownerId), eq(customersTable.status, "active"), sql`${customersTable.deletedAt} IS NULL`)
    );
    const results = [];
    for (const cust of customers) {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentAtt = await db.select().from(attendanceTable).where(
        and(eq(attendanceTable.customerId, cust.id), sql`${attendanceTable.date} >= ${sevenDaysAgo.toISOString().split("T")[0]}`)
      );
      const lastAtt = recentAtt.sort((a, b) => b.date.localeCompare(a.date))[0];
      const hasRecentAtt = recentAtt.length > 0;
      const outstanding = Number(cust.totalBilled) - Number(cust.totalPaid);
      const reasons = [];
      if (!hasRecentAtt) reasons.push("No attendance in last 7 days");
      if (outstanding > 500) reasons.push(`Outstanding payment of ₹${outstanding.toFixed(0)}`);
      const riskScore = (!hasRecentAtt ? 40 : 0) + (outstanding > 1000 ? 40 : outstanding > 500 ? 20 : 0);
      if (riskScore > 20) {
        results.push({
          customerId: cust.id, customerName: cust.name, riskScore,
          riskLevel: riskScore >= 60 ? "high" : riskScore >= 30 ? "medium" : "low",
          reasons, lastAttendanceDate: lastAtt?.date ?? null,
        });
      }
    }
    res.json(results.sort((a, b) => b.riskScore - a.riskScore));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /analytics/owner/overview
router.get("/analytics/owner/overview", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const customers = await db.select().from(customersTable).where(
      and(eq(customersTable.ownerId, ownerId), sql`${customersTable.deletedAt} IS NULL`)
    );
    const custIds = customers.map(c => c.id);
    const active = customers.filter(c => c.status === "active");
    const retentionRate = customers.length > 0 ? Math.round((active.length / customers.length) * 100) : 0;
    let collectionEfficiency = 0, revenueGrowth = 0, avgAttendanceRate = 0;
    if (custIds.length > 0) {
      const bills = await db.select().from(billsTable).where(
        and(sql`${billsTable.customerId} = ANY(ARRAY[${sql.join(custIds.map(id => sql`${id}`), sql`, `)}]::int[])`, eq(billsTable.month, month), eq(billsTable.year, year), sql`${billsTable.deletedAt} IS NULL`)
      );
      const totalBilled = bills.reduce((s, b) => s + Number(b.totalAmount), 0);
      const totalPaid = bills.reduce((s, b) => s + Number(b.paidAmount), 0);
      collectionEfficiency = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;
      const att = await db.select().from(attendanceTable).where(
        sql`${attendanceTable.customerId} = ANY(ARRAY[${sql.join(custIds.map(id => sql`${id}`), sql`, `)}]::int[])`
      );
      avgAttendanceRate = att.length > 0
        ? Math.round((att.filter(a => a.morningPresent || a.eveningPresent).length / att.length) * 100)
        : 0;
    }
    res.json({ revenueGrowth, retentionRate, churnRisk: 100 - retentionRate, collectionEfficiency, avgAttendanceRate });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
