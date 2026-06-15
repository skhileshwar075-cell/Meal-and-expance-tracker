import { Router } from "express";
import { db } from "@workspace/db";
import { paymentsTable, billsTable, customersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

// GET /payments/collection-summary
router.get("/payments/collection-summary", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();
    const customers = await db.select({ id: customersTable.id }).from(customersTable).where(
      and(eq(customersTable.ownerId, ownerId), sql`${customersTable.deletedAt} IS NULL`)
    );
    const custIds = customers.map(c => c.id);
    if (custIds.length === 0) {
      res.json({ totalBilled: 0, totalCollected: 0, paidCount: 0, unpaidCount: 0, partialCount: 0, collectionRate: 0, outstandingAmount: 0 });
      return;
    }
    const bills = await db.select().from(billsTable).where(
      and(
        sql`${billsTable.customerId} = ANY(ARRAY[${sql.join(custIds.map(id => sql`${id}`), sql`, `)}]::int[])`,
        eq(billsTable.month, month), eq(billsTable.year, year), sql`${billsTable.deletedAt} IS NULL`
      )
    );
    const totalBilled = bills.reduce((s, b) => s + Number(b.totalAmount), 0);
    const totalCollected = bills.reduce((s, b) => s + Number(b.paidAmount), 0);
    res.json({
      totalBilled, totalCollected,
      paidCount: bills.filter(b => b.status === "paid").length,
      unpaidCount: bills.filter(b => b.status === "unpaid").length,
      partialCount: bills.filter(b => b.status === "partial").length,
      collectionRate: totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0,
      outstandingAmount: totalBilled - totalCollected,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /payments
router.get("/payments", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const { customerId, status } = req.query;
    const customers = await db.select().from(customersTable).where(
      and(eq(customersTable.ownerId, ownerId), sql`${customersTable.deletedAt} IS NULL`)
    );
    const custIds = customers.map(c => c.id);
    if (custIds.length === 0) { res.json([]); return; }
    const custMap = Object.fromEntries(customers.map(c => [c.id, c.name]));
    const conditions = [sql`${paymentsTable.customerId} = ANY(ARRAY[${sql.join(custIds.map(id => sql`${id}`), sql`, `)}]::int[])`];
    if (customerId) conditions.push(eq(paymentsTable.customerId, Number(customerId)));
    if (status && status !== "all") conditions.push(eq(paymentsTable.status, String(status)));
    const rows = await db.select().from(paymentsTable).where(and(...conditions));
    res.json(rows.map(p => ({ ...p, customerName: custMap[p.customerId] ?? "", amount: Number(p.amount) })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /payments
router.post("/payments", requireAuth, requireRole("owner"), async (req, res) => {
  const { billId, amount, status, paymentDate, notes, method } = req.body;
  if (!billId || amount == null || !status) {
    res.status(400).json({ error: "billId, amount, and status are required" });
    return;
  }
  try {
    const [bill] = await db.select().from(billsTable).where(eq(billsTable.id, billId));
    if (!bill) { res.status(404).json({ error: "Bill not found" }); return; }

    const remaining = Number(bill.totalAmount) - Number(bill.paidAmount);
    const safeAmount = Math.min(Number(amount), remaining);
    if (safeAmount <= 0) {
      res.status(400).json({ error: "This bill is already fully paid." });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const effectiveDate = paymentDate || today;

    // Run all DB changes atomically
    const [row] = await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(paymentsTable).values({
        customerId: bill.customerId, billId, amount: String(safeAmount),
        status, method: method ?? null,
        paymentDate: effectiveDate, notes: notes ?? null,
      }).returning();

      const newPaid = Number(bill.paidAmount) + safeAmount;
      const newStatus = newPaid >= Number(bill.totalAmount) ? "paid" : newPaid > 0 ? "partial" : "unpaid";
      await tx.update(billsTable).set({ paidAmount: String(newPaid), status: newStatus, updatedAt: new Date() }).where(eq(billsTable.id, billId));
      await tx.execute(sql`UPDATE customers SET total_paid = total_paid + ${safeAmount} WHERE id = ${bill.customerId}`);
      return [inserted];
    });

    const [cust] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, bill.customerId));
    res.status(201).json({ ...row, customerName: cust?.name ?? "", amount: Number(row.amount) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /payments/reconcile — recalculate customer totals from actual bill/payment data
router.post("/payments/reconcile", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const customers = await db.select().from(customersTable).where(
      and(eq(customersTable.ownerId, ownerId), sql`${customersTable.deletedAt} IS NULL`)
    );
    const corrections = [];

    for (const cust of customers) {
      const bills = await db.select({ totalAmount: billsTable.totalAmount, paidAmount: billsTable.paidAmount })
        .from(billsTable).where(and(eq(billsTable.customerId, cust.id), sql`${billsTable.deletedAt} IS NULL`));

      const calcBilled = bills.reduce((s, b) => s + Number(b.totalAmount), 0);
      const calcPaid = bills.reduce((s, b) => s + Number(b.paidAmount), 0);
      const curBilled = Number(cust.totalBilled);
      const curPaid = Number(cust.totalPaid);

      if (Math.abs(calcBilled - curBilled) > 0.01 || Math.abs(calcPaid - curPaid) > 0.01) {
        await db.execute(sql`UPDATE customers SET total_billed = ${calcBilled}, total_paid = ${calcPaid}, updated_at = NOW() WHERE id = ${cust.id}`);
        corrections.push({ customerId: cust.id, name: cust.name, before: { totalBilled: curBilled, totalPaid: curPaid }, after: { totalBilled: calcBilled, totalPaid: calcPaid } });
      }
    }

    res.json({ fixed: corrections.length, corrections });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
