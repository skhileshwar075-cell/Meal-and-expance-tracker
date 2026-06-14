import { pgTable, serial, integer, boolean, date, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";

export const mealRecordsTable = pgTable("meal_records", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  morningMeal: boolean("morning_meal").notNull().default(false),
  eveningMeal: boolean("evening_meal").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMealRecordSchema = createInsertSchema(mealRecordsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMealRecord = z.infer<typeof insertMealRecordSchema>;
export type MealRecord = typeof mealRecordsTable.$inferSelect;
