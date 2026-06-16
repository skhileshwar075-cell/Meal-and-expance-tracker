import { Router } from "express";
import { db } from "@workspace/db";
import { serviceConnectionsTable, ownersTable, studentsTable, customersTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

// POST /connections/join
router.post("/connections/join", requireAuth, requireRole("student"), async (req, res) => {
  const { serviceCode } = req.body;
  if (!serviceCode) { res.status(400).json({ error: "serviceCode is required" }); return; }
  try {
    const studentId = req.user!.studentId!;
    // Find owner by service code
    const [owner] = await db.select().from(ownersTable).where(eq(ownersTable.serviceCode, serviceCode.toUpperCase()));
    if (!owner) { res.status(404).json({ error: "Invalid service code" }); return; }
    if (owner.serviceCodeExpiresAt && new Date(owner.serviceCodeExpiresAt) < new Date()) {
      res.status(400).json({ error: "Service code has expired" });
      return;
    }
    // Check existing connection
    const [existing] = await db.select().from(serviceConnectionsTable).where(
      and(eq(serviceConnectionsTable.studentId, studentId), eq(serviceConnectionsTable.ownerId, owner.id), eq(serviceConnectionsTable.status, "active"))
    );
    if (existing) { res.status(409).json({ error: "Already connected to this service" }); return; }
    const [conn] = await db.insert(serviceConnectionsTable).values({
      studentId, ownerId: owner.id, status: "active",
    }).returning();
    res.json({ id: conn.id, studentId: conn.studentId, ownerId: conn.ownerId, businessName: owner.businessName, status: conn.status, joinedAt: conn.joinedAt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /connections/my
router.get("/connections/my", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const studentId = req.user!.studentId!;
    const [conn] = await db.select().from(serviceConnectionsTable).where(
      and(eq(serviceConnectionsTable.studentId, studentId), eq(serviceConnectionsTable.status, "active"))
    );
    if (!conn) { res.status(404).json({ error: "No active connection" }); return; }
    const [owner] = await db.select().from(ownersTable).where(eq(ownersTable.id, conn.ownerId));
    res.json({ id: conn.id, studentId: conn.studentId, ownerId: conn.ownerId, businessName: owner?.businessName ?? "", status: conn.status, joinedAt: conn.joinedAt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /connections/leave
router.delete("/connections/leave", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const studentId = req.user!.studentId!;
    await db.update(serviceConnectionsTable).set({ status: "inactive", leftAt: new Date() }).where(
      and(eq(serviceConnectionsTable.studentId, studentId), eq(serviceConnectionsTable.status, "active"))
    );
    res.json({ message: "Left service successfully" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /connections/students
router.get("/connections/students", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user!.ownerId!;
    const conns = await db.select().from(serviceConnectionsTable).where(eq(serviceConnectionsTable.ownerId, ownerId));
    const results = [];
    for (const conn of conns) {
      const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, conn.studentId));
      if (!student) continue;
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, student.userId));
      const [cust] = await db.select().from(customersTable).where(
        and(eq(customersTable.ownerId, ownerId), eq(customersTable.linkedStudentId, conn.studentId))
      );
      results.push({
        connectionId: conn.id, studentId: conn.studentId,
        studentName: user?.name ?? "", email: user?.email ?? "",
        joinedAt: conn.joinedAt, status: conn.status,
        customerId: cust?.id ?? null,
      });
    }
    res.json(results);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
