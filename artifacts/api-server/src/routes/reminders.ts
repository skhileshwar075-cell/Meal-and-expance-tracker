import { Router } from "express";
import { db } from "@workspace/db";
import { reminderLogsTable, customersTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
  getPendingReminders,
  sendReminderForBill,
  sendAllPendingReminders,
  isTwilioConfigured,
} from "../services/reminder";

const router = Router();

// GET /reminders/config — tells frontend whether Twilio is configured
router.get("/reminders/config", requireAuth, requireRole("owner"), (_req, res) => {
  res.json({ configured: isTwilioConfigured, mock: !isTwilioConfigured });
});

// GET /reminders/pending — all unpaid bills eligible for reminders
router.get("/reminders/pending", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const pending = await getPendingReminders(ownerId);
    res.json(pending);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /reminders/send/:billId — send reminder for one specific bill
router.post("/reminders/send/:billId", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const result = await sendReminderForBill(ownerId, Number(req.params.billId));
    res.json(result);
  } catch (err: any) {
    req.log.error(err);
    res.status(400).json({ error: err.message ?? "Failed to send reminder" });
  }
});

// POST /reminders/send-all — send reminders for all pending bills
router.post("/reminders/send-all", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const results = await sendAllPendingReminders(ownerId);
    const sent = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;
    res.json({ sent, failed, results });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /reminders/logs — sent reminder history
router.get("/reminders/logs", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const customers = await db.select({ id: customersTable.id }).from(customersTable).where(
      and(eq(customersTable.ownerId, ownerId), sql`${customersTable.deletedAt} IS NULL`)
    );
    const custIds = customers.map(c => c.id);
    if (custIds.length === 0) { res.json([]); return; }

    const logs = await db.select().from(reminderLogsTable).where(
      sql`${reminderLogsTable.customerId} = ANY(ARRAY[${sql.join(custIds.map(id => sql`${id}`), sql`, `)}]::int[])`
    ).orderBy(desc(reminderLogsTable.sentAt)).limit(100);

    // Attach customer names
    const custAll = await db.select({ id: customersTable.id, name: customersTable.name }).from(customersTable).where(
      and(eq(customersTable.ownerId, ownerId), sql`${customersTable.deletedAt} IS NULL`)
    );
    const nameMap = Object.fromEntries(custAll.map(c => [c.id, c.name]));
    res.json(logs.map(l => ({ ...l, customerName: nameMap[l.customerId] ?? "" })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
