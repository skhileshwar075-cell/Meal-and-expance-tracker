import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable, studentsTable, ownersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, generateTokens, type AuthPayload } from "../middlewares/auth";

const router = Router();
const JWT_SECRET = process.env.SESSION_SECRET || "fallback-secret-change-in-prod";

// POST /auth/register
router.post("/auth/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: "name, email, password, and role are required" });
    return;
  }
  if (!["student", "owner"].includes(role)) {
    res.status(400).json({ error: "role must be student or owner" });
    return;
  }
  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(usersTable).values({ name, email, passwordHash, role }).returning();

    if (role === "student") {
      await db.insert(studentsTable).values({ userId: user.id });
    } else {
      await db.insert(ownersTable).values({ userId: user.id, businessName: `${name}'s Tiffin Service` });
    }

    const payload: AuthPayload = { userId: user.id, role: user.role };
    if (role === "student") {
      const [s] = await db.select().from(studentsTable).where(eq(studentsTable.userId, user.id));
      payload.studentId = s.id;
    } else {
      const [o] = await db.select().from(ownersTable).where(eq(ownersTable.userId, user.id));
      payload.ownerId = o.id;
    }
    const { accessToken, refreshToken } = generateTokens(payload);
    await db.update(usersTable).set({ refreshToken }).where(eq(usersTable.id, user.id));

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/login
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const payload: AuthPayload = { userId: user.id, role: user.role };
    if (user.role === "student") {
      const [s] = await db.select().from(studentsTable).where(eq(studentsTable.userId, user.id));
      if (s) payload.studentId = s.id;
    } else {
      const [o] = await db.select().from(ownersTable).where(eq(ownersTable.userId, user.id));
      if (o) payload.ownerId = o.id;
    }
    const { accessToken, refreshToken } = generateTokens(payload);
    await db.update(usersTable).set({ refreshToken }).where(eq(usersTable.id, user.id));
    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/refresh
router.post("/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: "refreshToken is required" });
    return;
  }
  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET) as AuthPayload;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));
    if (!user || user.refreshToken !== refreshToken) {
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }
    const { accessToken, refreshToken: newRefresh } = generateTokens({
      userId: user.id,
      role: user.role,
      studentId: payload.studentId,
      ownerId: payload.ownerId,
    });
    await db.update(usersTable).set({ refreshToken: newRefresh }).where(eq(usersTable.id, user.id));
    res.json({
      accessToken,
      refreshToken: newRefresh,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

// POST /auth/logout
router.post("/auth/logout", requireAuth, async (req, res) => {
  try {
    await db.update(usersTable).set({ refreshToken: null }).where(eq(usersTable.id, req.user!.userId));
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/me
router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
