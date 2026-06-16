import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, ownersTable, customersTable, billsTable, paymentsTable, attendanceTable } from "@workspace/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// GET /owners/profile
router.get("/owners/profile", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
    const [owner] = await db.select().from(ownersTable).where(eq(ownersTable.userId, req.user!.userId));
    if (!owner) { res.status(404).json({ error: "Owner profile not found" }); return; }
    res.json({
      id: owner.id, userId: owner.userId, businessName: owner.businessName,
      ownerName: user.name, email: user.email, phone: owner.phone,
      address: owner.address, serviceCode: owner.serviceCode, createdAt: owner.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /owners/profile
router.put("/owners/profile", requireAuth, requireRole("owner"), async (req, res) => {
  const { businessName, ownerName, phone, address } = req.body;
  try {
    if (ownerName) await db.update(usersTable).set({ name: ownerName, updatedAt: new Date() }).where(eq(usersTable.id, req.user!.userId));
    await db.update(ownersTable).set({
      businessName: businessName ?? undefined,
      phone: phone ?? undefined,
      address: address ?? undefined,
      updatedAt: new Date(),
    }).where(eq(ownersTable.userId, req.user!.userId));
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
    const [owner] = await db.select().from(ownersTable).where(eq(ownersTable.userId, req.user!.userId));
    res.json({
      id: owner.id, userId: owner.userId, businessName: owner.businessName,
      ownerName: user.name, email: user.email, phone: owner.phone,
      address: owner.address, serviceCode: owner.serviceCode, createdAt: owner.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /owners/dashboard
router.get("/owners/dashboard", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const m = String(month).padStart(2, "0");
    const dateStr = now.toISOString().split("T")[0];

    const customers = await db.select().from(customersTable).where(
      and(eq(customersTable.ownerId, ownerId), sql`${customersTable.deletedAt} IS NULL`)
    );
    const activeCustomers = customers.filter(c => c.status === "active").length;

    // Today's meals from attendance
    const todayAtt = await db.select().from(attendanceTable).where(
      and(
        sql`${attendanceTable.customerId} IN (SELECT id FROM customers WHERE owner_id = ${ownerId} AND deleted_at IS NULL)`,
        eq(attendanceTable.date, dateStr)
      )
    );
    const todaysMeals = todayAtt.reduce((s, a) => s + (a.morningPresent ? 1 : 0) + (a.eveningPresent ? 1 : 0), 0);

    // Monthly revenue (paid bills)
    const bills = await db.select().from(billsTable).where(
      and(
        sql`${billsTable.customerId} IN (SELECT id FROM customers WHERE owner_id = ${ownerId} AND deleted_at IS NULL)`,
        eq(billsTable.month, month), eq(billsTable.year, year), sql`${billsTable.deletedAt} IS NULL`
      )
    );
    const monthlyRevenue = bills.filter(b => b.status === "paid" || b.status === "partial").reduce((s, b) => s + Number(b.paidAmount), 0);
    const pendingPayments = bills.filter(b => b.status !== "paid").reduce((s, b) => s + Number(b.totalAmount) - Number(b.paidAmount), 0);
    const totalBilled = bills.reduce((s, b) => s + Number(b.totalAmount), 0);
    const totalCollected = bills.reduce((s, b) => s + Number(b.paidAmount), 0);
    const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

    const recentPayments = await db.select().from(paymentsTable).where(
      sql`${paymentsTable.customerId} IN (SELECT id FROM customers WHERE owner_id = ${ownerId} AND deleted_at IS NULL)`
    ).orderBy(desc(paymentsTable.createdAt)).limit(5);

    const alerts = [];
    if (pendingPayments > 0) {
      alerts.push({ id: "pending", type: "payment_overdue", message: `₹${pendingPayments.toFixed(0)} in outstanding payments this month.`, severity: "warning", category: null });
    }

    res.json({
      activeCustomers, todaysMeals, monthlyRevenue, pendingPayments, collectionRate,
      recentPayments: recentPayments.map(p => ({
        id: p.id, customerId: p.customerId, customerName: "", billId: p.billId,
        amount: Number(p.amount), status: p.status, paymentDate: p.paymentDate,
        notes: p.notes, createdAt: p.createdAt,
      })),
      alerts,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /owners/service-code
router.post("/owners/service-code", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.update(ownersTable).set({ serviceCode: code, serviceCodeExpiresAt: expiresAt, updatedAt: new Date() }).where(eq(ownersTable.userId, req.user!.userId));
    res.json({ code, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
