import { pgTable, serial, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { ownersTable } from "./owners";

export const serviceConnectionsTable = pgTable("service_connections", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id").notNull().references(() => ownersTable.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  leftAt: timestamp("left_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertServiceConnectionSchema = createInsertSchema(serviceConnectionsTable).omit({
  id: true,
  joinedAt: true,
  leftAt: true,
  createdAt: true,
});

export type InsertServiceConnection = z.infer<typeof insertServiceConnectionSchema>;
export type ServiceConnection = typeof serviceConnectionsTable.$inferSelect;
