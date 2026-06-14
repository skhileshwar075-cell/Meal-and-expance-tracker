import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /notifications
router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { unreadOnly } = req.query;
    const conditions = [eq(notificationsTable.userId, userId)];
    if (unreadOnly === "true") conditions.push(eq(notificationsTable.isRead, false));
    const rows = await db.select().from(notificationsTable).where(and(...conditions));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /notifications/:id/read
router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const [row] = await db.update(notificationsTable).set({ isRead: true }).where(
      and(eq(notificationsTable.id, Number(req.params.id)), eq(notificationsTable.userId, req.user!.userId))
    ).returning();
    if (!row) { res.status(404).json({ error: "Notification not found" }); return; }
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /notifications/read-all
router.patch("/notifications/read-all", requireAuth, async (req, res) => {
  try {
    await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, req.user!.userId));
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
