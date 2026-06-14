import { pgTable, serial, integer, varchar, text, date, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ownersTable } from "./owners";

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => ownersTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  mobile: varchar("mobile", { length: 20 }),
  address: text("address"),
  planId: integer("plan_id"),
  startDate: date("start_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  linkedStudentId: integer("linked_student_id"),
  totalBilled: numeric("total_billed", { precision: 12, scale: 2 }).notNull().default("0"),
  totalPaid: numeric("total_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({
  id: true,
  linkedStudentId: true,
  totalBilled: true,
  totalPaid: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
