import { db } from "@workspace/db";
import {
  usersTable, studentsTable, ownersTable,
  expensesTable, budgetsTable, mealRecordsTable,
  mealPlansTable, customersTable, attendanceTable,
  billsTable, paymentsTable, notificationsTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database…");

  // ── Users ─────────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash("password123", 12);

  // Student user
  let [student1User] = await db.select().from(usersTable).where(eq(usersTable.email, "arjun@example.com"));
  if (!student1User) {
    [student1User] = await db.insert(usersTable).values({
      name: "Arjun Sharma", email: "arjun@example.com", passwordHash: hash, role: "student",
    }).returning();
    console.log("  ✓ Created student user:", student1User.email);
  }

  // Owner user
  let [ownerUser] = await db.select().from(usersTable).where(eq(usersTable.email, "ramesh@tiffin.com"));
  if (!ownerUser) {
    [ownerUser] = await db.insert(usersTable).values({
      name: "Ramesh Patel", email: "ramesh@tiffin.com", passwordHash: hash, role: "owner",
    }).returning();
    console.log("  ✓ Created owner user:", ownerUser.email);
  }

  // Second student
  let [student2User] = await db.select().from(usersTable).where(eq(usersTable.email, "priya@example.com"));
  if (!student2User) {
    [student2User] = await db.insert(usersTable).values({
      name: "Priya Verma", email: "priya@example.com", passwordHash: hash, role: "student",
    }).returning();
    console.log("  ✓ Created student user:", student2User.email);
  }

  // ── Student profiles ──────────────────────────────────────────────────────
  let [student1] = await db.select().from(studentsTable).where(eq(studentsTable.userId, student1User.id));
  if (!student1) {
    [student1] = await db.insert(studentsTable).values({
      userId: student1User.id, phone: "9876543210",
      college: "IIT Bombay", address: "Hostel 5, IIT Bombay, Mumbai",
    }).returning();
    console.log("  ✓ Created student profile:", student1.id);
  }

  let [student2] = await db.select().from(studentsTable).where(eq(studentsTable.userId, student2User.id));
  if (!student2) {
    [student2] = await db.insert(studentsTable).values({
      userId: student2User.id, phone: "9123456789",
      college: "BITS Pilani", address: "Hostel 2, BITS Pilani, Rajasthan",
    }).returning();
    console.log("  ✓ Created student profile:", student2.id);
  }

  // ── Owner profile ─────────────────────────────────────────────────────────
  let [owner] = await db.select().from(ownersTable).where(eq(ownersTable.userId, ownerUser.id));
  if (!owner) {
    [owner] = await db.insert(ownersTable).values({
      userId: ownerUser.id, businessName: "Patel's Home Kitchen",
      phone: "9988776655", address: "123 Gandhi Nagar, Mumbai",
      serviceCode: "PATEL1", serviceCodeExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }).returning();
    console.log("  ✓ Created owner profile:", owner.businessName);
  }

  // ── Meal plans ────────────────────────────────────────────────────────────
  const existingPlans = await db.select().from(mealPlansTable).where(eq(mealPlansTable.ownerId, owner.id));
  let plan1Id: number, plan2Id: number, plan3Id: number;
  if (existingPlans.length === 0) {
    const [p1] = await db.insert(mealPlansTable).values({
      ownerId: owner.id, name: "Morning Tiffin", planType: "morning_only",
      pricePerMonth: "1500", billingType: "monthly", isActive: true,
    }).returning();
    const [p2] = await db.insert(mealPlansTable).values({
      ownerId: owner.id, name: "Evening Tiffin", planType: "evening_only",
      pricePerMonth: "1800", billingType: "monthly", isActive: true,
    }).returning();
    const [p3] = await db.insert(mealPlansTable).values({
      ownerId: owner.id, name: "Full Day Meal", planType: "both_meals",
      pricePerMonth: "3000", billingType: "monthly", isActive: true,
    }).returning();
    plan1Id = p1.id; plan2Id = p2.id; plan3Id = p3.id;
    console.log("  ✓ Created 3 meal plans");
  } else {
    plan1Id = existingPlans[0]?.id ?? 1;
    plan2Id = existingPlans[1]?.id ?? 2;
    plan3Id = existingPlans[2]?.id ?? 3;
  }

  // ── Customers ─────────────────────────────────────────────────────────────
  const existingCustomers = await db.select().from(customersTable).where(eq(customersTable.ownerId, owner.id));
  let custIds: number[] = [];
  if (existingCustomers.length === 0) {
    const customerData = [
      { name: "Arjun Sharma", mobile: "9876543210", planId: plan3Id, status: "active", linkedStudentId: student1.id },
      { name: "Priya Verma", mobile: "9123456789", planId: plan2Id, status: "active", linkedStudentId: student2.id },
      { name: "Vikram Singh", mobile: "9000111222", planId: plan1Id, status: "active", linkedStudentId: null },
      { name: "Neha Joshi", mobile: "9111222333", planId: plan3Id, status: "active", linkedStudentId: null },
      { name: "Rohit Kumar", mobile: "9222333444", planId: plan2Id, status: "active", linkedStudentId: null },
      { name: "Ananya Gupta", mobile: "9333444555", planId: plan1Id, status: "inactive", linkedStudentId: null },
      { name: "Suresh Mehta", mobile: "9444555666", planId: plan3Id, status: "active", linkedStudentId: null },
    ];
    for (const cd of customerData) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 6 + 1));
      const [c] = await db.insert(customersTable).values({
        ownerId: owner.id, name: cd.name, mobile: cd.mobile,
        planId: cd.planId, status: cd.status,
        startDate: startDate.toISOString().split("T")[0],
        linkedStudentId: cd.linkedStudentId,
      }).returning();
      custIds.push(c.id);
    }
    console.log(`  ✓ Created ${customerData.length} customers`);
  } else {
    custIds = existingCustomers.map(c => c.id);
  }

  // ── Attendance (last 30 days) ──────────────────────────────────────────────
  const existingAtt = await db.select().from(attendanceTable).limit(1);
  if (existingAtt.length === 0 && custIds.length > 0) {
    const now = new Date();
    let attCount = 0;
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      for (const custId of custIds.slice(0, 5)) {
        await db.insert(attendanceTable).values({
          customerId: custId, date: dateStr,
          morningPresent: Math.random() > 0.15,
          eveningPresent: Math.random() > 0.2,
        });
        attCount++;
      }
    }
    console.log(`  ✓ Created ${attCount} attendance records`);
  }

  // ── Bills & Payments ──────────────────────────────────────────────────────
  const existingBills = await db.select().from(billsTable).limit(1);
  if (existingBills.length === 0 && custIds.length > 0) {
    const planPrices: Record<number, number> = {
      [plan1Id]: 1500,
      [plan2Id]: 1800,
      [plan3Id]: 3000,
    };
    const allCustomers = await db.select().from(customersTable).where(eq(customersTable.ownerId, owner.id));
    const now = new Date();
    for (let mo = 1; mo <= 2; mo++) {
      const billMonth = now.getMonth() + 1 - mo;
      const billYear = billMonth <= 0 ? now.getFullYear() - 1 : now.getFullYear();
      const actualMonth = billMonth <= 0 ? 12 + billMonth : billMonth;

      for (const cust of allCustomers.filter(c => c.status === "active")) {
        const planPrice = planPrices[cust.planId ?? 0] ?? 1500;
        const mealsConsumed = Math.floor(Math.random() * 20 + 40);
        const discount = Math.random() > 0.8 ? 100 : 0;
        const totalAmount = planPrice - discount;
        const isPaid = mo === 2; // last month is paid
        const isPartial = !isPaid && Math.random() > 0.5;
        const paidAmount = isPaid ? totalAmount : isPartial ? Math.floor(totalAmount * 0.6) : 0;
        const status = isPaid ? "paid" : paidAmount > 0 ? "partial" : "unpaid";

        const [bill] = await db.insert(billsTable).values({
          customerId: cust.id, month: actualMonth, year: billYear,
          mealsConsumed, rate: "50", discount: String(discount), extraCharges: "0",
          totalAmount: String(totalAmount), status, paidAmount: String(paidAmount),
        }).returning();

        // customer totals updated in bulk below

        if (paidAmount > 0) {
          await db.insert(paymentsTable).values({
            customerId: cust.id, billId: bill.id, amount: String(paidAmount),
            status, paymentDate: new Date().toISOString().split("T")[0],
          });
        }
      }
    }
    // Fix customer totals directly
    for (const cust of allCustomers) {
      const bills = await db.select().from(billsTable).where(eq(billsTable.customerId, cust.id));
      const totalBilled = bills.reduce((s, b) => s + Number(b.totalAmount), 0);
      const totalPaid = bills.reduce((s, b) => s + Number(b.paidAmount), 0);
      await db.update(customersTable).set({ totalBilled: String(totalBilled), totalPaid: String(totalPaid) }).where(eq(customersTable.id, cust.id));
    }
    console.log("  ✓ Created bills and payments");
  }

  // ── Student budgets ───────────────────────────────────────────────────────
  const existingBudgets = await db.select().from(budgetsTable).where(eq(budgetsTable.studentId, student1.id));
  if (existingBudgets.length === 0) {
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      await db.insert(budgetsTable).values({
        studentId: student1.id, month: d.getMonth() + 1, year: d.getFullYear(),
        monthlyAmount: "8000", weeklyAmount: "2000", alertThreshold: "80",
      });
    }
    await db.insert(budgetsTable).values({
      studentId: student2.id, month: now.getMonth() + 1, year: now.getFullYear(),
      monthlyAmount: "6000", weeklyAmount: "1500", alertThreshold: "75",
    });
    console.log("  ✓ Created budgets");
  }

  // ── Student expenses (last 60 days) ───────────────────────────────────────
  const existingExp = await db.select().from(expensesTable).where(eq(expensesTable.studentId, student1.id)).limit(1);
  if (existingExp.length === 0) {
    const categories = ["food", "transport", "education", "entertainment", "shopping", "medical"] as const;
    const now = new Date();
    let expCount = 0;
    for (let i = 59; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const numExpenses = Math.floor(Math.random() * 4 + 1);
      for (let j = 0; j < numExpenses; j++) {
        const cat = categories[Math.floor(Math.random() * categories.length)];
        const amounts: Record<string, number> = {
          food: 80 + Math.random() * 200,
          transport: 20 + Math.random() * 100,
          education: 200 + Math.random() * 500,
          entertainment: 100 + Math.random() * 400,
          shopping: 200 + Math.random() * 800,
          medical: 100 + Math.random() * 300,
        };
        await db.insert(expensesTable).values({
          studentId: student1.id, date: dateStr, category: cat,
          amount: String(Math.round(amounts[cat])),
          description: `${cat} expense on ${dateStr}`,
        });
        expCount++;
      }
    }
    console.log(`  ✓ Created ${expCount} expenses for student 1`);
  }

  // ── Student meal records ──────────────────────────────────────────────────
  const existingMeals = await db.select().from(mealRecordsTable).where(eq(mealRecordsTable.studentId, student1.id)).limit(1);
  if (existingMeals.length === 0) {
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      await db.insert(mealRecordsTable).values({
        studentId: student1.id,
        date: d.toISOString().split("T")[0],
        morningMeal: Math.random() > 0.2,
        eveningMeal: Math.random() > 0.15,
      });
    }
    console.log("  ✓ Created meal records");
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  const existingNotifs = await db.select().from(notificationsTable).where(eq(notificationsTable.userId, student1User.id)).limit(1);
  if (existingNotifs.length === 0) {
    await db.insert(notificationsTable).values([
      {
        userId: student1User.id, type: "budget_alert", isRead: false,
        title: "Budget Warning", message: "You have used 75% of your monthly budget.",
      },
      {
        userId: student1User.id, type: "unusual_spending", isRead: false,
        title: "Unusual Spending Detected", message: "Your food spending is 40% higher than last month.",
      },
      {
        userId: ownerUser.id, type: "payment_overdue", isRead: false,
        title: "Overdue Payments", message: "3 customers have outstanding payments this month.",
      },
      {
        userId: ownerUser.id, type: "churn_risk", isRead: false,
        title: "Churn Risk Alert", message: "Ananya Gupta hasn't attended meals in 7 days.",
      },
    ]);
    console.log("  ✓ Created notifications");
  }

  console.log("\n✅ Seeding complete!");
  console.log("\n📋 Demo credentials:");
  console.log("  Student: arjun@example.com / password123");
  console.log("  Owner:   ramesh@tiffin.com / password123");
  console.log("  Student: priya@example.com / password123");
}

seed().then(() => process.exit(0)).catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
