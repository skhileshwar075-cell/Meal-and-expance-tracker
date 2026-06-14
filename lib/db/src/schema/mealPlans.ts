import { pgTable, serial, integer, varchar, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ownersTable } from "./owners";

export const mealPlansTable = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => ownersTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  planType: varchar("plan_type", { length: 30 }).notNull(),
  pricePerMonth: numeric("price_per_month", { precision: 10, scale: 2 }).notNull(),
  pricePerMeal: numeric("price_per_meal", { precision: 10, scale: 2 }),
  billingType: varchar("billing_type", { length: 20 }).notNull().default("monthly"),
  isActive: boolean("is_active").notNull().default(true),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMealPlanSchema = createInsertSchema(mealPlansTable).omit({
  id: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = typeof mealPlansTable.$inferSelect;
