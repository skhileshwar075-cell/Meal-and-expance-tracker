import { pgTable, serial, integer, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const analyticsSnapshotsTable = pgTable("analytics_snapshots", {
  id: serial("id").primaryKey(),
  entityId: integer("entity_id").notNull(),
  entityType: varchar("entity_type", { length: 20 }).notNull(),
  snapshotType: varchar("snapshot_type", { length: 50 }).notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSnapshotSchema = createInsertSchema(analyticsSnapshotsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertSnapshot = z.infer<typeof insertSnapshotSchema>;
export type AnalyticsSnapshot = typeof analyticsSnapshotsTable.$inferSelect;
