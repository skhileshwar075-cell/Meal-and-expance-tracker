import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { customersTable } from "./customers";
import { billsTable } from "./bills";

export const reminderLogsTable = pgTable("reminder_logs", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  billId: integer("bill_id").references(() => billsTable.id, { onDelete: "set null" }),
  mobile: varchar("mobile", { length: 20 }).notNull(),
  channel: varchar("channel", { length: 20 }).notNull().default("sms"),
  status: varchar("status", { length: 20 }).notNull().default("sent"),
  message: text("message"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export type ReminderLog = typeof reminderLogsTable.$inferSelect;
