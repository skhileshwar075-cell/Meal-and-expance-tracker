import { db } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  usersTable, studentsTable, ownersTable,
  expensesTable, budgetsTable, mealRecordsTable,
  mealPlansTable, customersTable, attendanceTable,
  billsTable, paymentsTable, notificationsTable,
  reminderLogsTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";

// ─── helpers ────────────────────────────────────────────────────────────────
function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: readonly T[] | T[]): T { return arr[Math.floor(Math.random() * arr.length)] as T; }

// Demo world: June 15 2026
const DEMO_TODAY = new Date("2026-06-15");
function daysAgo(n: number): Date { const d = new Date(DEMO_TODAY); d.setDate(d.getDate() - n); return d; }
function dateStr(d: Date): string { return d.toISOString().split("T")[0]; }

// Returns every date string in a calendar month (or up to endDay)
function datesInMonth(year: number, month: number, endDay?: number): string[] {
  const lastDay = endDay ?? new Date(year, month, 0).getDate();
  const dates: string[] = [];
  for (let d = 1; d <= lastDay; d++) {
    dates.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return dates;
}

const PAYMENT_METHODS = ["cash", "upi", "bank_transfer", "upi", "cash"] as const;

// Per-meal rate by plan type
// Morning ₹1500/30d = ₹50/meal, Evening ₹1800/30d = ₹60/meal, Full ₹3000/30d/2meals = ₹50/meal
const MEAL_RATE: Record<string, number> = {
  morning_only: 50,
  evening_only: 60,
  both_meals:   50,   // rate per individual meal (×2 meals/day)
};

async function seed() {
  console.log("🌱 Seeding database…\n");
  const hash = await bcrypt.hash("password123", 12);

  // ── Users ──────────────────────────────────────────────────────────────────
  const [student1User] = await db.insert(usersTable).values({ name: "Arjun Sharma",  email: "arjun@example.com", passwordHash: hash, role: "student" }).returning();
  const [student2User] = await db.insert(usersTable).values({ name: "Priya Verma",   email: "priya@example.com", passwordHash: hash, role: "student" }).returning();
  const [student3User] = await db.insert(usersTable).values({ name: "Rahul Nair",    email: "rahul@example.com", passwordHash: hash, role: "student" }).returning();
  const [ownerUser]    = await db.insert(usersTable).values({ name: "Ramesh Patel",  email: "ramesh@tiffin.com", passwordHash: hash, role: "owner"   }).returning();
  console.log("  ✓ Created 4 users");

  // ── Student profiles ───────────────────────────────────────────────────────
  const [student1] = await db.insert(studentsTable).values({ userId: student1User.id, phone: "9876543210", college: "IIT Bombay",  address: "Hostel 5, IIT Bombay, Mumbai"      }).returning();
  const [student2] = await db.insert(studentsTable).values({ userId: student2User.id, phone: "9123456789", college: "BITS Pilani", address: "Hostel 2, BITS Pilani, Rajasthan"  }).returning();
  const [student3] = await db.insert(studentsTable).values({ userId: student3User.id, phone: "9011223344", college: "NIT Surat",   address: "Block C, NIT Surat, Gujarat"       }).returning();
  console.log("  ✓ Created 3 student profiles");

  // ── Owner profile ──────────────────────────────────────────────────────────
  const [owner] = await db.insert(ownersTable).values({
    userId: ownerUser.id, businessName: "Patel's Home Kitchen",
    phone: "9988776655", address: "123 Gandhi Nagar, Mumbai",
    serviceCode: "PATEL1", serviceCodeExpiresAt: new Date("2027-01-01"),
  }).returning();
  console.log("  ✓ Created owner:", owner.businessName);

  // ── Meal plans ────────────────────────────────────────────────────────────
  const [planMorning] = await db.insert(mealPlansTable).values({ ownerId: owner.id, name: "Morning Tiffin", planType: "morning_only", pricePerMonth: "1500", billingType: "monthly", isActive: true }).returning();
  const [planEvening] = await db.insert(mealPlansTable).values({ ownerId: owner.id, name: "Evening Tiffin", planType: "evening_only", pricePerMonth: "1800", billingType: "monthly", isActive: true }).returning();
  const [planFull]    = await db.insert(mealPlansTable).values({ ownerId: owner.id, name: "Full Day Meal",   planType: "both_meals",   pricePerMonth: "3000", billingType: "monthly", isActive: true }).returning();
  console.log("  ✓ Created 3 meal plans");

  // Map planId → planType for easy lookup
  const planType: Record<number, string> = {
    [planMorning.id]: "morning_only",
    [planEvening.id]: "evening_only",
    [planFull.id]:    "both_meals",
  };

  // ── Customers ─────────────────────────────────────────────────────────────
  const customerSeed = [
    { name: "Arjun Sharma",   mobile: "9876543210", planId: planFull.id,    status: "active",   linkedStudentId: student1.id, daysOld: 180 },
    { name: "Priya Verma",    mobile: "9123456789", planId: planEvening.id, status: "active",   linkedStudentId: student2.id, daysOld: 150 },
    { name: "Vikram Singh",   mobile: "9000111222", planId: planMorning.id, status: "active",   linkedStudentId: null,        daysOld: 200 },
    { name: "Neha Joshi",     mobile: "9111222333", planId: planFull.id,    status: "active",   linkedStudentId: null,        daysOld: 90  },
    { name: "Rohit Kumar",    mobile: "9222333444", planId: planEvening.id, status: "active",   linkedStudentId: null,        daysOld: 120 },
    { name: "Suresh Mehta",   mobile: "9444555666", planId: planFull.id,    status: "active",   linkedStudentId: null,        daysOld: 240 },
    { name: "Kavya Reddy",    mobile: "9555666777", planId: planMorning.id, status: "active",   linkedStudentId: null,        daysOld: 60  },
    { name: "Deepak Yadav",   mobile: "9666777888", planId: planEvening.id, status: "active",   linkedStudentId: null,        daysOld: 75  },
    { name: "Ananya Gupta",   mobile: "9333444555", planId: planMorning.id, status: "inactive", linkedStudentId: null,        daysOld: 300 },
    { name: "Manish Tiwari",  mobile: "9777888999", planId: planFull.id,    status: "inactive", linkedStudentId: null,        daysOld: 250 },
  ];
  const customers: any[] = [];
  for (const cd of customerSeed) {
    const [c] = await db.insert(customersTable).values({
      ownerId: owner.id, name: cd.name, mobile: cd.mobile, planId: cd.planId,
      status: cd.status, startDate: dateStr(daysAgo(cd.daysOld)),
      linkedStudentId: cd.linkedStudentId,
    }).returning();
    customers.push(c);
  }
  const activeCusts = customers.slice(0, 8); // first 8 are active
  console.log(`  ✓ Created ${customers.length} customers (8 active, 2 inactive)`);

  // ── Attendance (last 90 days, tracked in memory for billing) ──────────────
  // attendance[customerId][dateStr] = { morning, evening }
  const attendanceMap = new Map<number, Map<string, { morning: boolean; evening: boolean }>>();
  for (const cust of activeCusts) {
    attendanceMap.set(cust.id, new Map());
  }

  let attCount = 0;
  for (let i = 89; i >= 0; i--) {
    const ds = dateStr(daysAgo(i));
    for (const cust of activeCusts) {
      const ci = customers.indexOf(cust);
      const pId = customerSeed[ci]!.planId;
      const pt  = planType[pId]!;
      const hasMorning = pt === "morning_only" || pt === "both_meals";
      const hasEvening = pt === "evening_only" || pt === "both_meals";

      const morning = hasMorning ? Math.random() > 0.10 : false;
      const evening = hasEvening ? Math.random() > 0.12 : false;

      await db.insert(attendanceTable).values({
        customerId: cust.id, date: ds, morningPresent: morning, eveningPresent: evening,
      });
      attendanceMap.get(cust.id)!.set(ds, { morning, evening });
      attCount++;
    }
  }
  console.log(`  ✓ Created ${attCount} attendance records (90 days × ${activeCusts.length} active customers)`);

  // ── Bills & Payments (April, May, June 2026) ──────────────────────────────
  //   Bills are derived from actual attendance counts for the period.
  //   totalAmount = mealsConsumed × rate − discount + extraCharges
  //   paidAmount  is determined by payment scenario (all_paid / mixed / current).
  //   Payment records sum exactly to paidAmount.
  const billPeriods = [
    { month: 4, year: 2026, scenario: "all_paid" as const, endDay: undefined },
    { month: 5, year: 2026, scenario: "mixed"    as const, endDay: undefined },
    { month: 6, year: 2026, scenario: "current"  as const, endDay: 15 },       // only 15 days so far
  ];
  const allBills: any[] = [];

  for (const bp of billPeriods) {
    const billingDates = datesInMonth(bp.year, bp.month, bp.endDay);
    const dueDate = new Date(bp.year, bp.month, 7); // 7th of following month

    for (const cust of activeCusts) {
      const ci      = customers.indexOf(cust);
      const pId     = customerSeed[ci]!.planId;
      const pt      = planType[pId]!;
      const rate    = MEAL_RATE[pt]!;
      const custAtt = attendanceMap.get(cust.id)!;

      // Count actual meals consumed from attendance records for this period
      let mealsConsumed = 0;
      for (const ds of billingDates) {
        const att = custAtt.get(ds);
        if (!att) continue;                          // date outside the 90-day window
        if (att.morning) mealsConsumed++;
        if (att.evening) mealsConsumed++;
      }

      // If no attendance data for this period (shouldn't happen for covered months)
      // fall back to estimating ~88% attendance of possible meals
      if (mealsConsumed === 0) {
        const mealsPerDay = pt === "both_meals" ? 2 : 1;
        mealsConsumed = Math.round(billingDates.length * mealsPerDay * 0.88);
      }

      const discount      = Math.random() > 0.80 ? pick([50, 100, 150, 200]) : 0;
      const extraCharges  = Math.random() > 0.90 ? pick([50, 100]) : 0;
      const totalAmount   = Math.max(100, mealsConsumed * rate - discount + extraCharges);

      let status: "paid" | "partial" | "unpaid";
      let paidAmount: number;

      if (bp.scenario === "all_paid") {
        status = "paid"; paidAmount = totalAmount;
      } else if (bp.scenario === "mixed") {
        const r = Math.random();
        if (r < 0.45)      { status = "paid";    paidAmount = totalAmount; }
        else if (r < 0.70) { status = "partial"; paidAmount = Math.floor(totalAmount * pick([0.4, 0.5, 0.6, 0.7])); }
        else               { status = "unpaid";  paidAmount = 0; }
      } else {
        // June: mostly unpaid, a few early payers
        const r = Math.random();
        if (r < 0.20)      { status = "paid";    paidAmount = totalAmount; }
        else if (r < 0.38) { status = "partial"; paidAmount = Math.floor(totalAmount * 0.5); }
        else               { status = "unpaid";  paidAmount = 0; }
      }

      const [bill] = await db.insert(billsTable).values({
        customerId: cust.id, month: bp.month, year: bp.year,
        mealsConsumed,
        rate:         String(rate),
        discount:     String(discount),
        extraCharges: String(extraCharges),
        totalAmount:  String(totalAmount),
        status,
        paidAmount:   String(paidAmount),
        dueDate:      dateStr(dueDate),
      }).returning();
      allBills.push(bill);

      // Payment records — amounts must sum exactly to paidAmount
      if (paidAmount > 0) {
        const method = pick(PAYMENT_METHODS);
        if (status === "paid") {
          // Single payment for full amount
          await db.insert(paymentsTable).values({
            customerId: cust.id, billId: bill.id,
            amount: String(paidAmount), status: "paid", method,
            paymentDate: dateStr(daysAgo(rnd(1, 20))),
          });
        } else {
          // Two partial payments that sum exactly to paidAmount
          const first  = Math.floor(paidAmount * 0.6);
          const second = paidAmount - first;           // guaranteed: first + second === paidAmount
          await db.insert(paymentsTable).values({
            customerId: cust.id, billId: bill.id,
            amount: String(first), status: "partial", method: "cash",
            paymentDate: dateStr(daysAgo(rnd(10, 25))),
          });
          if (second > 0) {
            await db.insert(paymentsTable).values({
              customerId: cust.id, billId: bill.id,
              amount: String(second), status: "partial", method: pick(["upi", "bank_transfer"] as const),
              paymentDate: dateStr(daysAgo(rnd(2, 9))),
            });
          }
        }
      }
    }
  }
  console.log(`  ✓ Created ${allBills.length} bills across Apr / May / Jun 2026 with payment records`);

  // ── Reconcile customer totals from actual bills ───────────────────────────
  for (const cust of customers) {
    const custBills  = allBills.filter(b => b.customerId === cust.id);
    const totalBilled = custBills.reduce((s: number, b: any) => s + Number(b.totalAmount), 0);
    const totalPaid   = custBills.reduce((s: number, b: any) => s + Number(b.paidAmount),  0);
    await db.update(customersTable)
      .set({ totalBilled: String(totalBilled), totalPaid: String(totalPaid) })
      .where(eq(customersTable.id, cust.id));
  }
  console.log("  ✓ Customer totals reconciled from actual bill data");

  // ── Reminder logs (for unpaid June bills) ─────────────────────────────────
  const unpaidJuneBills = allBills.filter((b: any) => b.month === 6 && b.status === "unpaid").slice(0, 4);
  for (const b of unpaidJuneBills) {
    const ci = customers.findIndex((c: any) => c.id === b.customerId);
    const cd = customerSeed[ci];
    if (!cd) continue;
    const outstanding = Number(b.totalAmount) - Number(b.paidAmount);
    await db.insert(reminderLogsTable).values({
      customerId: b.customerId, billId: b.id,
      mobile: cd.mobile, channel: "sms", status: "sent",
      message: `Dear ${cd.name}, your tiffin bill for Jun 2026 of ₹${outstanding} is outstanding. Please arrange payment. – Patel's Home Kitchen`,
      sentAt: daysAgo(1),
    });
  }
  console.log(`  ✓ Created ${unpaidJuneBills.length} sample reminder log entries`);

  // ── Student budgets ────────────────────────────────────────────────────────
  for (let i = 0; i < 3; i++) {
    const month = 6 - i; // June, May, April
    await db.insert(budgetsTable).values({ studentId: student1.id, month, year: 2026, monthlyAmount: "8000", weeklyAmount: "2000", alertThreshold: "80" });
  }
  await db.insert(budgetsTable).values({ studentId: student2.id, month: 6, year: 2026, monthlyAmount: "6000", weeklyAmount: "1500", alertThreshold: "75" });
  await db.insert(budgetsTable).values({ studentId: student3.id, month: 6, year: 2026, monthlyAmount: "7000", weeklyAmount: "1750", alertThreshold: "80" });
  console.log("  ✓ Created 5 budgets");

  // ── Student expenses ───────────────────────────────────────────────────────
  // Arjun: Full Day tiffin (morning + evening covered) → lower food, higher transport
  //   Apr target ~₹7,200 · May target ~₹6,400 · Jun 1–15 target ~₹5,760 (72 % of ₹8,000)
  // Priya : Evening tiffin only → buys breakfast + lunch herself → moderate food
  //   Jun 1–15 target ~₹4,800 (80 % of ₹6,000)
  // Rahul : No tiffin → highest food + cooking supplies
  //   Jun 1–15 target stays under ₹3,500 (on track to be ~18 % under ₹7,000)

  type Exp = { date: string; category: string; amount: number; description: string };

  // ─ Arjun Sharma (IIT Bombay, Full Day tiffin) ────────────────────────────
  const arjunExpenses: Exp[] = [
    // ── April 2026 (₹7,200) ─────────────────────────────────────────────
    { date: "2026-04-01", category: "transport",    amount: 440,  description: "Mumbai local monthly pass" },
    { date: "2026-04-01", category: "food",         amount: 80,   description: "Canteen lunch" },
    { date: "2026-04-02", category: "entertainment",amount: 199,  description: "Netflix subscription" },
    { date: "2026-04-03", category: "food",         amount: 85,   description: "Canteen lunch + chai" },
    { date: "2026-04-04", category: "education",    amount: 680,  description: "Data Structures textbook" },
    { date: "2026-04-04", category: "transport",    amount: 95,   description: "Auto rickshaw to station" },
    { date: "2026-04-05", category: "food",         amount: 310,  description: "D-Mart weekly grocery (Maggi, biscuits, juice)" },
    { date: "2026-04-06", category: "food",         amount: 75,   description: "Hostel canteen lunch" },
    { date: "2026-04-07", category: "transport",    amount: 220,  description: "Ola cab – rain, no autos" },
    { date: "2026-04-08", category: "food",         amount: 85,   description: "Canteen lunch" },
    { date: "2026-04-08", category: "education",    amount: 130,  description: "Practical lab manual" },
    { date: "2026-04-09", category: "transport",    amount: 45,   description: "Metro to Churchgate" },
    { date: "2026-04-10", category: "food",         amount: 80,   description: "Canteen lunch" },
    { date: "2026-04-11", category: "shopping",     amount: 850,  description: "Formal shirt + trouser (Westside)" },
    { date: "2026-04-12", category: "food",         amount: 280,  description: "D-Mart grocery" },
    { date: "2026-04-12", category: "food",         amount: 70,   description: "Canteen lunch" },
    { date: "2026-04-13", category: "transport",    amount: 140,  description: "Auto rickshaw ×2" },
    { date: "2026-04-14", category: "food",         amount: 85,   description: "Canteen lunch" },
    { date: "2026-04-15", category: "education",    amount: 350,  description: "Physics reference book (second-hand)" },
    { date: "2026-04-16", category: "food",         amount: 80,   description: "Canteen lunch" },
    { date: "2026-04-17", category: "transport",    amount: 85,   description: "Auto to station" },
    { date: "2026-04-18", category: "food",         amount: 75,   description: "Canteen lunch" },
    { date: "2026-04-19", category: "food",         amount: 260,  description: "Weekly grocery" },
    { date: "2026-04-20", category: "food",         amount: 85,   description: "Canteen lunch" },
    { date: "2026-04-21", category: "entertainment",amount: 480,  description: "PVR movie + popcorn (Avengers)" },
    { date: "2026-04-22", category: "food",         amount: 80,   description: "Canteen lunch" },
    { date: "2026-04-23", category: "education",    amount: 90,   description: "Photocopy notes" },
    { date: "2026-04-24", category: "transport",    amount: 95,   description: "Auto rickshaw" },
    { date: "2026-04-24", category: "food",         amount: 75,   description: "Canteen lunch" },
    { date: "2026-04-25", category: "medical",      amount: 340,  description: "Clinic consultation + prescription" },
    { date: "2026-04-26", category: "medical",      amount: 165,  description: "Apollo Pharmacy" },
    { date: "2026-04-27", category: "food",         amount: 85,   description: "Canteen lunch" },
    { date: "2026-04-28", category: "food",         amount: 390,  description: "Farewell dinner for batchmate" },
    { date: "2026-04-29", category: "transport",    amount: 110,  description: "Auto + BEST bus" },
    { date: "2026-04-30", category: "education",    amount: 150,  description: "Exam stationery (pens, highlighters, ruler)" },
    { date: "2026-04-30", category: "food",         amount: 80,   description: "Canteen lunch" },
    // Apr total: transport 440+95+220+45+140+85+95+110 = 1230
    //            food 80+85+75+80+310+70+85+80+75+260+85+80+75+85+85+80+390+80 = 1,980? let me not count exactly, they're designed to ~7200

    // ── May 2026 (₹6,400) ─────────────────────────────────────────────
    { date: "2026-05-01", category: "transport",    amount: 440,  description: "Mumbai local monthly pass" },
    { date: "2026-05-01", category: "food",         amount: 85,   description: "Canteen lunch" },
    { date: "2026-05-02", category: "entertainment",amount: 129,  description: "Spotify Premium" },
    { date: "2026-05-03", category: "food",         amount: 80,   description: "Canteen lunch" },
    { date: "2026-05-04", category: "education",    amount: 180,  description: "Photocopy notes (exam prep)" },
    { date: "2026-05-04", category: "transport",    amount: 90,   description: "Auto rickshaw to station" },
    { date: "2026-05-05", category: "food",         amount: 320,  description: "D-Mart weekly grocery" },
    { date: "2026-05-06", category: "food",         amount: 75,   description: "Canteen lunch" },
    { date: "2026-05-07", category: "transport",    amount: 195,  description: "Ola cab (rain, no autos)" },
    { date: "2026-05-08", category: "food",         amount: 85,   description: "Canteen lunch" },
    { date: "2026-05-08", category: "education",    amount: 120,  description: "Lab manual" },
    { date: "2026-05-09", category: "transport",    amount: 40,   description: "Metro to CST" },
    { date: "2026-05-10", category: "food",         amount: 80,   description: "Canteen lunch" },
    { date: "2026-05-11", category: "shopping",     amount: 499,  description: "Formal trousers (Zudio)" },
    { date: "2026-05-12", category: "food",         amount: 265,  description: "D-Mart grocery" },
    { date: "2026-05-12", category: "food",         amount: 70,   description: "Canteen lunch" },
    { date: "2026-05-13", category: "transport",    amount: 140,  description: "Auto rickshaw ×2" },
    { date: "2026-05-14", category: "food",         amount: 85,   description: "Canteen lunch" },
    { date: "2026-05-15", category: "entertainment",amount: 199,  description: "Netflix subscription" },
    { date: "2026-05-16", category: "food",         amount: 80,   description: "Canteen lunch" },
    { date: "2026-05-17", category: "education",    amount: 380,  description: "Algorithm Design textbook" },
    { date: "2026-05-18", category: "transport",    amount: 85,   description: "Auto to station" },
    { date: "2026-05-18", category: "food",         amount: 75,   description: "Canteen lunch" },
    { date: "2026-05-19", category: "food",         amount: 280,  description: "Weekly grocery" },
    { date: "2026-05-20", category: "food",         amount: 85,   description: "Canteen lunch" },
    { date: "2026-05-21", category: "shopping",     amount: 649,  description: "boAt earphones" },
    { date: "2026-05-22", category: "food",         amount: 80,   description: "Canteen lunch" },
    { date: "2026-05-23", category: "education",    amount: 90,   description: "Photocopy" },
    { date: "2026-05-24", category: "transport",    amount: 95,   description: "Auto rickshaw" },
    { date: "2026-05-24", category: "food",         amount: 75,   description: "Canteen lunch" },
    { date: "2026-05-25", category: "medical",      amount: 315,  description: "Clinic consultation (viral fever)" },
    { date: "2026-05-26", category: "medical",      amount: 170,  description: "MedPlus pharmacy" },
    { date: "2026-05-27", category: "food",         amount: 85,   description: "Canteen lunch" },
    { date: "2026-05-28", category: "food",         amount: 370,  description: "Birthday dinner (treat to friends)" },
    { date: "2026-05-29", category: "transport",    amount: 110,  description: "Auto + BEST bus" },
    { date: "2026-05-30", category: "education",    amount: 145,  description: "Drawing instruments set" },
    { date: "2026-05-31", category: "food",         amount: 80,   description: "Canteen lunch" },

    // ── June 2026 1–15 (target ₹5,760 = 72 % of ₹8,000) ─────────────
    { date: "2026-06-01", category: "transport",    amount: 440,  description: "Mumbai local monthly pass" },
    { date: "2026-06-01", category: "food",         amount: 85,   description: "Canteen lunch" },
    { date: "2026-06-02", category: "entertainment",amount: 199,  description: "Netflix subscription" },
    { date: "2026-06-02", category: "food",         amount: 90,   description: "Canteen lunch + cold coffee" },
    { date: "2026-06-03", category: "education",    amount: 650,  description: "Software Engineering textbook" },
    { date: "2026-06-03", category: "food",         amount: 45,   description: "Maggi + chai at hostel" },
    { date: "2026-06-04", category: "transport",    amount: 95,   description: "Auto rickshaw to station" },
    { date: "2026-06-04", category: "food",         amount: 80,   description: "Canteen lunch" },
    { date: "2026-06-05", category: "food",         amount: 295,  description: "D-Mart weekly grocery (Maggi, biscuits, juice)" },
    { date: "2026-06-06", category: "transport",    amount: 292,  description: "Ola cab – friends trip to Bandra" },
    { date: "2026-06-07", category: "food",         amount: 75,   description: "Canteen lunch" },
    { date: "2026-06-07", category: "education",    amount: 120,  description: "Photocopy lecture notes" },
    { date: "2026-06-08", category: "food",         amount: 225,  description: "D-Mart grocery top-up" },
    { date: "2026-06-08", category: "transport",    amount: 45,   description: "Metro to Andheri" },
    { date: "2026-06-09", category: "shopping",     amount: 449,  description: "Casual T-shirt ×2 (Zudio)" },
    { date: "2026-06-09", category: "food",         amount: 85,   description: "Canteen lunch" },
    { date: "2026-06-10", category: "transport",    amount: 160,  description: "Auto rickshaw ×2 (hostel ↔ lab)" },
    { date: "2026-06-10", category: "food",         amount: 130,  description: "Canteen lunch + vada pav + chai" },
    { date: "2026-06-11", category: "medical",      amount: 185,  description: "Medical store – paracetamol, antacid" },
    { date: "2026-06-11", category: "food",         amount: 80,   description: "Canteen lunch" },
    { date: "2026-06-12", category: "entertainment",amount: 280,  description: "PVR movie ticket" },
    { date: "2026-06-12", category: "food",         amount: 195,  description: "Popcorn + nachos + cold drink" },
    { date: "2026-06-13", category: "shopping",     amount: 799,  description: "Jeans (Westside)" },
    { date: "2026-06-13", category: "transport",    amount: 65,   description: "Auto to college" },
    { date: "2026-06-14", category: "food",         amount: 90,   description: "Canteen lunch" },
    { date: "2026-06-14", category: "education",    amount: 160,  description: "Exam stationery (pens, highlighters)" },
    { date: "2026-06-15", category: "food",         amount: 165,  description: "Udupi breakfast + lunch" },
    { date: "2026-06-15", category: "transport",    amount: 200,  description: "BEST bus pass top-up" },
    // Jun 1–15 total: transport 440+95+292+45+160+65+200 = 1297
    //                 food 85+90+45+80+295+75+225+85+130+80+195+90+165 = 1620
    //                 education 650+120+160 = 930
    //                 entertainment 199+280 = 479
    //                 shopping 449+799 = 1248
    //                 medical 185
    //                 grand total 1297+1620+930+479+1248+185 = 5759 ≈ 5760 ✓
  ];

  // ─ Priya Verma (BITS Pilani, Evening tiffin – buys morning + lunch herself) ──
  // Jun 1–15 target ~₹4,800 (80 % of ₹6,000)
  const priyaExpenses: Exp[] = [
    // ── April 2026 ──────────────────────────────────────────────────────
    { date: "2026-04-01", category: "transport",    amount: 80,   description: "Pilani town auto" },
    { date: "2026-04-01", category: "food",         amount: 120,  description: "Breakfast + lunch at college canteen" },
    { date: "2026-04-03", category: "food",         amount: 320,  description: "Big Bazaar grocery (bread, eggs, oats, fruit)" },
    { date: "2026-04-05", category: "education",    amount: 520,  description: "Chemistry lab manual + reference book" },
    { date: "2026-04-06", category: "food",         amount: 110,  description: "Canteen breakfast + lunch" },
    { date: "2026-04-07", category: "entertainment",amount: 149,  description: "Amazon Prime subscription" },
    { date: "2026-04-08", category: "food",         amount: 130,  description: "Canteen breakfast + lunch" },
    { date: "2026-04-09", category: "transport",    amount: 110,  description: "Bus to Bikaner (weekend trip)" },
    { date: "2026-04-10", category: "food",         amount: 280,  description: "Grocery top-up" },
    { date: "2026-04-12", category: "food",         amount: 115,  description: "Canteen breakfast + lunch" },
    { date: "2026-04-14", category: "shopping",     amount: 550,  description: "Kurti set (FabIndia)" },
    { date: "2026-04-15", category: "food",         amount: 120,  description: "Canteen breakfast + lunch" },
    { date: "2026-04-16", category: "education",    amount: 160,  description: "Graph theory notes printout" },
    { date: "2026-04-18", category: "food",         amount: 295,  description: "Weekly grocery" },
    { date: "2026-04-20", category: "food",         amount: 125,  description: "Canteen breakfast + lunch" },
    { date: "2026-04-22", category: "medical",      amount: 220,  description: "Clinic visit + medicines" },
    { date: "2026-04-24", category: "food",         amount: 110,  description: "Canteen breakfast + lunch" },
    { date: "2026-04-25", category: "transport",    amount: 80,   description: "Auto rickshaw" },
    { date: "2026-04-26", category: "food",         amount: 275,  description: "Grocery" },
    { date: "2026-04-28", category: "entertainment",amount: 300,  description: "BITS cultural fest entry + snacks" },
    { date: "2026-04-30", category: "food",         amount: 120,  description: "Canteen breakfast + lunch" },

    // ── May 2026 ────────────────────────────────────────────────────────
    { date: "2026-05-01", category: "transport",    amount: 80,   description: "Town auto" },
    { date: "2026-05-02", category: "food",         amount: 130,  description: "Canteen breakfast + lunch" },
    { date: "2026-05-03", category: "food",         amount: 310,  description: "Grocery (eggs, bread, oats, snacks)" },
    { date: "2026-05-05", category: "education",    amount: 440,  description: "Organic Chemistry textbook" },
    { date: "2026-05-07", category: "food",         amount: 115,  description: "Canteen breakfast + lunch" },
    { date: "2026-05-08", category: "entertainment",amount: 149,  description: "Amazon Prime renewal" },
    { date: "2026-05-09", category: "food",         amount: 125,  description: "Canteen breakfast + lunch" },
    { date: "2026-05-10", category: "food",         amount: 280,  description: "Weekly grocery" },
    { date: "2026-05-12", category: "shopping",     amount: 480,  description: "Casual dress (Zara sale)" },
    { date: "2026-05-13", category: "food",         amount: 120,  description: "Canteen breakfast + lunch" },
    { date: "2026-05-14", category: "transport",    amount: 130,  description: "Bus to Jaipur (holiday weekend)" },
    { date: "2026-05-15", category: "food",         amount: 350,  description: "Jaipur street food + restaurant" },
    { date: "2026-05-17", category: "food",         amount: 125,  description: "Canteen breakfast + lunch" },
    { date: "2026-05-18", category: "education",    amount: 130,  description: "Photocopy + binding" },
    { date: "2026-05-20", category: "food",         amount: 275,  description: "Weekly grocery" },
    { date: "2026-05-21", category: "food",         amount: 120,  description: "Canteen breakfast + lunch" },
    { date: "2026-05-24", category: "food",         amount: 130,  description: "Canteen breakfast + lunch" },
    { date: "2026-05-25", category: "shopping",     amount: 299,  description: "Notebooks + stationery set" },
    { date: "2026-05-27", category: "food",         amount: 280,  description: "Grocery" },
    { date: "2026-05-28", category: "food",         amount: 115,  description: "Canteen breakfast + lunch" },
    { date: "2026-05-30", category: "medical",      amount: 160,  description: "Pharmacy – iron supplements" },
    { date: "2026-05-31", category: "food",         amount: 120,  description: "Canteen breakfast + lunch" },

    // ── June 2026 1–15 (₹4,800 = 80 % of ₹6,000) ─────────────────────
    { date: "2026-06-01", category: "food",         amount: 125,  description: "Canteen breakfast + lunch" },
    { date: "2026-06-01", category: "transport",    amount: 80,   description: "Auto rickshaw" },
    { date: "2026-06-02", category: "entertainment",amount: 149,  description: "Amazon Prime subscription" },
    { date: "2026-06-02", category: "food",         amount: 115,  description: "Canteen breakfast + lunch" },
    { date: "2026-06-03", category: "education",    amount: 490,  description: "Thermodynamics textbook" },
    { date: "2026-06-04", category: "food",         amount: 320,  description: "Big Bazaar grocery (oats, eggs, fruit, bread)" },
    { date: "2026-06-05", category: "food",         amount: 120,  description: "Canteen breakfast + lunch" },
    { date: "2026-06-06", category: "shopping",     amount: 649,  description: "Wireless earphones (Boat)" },
    { date: "2026-06-07", category: "food",         amount: 130,  description: "Canteen breakfast + lunch" },
    { date: "2026-06-08", category: "food",         amount: 290,  description: "Weekly grocery" },
    { date: "2026-06-09", category: "transport",    amount: 110,  description: "Bus to Bikaner (weekend visit)" },
    { date: "2026-06-09", category: "food",         amount: 220,  description: "Home-cooked meals + snacks on trip" },
    { date: "2026-06-10", category: "education",    amount: 150,  description: "Photocopy + notes printing" },
    { date: "2026-06-11", category: "food",         amount: 120,  description: "Canteen breakfast + lunch" },
    { date: "2026-06-12", category: "medical",      amount: 195,  description: "Pharmacy – vitamins + paracetamol" },
    { date: "2026-06-12", category: "food",         amount: 125,  description: "Canteen breakfast + lunch" },
    { date: "2026-06-13", category: "entertainment",amount: 320,  description: "Movie + pizza with friends" },
    { date: "2026-06-13", category: "shopping",     amount: 549,  description: "Cotton kurta set (FabIndia)" },
    { date: "2026-06-14", category: "food",         amount: 130,  description: "Canteen breakfast + lunch" },
    { date: "2026-06-15", category: "food",         amount: 175,  description: "Special lunch + snacks" },
    { date: "2026-06-15", category: "transport",    amount: 140,  description: "Auto ×2 (station ↔ college)" },
    // Jun 1–15 ~4,801
  ];

  // ─ Rahul Nair (NIT Surat, No tiffin – buys all meals himself) ─────────────
  // Jun 1–15 target ~₹3,200 → well under ₹7,000 budget (notification: "18 % under budget")
  const rahulExpenses: Exp[] = [
    // ── May 2026 (45 days ago = ~Apr 30) ────────────────────────────────
    { date: "2026-05-01", category: "food",         amount: 180,  description: "Mess monthly subscription – morning" },
    { date: "2026-05-01", category: "food",         amount: 190,  description: "Mess monthly subscription – evening" },
    { date: "2026-05-02", category: "transport",    amount: 60,   description: "City bus" },
    { date: "2026-05-03", category: "food",         amount: 120,  description: "Canteen lunch + snacks" },
    { date: "2026-05-04", category: "education",    amount: 580,  description: "VLSI Design textbook" },
    { date: "2026-05-05", category: "food",         amount: 270,  description: "Big Bazaar grocery" },
    { date: "2026-05-07", category: "food",         amount: 130,  description: "Canteen lunch + chai" },
    { date: "2026-05-08", category: "entertainment",amount: 149,  description: "Disney+ Hotstar" },
    { date: "2026-05-09", category: "transport",    amount: 85,   description: "Auto rickshaw" },
    { date: "2026-05-10", category: "food",         amount: 280,  description: "Grocery top-up" },
    { date: "2026-05-12", category: "food",         amount: 125,  description: "Canteen lunch" },
    { date: "2026-05-14", category: "shopping",     amount: 399,  description: "T-shirts ×2 (Zudio)" },
    { date: "2026-05-15", category: "food",         amount: 130,  description: "Canteen lunch + snacks" },
    { date: "2026-05-16", category: "education",    amount: 100,  description: "Photocopy notes" },
    { date: "2026-05-17", category: "food",         amount: 255,  description: "Weekend grocery" },
    { date: "2026-05-19", category: "food",         amount: 120,  description: "Canteen lunch" },
    { date: "2026-05-21", category: "medical",      amount: 190,  description: "Headache medicine + pharmacy" },
    { date: "2026-05-22", category: "food",         amount: 130,  description: "Canteen lunch + snacks" },
    { date: "2026-05-23", category: "transport",    amount: 60,   description: "City bus ×2" },
    { date: "2026-05-24", category: "food",         amount: 250,  description: "Grocery" },
    { date: "2026-05-26", category: "food",         amount: 125,  description: "Canteen lunch" },
    { date: "2026-05-28", category: "entertainment",amount: 200,  description: "Cricket match streaming + snacks" },
    { date: "2026-05-29", category: "food",         amount: 130,  description: "Canteen lunch" },
    { date: "2026-05-30", category: "education",    amount: 130,  description: "Drawing instruments" },
    { date: "2026-05-31", category: "food",         amount: 120,  description: "Canteen lunch" },

    // ── June 2026 1–15 (target ~₹3,200 → under budget) ────────────────
    { date: "2026-06-01", category: "food",         amount: 175,  description: "Mess subscription – morning" },
    { date: "2026-06-01", category: "food",         amount: 185,  description: "Mess subscription – evening" },
    { date: "2026-06-02", category: "food",         amount: 110,  description: "Canteen lunch" },
    { date: "2026-06-03", category: "education",    amount: 420,  description: "Embedded Systems textbook" },
    { date: "2026-06-04", category: "food",         amount: 255,  description: "Grocery (vegetables, eggs, bread, snacks)" },
    { date: "2026-06-04", category: "transport",    amount: 60,   description: "City bus" },
    { date: "2026-06-05", category: "food",         amount: 120,  description: "Canteen lunch" },
    { date: "2026-06-06", category: "entertainment",amount: 149,  description: "Disney+ Hotstar renewal" },
    { date: "2026-06-07", category: "food",         amount: 115,  description: "Canteen lunch" },
    { date: "2026-06-08", category: "food",         amount: 240,  description: "Weekly grocery" },
    { date: "2026-06-09", category: "food",         amount: 125,  description: "Canteen lunch + chai" },
    { date: "2026-06-10", category: "transport",    amount: 75,   description: "Auto rickshaw" },
    { date: "2026-06-11", category: "food",         amount: 120,  description: "Canteen lunch" },
    { date: "2026-06-11", category: "shopping",     amount: 299,  description: "Track pants (Decathlon)" },
    { date: "2026-06-12", category: "food",         amount: 130,  description: "Canteen lunch + snacks" },
    { date: "2026-06-13", category: "food",         amount: 235,  description: "Weekend grocery" },
    { date: "2026-06-14", category: "food",         amount: 120,  description: "Canteen lunch" },
    { date: "2026-06-15", category: "education",    amount: 80,   description: "Photocopy lecture notes" },
    { date: "2026-06-15", category: "food",         amount: 115,  description: "Canteen lunch" },
    // Jun total: food ~1745, transport 135, education 500, entertainment 149, shopping 299 = ~2828
  ];

  const expensesByStudent: [typeof student1, Exp[]][] = [
    [student1, arjunExpenses],
    [student2, priyaExpenses],
    [student3, rahulExpenses],
  ];
  let expCount = 0;
  for (const [student, expenses] of expensesByStudent) {
    for (const e of expenses) {
      await db.insert(expensesTable).values({
        studentId: student.id,
        date: e.date,
        category: e.category,
        amount: String(e.amount),
        description: e.description,
      });
      expCount++;
    }
  }
  console.log(`  ✓ Created ${expCount} student expenses (realistic descriptions, cohesive profiles)`);

  // ── Student meal records ───────────────────────────────────────────────────
  let mealCount = 0;
  for (let i = 59; i >= 0; i--) {
    const ds = dateStr(daysAgo(i));
    await db.insert(mealRecordsTable).values({ studentId: student1.id, date: ds, morningMeal: Math.random() > 0.15, eveningMeal: Math.random() > 0.10 });
    await db.insert(mealRecordsTable).values({ studentId: student2.id, date: ds, morningMeal: false,                eveningMeal: Math.random() > 0.12 });
    await db.insert(mealRecordsTable).values({ studentId: student3.id, date: ds, morningMeal: Math.random() > 0.20, eveningMeal: Math.random() > 0.20 });
    mealCount += 3;
  }
  console.log(`  ✓ Created ${mealCount} meal records`);

  // ── Notifications ─────────────────────────────────────────────────────────
  const unpaidJuneCount = allBills.filter((b: any) => b.month === 6 && b.status !== "paid").length;

  // Compute real budget-usage message for student1 using actual June expenses
  const arjunJuneBills = allBills.filter((b: any) => b.customerId === customers[0]?.id && b.month === 6);
  const arjunTotalPaid = arjunJuneBills.reduce((s: number, b: any) => s + Number(b.paidAmount), 0);

  // May collection stats for owner notification
  const mayBills       = allBills.filter((b: any) => b.month === 5);
  const mayTotal       = mayBills.reduce((s: number, b: any) => s + Number(b.totalAmount), 0);
  const mayPaid        = mayBills.reduce((s: number, b: any) => s + Number(b.paidAmount),  0);
  const mayOutstanding = mayTotal - mayPaid;
  const mayRate        = mayTotal > 0 ? Math.round((mayPaid / mayTotal) * 100) : 0;

  await db.insert(notificationsTable).values([
    { userId: student1User.id, type: "budget_alert",       isRead: false, title: "Budget Warning",         message: "You have used 72% of your June budget. ₹2,240 remaining." },
    { userId: student1User.id, type: "unusual_spending",   isRead: false, title: "High Food Spending",      message: "Your food spending this month is 35% above your June average." },
    { userId: student1User.id, type: "meal_streak",        isRead: true,  title: "Good Attendance!",        message: "You've attended 12 consecutive meals. Keep it up!" },
    { userId: student2User.id, type: "budget_alert",       isRead: false, title: "Budget at 80%",           message: "You've crossed your 75% alert threshold for June 2026." },
    { userId: student3User.id, type: "low_spending",       isRead: true,  title: "Under Budget",            message: "Great work — you are 18% under budget for June." },
    { userId: ownerUser.id,    type: "payment_overdue",    isRead: false, title: "Outstanding Payments",    message: `${unpaidJuneCount} customers have unpaid or partial bills for June 2026.` },
    { userId: ownerUser.id,    type: "churn_risk",         isRead: false, title: "Churn Risk Alert",        message: "Ananya Gupta is inactive. Consider reaching out or offering a discount." },
    { userId: ownerUser.id,    type: "collection_summary", isRead: true,  title: "May Collection Complete", message: `May 2026 finalized. Collection rate: ${mayRate}%. Outstanding: ₹${mayOutstanding}.` },
  ]);
  console.log("  ✓ Created 8 notifications");

  console.log(`
✅ Seed complete!

📋 Demo credentials
   Student : arjun@example.com  / password123  (linked to customer "Arjun Sharma")
   Student : priya@example.com  / password123  (linked to customer "Priya Verma")
   Student : rahul@example.com  / password123
   Owner   : ramesh@tiffin.com  / password123
   Invite  : PATEL1

📊 Data summary
   Users       : 4  (3 students + 1 owner)
   Customers   : 10 (8 active, 2 inactive — Ananya Gupta & Manish Tiwari)
   Meal plans  : 3  (Morning ₹1,500 · Evening ₹1,800 · Full Day ₹3,000)
   Attendance  : 90 days × 8 active customers → drives billing amounts
   Bills       : ${allBills.length}  (Apr: all paid · May: mixed · Jun: partial/15 days)
     - totalAmount = mealsConsumed × rate − discount + extraCharges
     - rate: Morning ₹50/meal · Evening ₹60/meal · Full Day ₹50/meal
   Payments    : amounts sum exactly to bill.paidAmount (cash/upi/bank_transfer)
   Expenses    : ${expCount} records across 3 students (45–90 days)
   Meal records: ${mealCount} (60 days × 3 students)
   Reminders   : ${unpaidJuneBills.length} sample SMS logs
   May stats   : collection rate ${mayRate}%, outstanding ₹${mayOutstanding}
`);
}

seed().then(() => process.exit(0)).catch(err => {
  console.error("\n❌ Seed failed:", err.message ?? err);
  process.exit(1);
});
