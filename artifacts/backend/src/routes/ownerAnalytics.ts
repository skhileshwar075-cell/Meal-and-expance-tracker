import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, billsTable, paymentsTable, attendanceTable, mealPlansTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

function lastDayOf(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function monthRange(year: number, month: number) {
  const m = String(month).padStart(2, "0");
  const last = String(lastDayOf(year, month)).padStart(2, "0");
  return { start: `${year}-${m}-01`, end: `${year}-${m}-${last}` };
}

function custIdsFilter(ids: number[]) {
  return sql`${sql.identifier("customer_id")} = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}`), sql`, `)}]::int[])`;
}

// GET /analytics/owner/revenue  — accepts ?months=6&endMonth=&endYear=
router.get("/analytics/owner/revenue", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const months = Number(req.query.months) || 6;
    const now = new Date();
    const endMonth = Number(req.query.endMonth) || (now.getMonth() + 1);
    const endYear = Number(req.query.endYear) || now.getFullYear();

    const customers = await db.select({ id: customersTable.id }).from(customersTable).where(
      and(eq(customersTable.ownerId, ownerId), sql`${customersTable.deletedAt} IS NULL`)
    );
    const custIds = customers.map(c => c.id);

    const data = [];
    let prevTotal = 0;
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(endYear, endMonth - 1 - i, 1);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      let total = 0;
      if (custIds.length > 0) {
        const bills = await db.select({ paidAmount: billsTable.paidAmount }).from(billsTable).where(
          and(
            sql`${billsTable.customerId} = ANY(ARRAY[${sql.join(custIds.map(id => sql`${id}`), sql`, `)}]::int[])`,
            eq(billsTable.month, month), eq(billsTable.year, year),
            sql`${billsTable.deletedAt} IS NULL`
          )
        );
        total = bills.reduce((s, b) => s + Number(b.paidAmount), 0);
      }
      data.push({ label: `${d.toLocaleString("default", { month: "short" })} ${year}`, amount: total });
      if (i === 1) prevTotal = total;
    }
    const lastAmount = data[data.length - 1]?.amount || 0;
    const growth = prevTotal > 0 ? Math.round(((lastAmount - prevTotal) / prevTotal) * 100) : 0;
    res.json({ period: "monthly", data, totalRevenue: data.reduce((s, d) => s + d.amount, 0), growth });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /analytics/owner/retention  — accepts ?month=&year=
router.get("/analytics/owner/retention", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const now = new Date();
    const month = Number(req.query.month) || (now.getMonth() + 1);
    const year = Number(req.query.year) || now.getFullYear();
    const { start, end } = monthRange(year, month);

    const all = await db.select().from(customersTable).where(
      and(eq(customersTable.ownerId, ownerId), sql`${customersTable.deletedAt} IS NULL`)
    );
    // Active = had attendance in the selected month OR joined before/during the month and not yet inactive
    const periodStart = new Date(start);
    const active = all.filter(c => c.status === "active" || new Date(c.startDate) <= new Date(end));
    const newCustomers = all.filter(c => new Date(c.startDate) >= periodStart && new Date(c.startDate) <= new Date(end)).length;
    const lost = all.filter(c => c.status === "inactive");
    const retentionRate = all.length > 0 ? Math.round(((all.length - lost.length) / all.length) * 100) : 0;
    const activeNow = all.filter(c => c.status === "active");
    const avgTenure = activeNow.length > 0
      ? activeNow.reduce((s, c) => s + (now.getTime() - new Date(c.startDate).getTime()) / (30 * 24 * 60 * 60 * 1000), 0) / activeNow.length
      : 0;
    res.json({
      activeCustomers: activeNow.length, lostCustomers: lost.length, newCustomers,
      retentionRate, averageTenureMonths: Math.round(avgTenure),
    });
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
      const outstanding = Number(cust.totalBilled) - Number(cust.totalPaid);
      const reasons = [];
      if (!recentAtt.length) reasons.push("No attendance in last 7 days");
      if (outstanding > 500) reasons.push(`Outstanding payment of ₹${outstanding.toFixed(0)}`);
      const riskScore = (!recentAtt.length ? 40 : 0) + (outstanding > 1000 ? 40 : outstanding > 500 ? 20 : 0);
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

// GET /analytics/owner/overview  — accepts ?month=&year=
router.get("/analytics/owner/overview", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const now = new Date();
    const month = Number(req.query.month) || (now.getMonth() + 1);
    const year = Number(req.query.year) || now.getFullYear();

    const customers = await db.select().from(customersTable).where(
      and(eq(customersTable.ownerId, ownerId), sql`${customersTable.deletedAt} IS NULL`)
    );
    const custIds = customers.map(c => c.id);
    const active = customers.filter(c => c.status === "active");
    const retentionRate = customers.length > 0 ? Math.round((active.length / customers.length) * 100) : 0;

    let collectionEfficiency = 0, avgAttendanceRate = 0;
    if (custIds.length > 0) {
      const bills = await db.select().from(billsTable).where(
        and(
          sql`${billsTable.customerId} = ANY(ARRAY[${sql.join(custIds.map(id => sql`${id}`), sql`, `)}]::int[])`,
          eq(billsTable.month, month), eq(billsTable.year, year),
          sql`${billsTable.deletedAt} IS NULL`
        )
      );
      const totalBilled = bills.reduce((s, b) => s + Number(b.totalAmount), 0);
      const totalPaid = bills.reduce((s, b) => s + Number(b.paidAmount), 0);
      collectionEfficiency = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

      const { start, end } = monthRange(year, month);
      const att = await db.select().from(attendanceTable).where(
        and(
          sql`${attendanceTable.customerId} = ANY(ARRAY[${sql.join(custIds.map(id => sql`${id}`), sql`, `)}]::int[])`,
          sql`${attendanceTable.date} >= ${start} AND ${attendanceTable.date} <= ${end}`
        )
      );
      avgAttendanceRate = att.length > 0
        ? Math.round((att.filter(a => a.morningPresent || a.eveningPresent).length / att.length) * 100)
        : 0;
    }
    res.json({ revenueGrowth: 0, retentionRate, churnRisk: 100 - retentionRate, collectionEfficiency, avgAttendanceRate });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /analytics/owner/top-customers  — accepts ?month=&year=
router.get("/analytics/owner/top-customers", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const now = new Date();
    const month = Number(req.query.month) || (now.getMonth() + 1);
    const year = Number(req.query.year) || now.getFullYear();

    const customers = await db.select().from(customersTable).where(
      and(eq(customersTable.ownerId, ownerId), sql`${customersTable.deletedAt} IS NULL`, eq(customersTable.status, "active"))
    );
    const custIds = customers.map(c => c.id);
    if (custIds.length === 0) { res.json([]); return; }

    const bills = await db.select().from(billsTable).where(
      and(
        sql`${billsTable.customerId} = ANY(ARRAY[${sql.join(custIds.map(id => sql`${id}`), sql`, `)}]::int[])`,
        eq(billsTable.month, month), eq(billsTable.year, year),
        sql`${billsTable.deletedAt} IS NULL`
      )
    );
    const billByCustomer = Object.fromEntries(bills.map(b => [b.customerId, b]));

    const { start, end } = monthRange(year, month);
    const att = await db.select().from(attendanceTable).where(
      and(
        sql`${attendanceTable.customerId} = ANY(ARRAY[${sql.join(custIds.map(id => sql`${id}`), sql`, `)}]::int[])`,
        sql`${attendanceTable.date} >= ${start} AND ${attendanceTable.date} <= ${end}`
      )
    );
    const attByCustomer: Record<number, typeof att> = {};
    att.forEach(a => { if (!attByCustomer[a.customerId]) attByCustomer[a.customerId] = []; attByCustomer[a.customerId].push(a); });

    const results = customers.map(c => {
      const bill = billByCustomer[c.id];
      const custAtt = attByCustomer[c.id] ?? [];
      const attRate = custAtt.length > 0
        ? Math.round((custAtt.filter(a => a.morningPresent || a.eveningPresent).length / custAtt.length) * 100)
        : 0;
      const loyaltyMonths = Math.max(1, Math.round((now.getTime() - new Date(c.startDate).getTime()) / (30 * 24 * 60 * 60 * 1000)));
      return {
        id: c.id, name: c.name, rank: 0,
        totalPaid: bill ? Number(bill.paidAmount) : 0,
        outstandingAmount: bill ? Number(bill.totalAmount) - Number(bill.paidAmount) : 0,
        attendanceRate: attRate, loyaltyMonths,
      };
    }).sort((a, b) => b.totalPaid - a.totalPaid).map((c, i) => ({ ...c, rank: i + 1 }));

    res.json(results.slice(0, 10));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
