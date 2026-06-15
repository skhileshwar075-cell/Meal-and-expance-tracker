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
  const categories = ["food", "transport", "education", "entertainment", "shopping", "medical"] as const;
  const amtRange: Record<string, [number, number]> = {
    food: [80, 280], transport: [20, 120], education: [200, 800],
    entertainment: [100, 500], shopping: [200, 1200], medical: [100, 400],
  };
  let expCount = 0;
  const expPlans = [
    { id: student1.id, days: 90, minPer: 1, maxPer: 4 },
    { id: student2.id, days: 60, minPer: 1, maxPer: 3 },
    { id: student3.id, days: 45, minPer: 1, maxPer: 3 },
  ];
  for (const ep of expPlans) {
    for (let i = ep.days - 1; i >= 0; i--) {
      const ds = dateStr(daysAgo(i));
      const n  = rnd(ep.minPer, ep.maxPer);
      for (let j = 0; j < n; j++) {
        const cat     = pick(categories);
        const [lo, hi] = amtRange[cat];
        await db.insert(expensesTable).values({
          studentId: ep.id, date: ds, category: cat,
          amount: String(rnd(lo, hi)),
          description: `${cat.charAt(0).toUpperCase() + cat.slice(1)} — ${ds}`,
        });
        expCount++;
      }
    }
  }
  console.log(`  ✓ Created ${expCount} student expenses`);

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
