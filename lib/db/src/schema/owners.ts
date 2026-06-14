import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const ownersTable = pgTable("owners", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  businessName: varchar("business_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  serviceCode: varchar("service_code", { length: 20 }).unique(),
  serviceCodeExpiresAt: timestamp("service_code_expires_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOwnerSchema = createInsertSchema(ownersTable).omit({
  id: true,
  serviceCode: true,
  serviceCodeExpiresAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOwner = z.infer<typeof insertOwnerSchema>;
export type Owner = typeof ownersTable.$inferSelect;
