import { db } from "@workspace/db";
import { customersTable, billsTable, reminderLogsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const TWILIO_SID = process.env["TWILIO_ACCOUNT_SID"];
const TWILIO_TOKEN = process.env["TWILIO_AUTH_TOKEN"];
const TWILIO_FROM = process.env["TWILIO_FROM_NUMBER"];
const TWILIO_CHANNEL = (process.env["TWILIO_CHANNEL"] ?? "sms") as "sms" | "whatsapp";

export const isTwilioConfigured = Boolean(TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM);

function formatTo(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  const e164 = digits.startsWith("91") ? `+${digits}` : digits.startsWith("+") ? digits : `+91${digits}`;
  return TWILIO_CHANNEL === "whatsapp" ? `whatsapp:${e164}` : e164;
}

function formatFrom(): string {
  const from = TWILIO_FROM!;
  return TWILIO_CHANNEL === "whatsapp" ? `whatsapp:${from}` : from;
}

export async function sendReminderMessage(mobile: string, message: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
  if (!isTwilioConfigured) {
    console.log(`[Reminder MOCK] To: ${mobile} | Message: ${message}`);
    return { ok: true, sid: "mock-" + Date.now() };
  }
  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(TWILIO_SID, TWILIO_TOKEN);
    const msg = await client.messages.create({ to: formatTo(mobile), from: formatFrom(), body: message });
    return { ok: true, sid: msg.sid };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export interface PendingReminder {
  customerId: number;
  customerName: string;
  mobile: string;
  billId: number;
  month: number;
  year: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  daysSinceDue: number | null;
}

export async function getPendingReminders(ownerId: number): Promise<PendingReminder[]> {
  const customers = await db.select().from(customersTable).where(
    and(eq(customersTable.ownerId, ownerId), eq(customersTable.status, "active"), sql`${customersTable.deletedAt} IS NULL`, sql`${customersTable.mobile} IS NOT NULL`)
  );
  const custIds = customers.map(c => c.id);
  if (custIds.length === 0) return [];

  const bills = await db.select().from(billsTable).where(
    and(
      sql`${billsTable.customerId} = ANY(ARRAY[${sql.join(custIds.map(id => sql`${id}`), sql`, `)}]::int[])`,
      sql`${billsTable.status} IN ('unpaid','partial')`,
      sql`${billsTable.deletedAt} IS NULL`
    )
  );

  const custMap = Object.fromEntries(customers.map(c => [c.id, c]));
  const today = new Date();

  return bills.map(b => {
    const cust = custMap[b.customerId];
    const outstanding = Number(b.totalAmount) - Number(b.paidAmount);
    let daysSinceDue: number | null = null;
    if (b.dueDate) {
      const due = new Date(b.dueDate);
      daysSinceDue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    }
    return {
      customerId: cust.id,
      customerName: cust.name,
      mobile: cust.mobile!,
      billId: b.id,
      month: b.month,
      year: b.year,
      totalAmount: Number(b.totalAmount),
      paidAmount: Number(b.paidAmount),
      outstandingAmount: outstanding,
      daysSinceDue,
    };
  }).filter(r => r.outstandingAmount > 0);
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function buildReminderMessage(customerName: string, month: number, year: number, outstanding: number): string {
  return `Dear ${customerName}, your tiffin bill for ${MONTH_NAMES[month - 1]} ${year} has an outstanding amount of ₹${outstanding.toFixed(0)}. Please arrange payment at the earliest. Thank you!`;
}

export async function sendReminderForBill(
  ownerId: number,
  billId: number
): Promise<{ ok: boolean; customerName: string; mobile: string; channel: string; error?: string; mock?: boolean }> {
  const [bill] = await db.select().from(billsTable).where(eq(billsTable.id, billId));
  if (!bill) throw new Error("Bill not found");

  const [cust] = await db.select().from(customersTable).where(
    and(eq(customersTable.id, bill.customerId), eq(customersTable.ownerId, ownerId))
  );
  if (!cust) throw new Error("Customer not found or unauthorized");
  if (!cust.mobile) throw new Error("Customer has no mobile number on record");

  const outstanding = Number(bill.totalAmount) - Number(bill.paidAmount);
  if (outstanding <= 0) throw new Error("Bill is already fully paid");

  const message = buildReminderMessage(cust.name, bill.month, bill.year, outstanding);
  const result = await sendReminderMessage(cust.mobile, message);

  await db.insert(reminderLogsTable).values({
    customerId: cust.id,
    billId: bill.id,
    mobile: cust.mobile,
    channel: TWILIO_CHANNEL,
    status: result.ok ? "sent" : "failed",
    message,
    errorMessage: result.error ?? null,
  });

  return {
    ok: result.ok,
    customerName: cust.name,
    mobile: cust.mobile,
    channel: TWILIO_CHANNEL,
    error: result.error,
    mock: !isTwilioConfigured,
  };
}

export async function sendAllPendingReminders(ownerId: number) {
  const pending = await getPendingReminders(ownerId);
  const results = await Promise.allSettled(
    pending.map(p => sendReminderForBill(ownerId, p.billId))
  );
  return pending.map((p, i) => {
    const r = results[i];
    return { customerId: p.customerId, customerName: p.customerName, billId: p.billId, ok: r.status === "fulfilled" && (r as any).value.ok };
  });
}
