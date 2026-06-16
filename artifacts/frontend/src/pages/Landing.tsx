import React, { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import {
  Wallet,
  PieChart,
  Calendar,
  TrendingUp,
  Users,
  Receipt,
  CreditCard,
  Bell,
  Utensils,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Animated counter ──────────────────────────────────────────────────────
function AnimatedCounter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (inView) motionVal.set(to);
  }, [inView, to, motionVal]);

  useEffect(() => {
    return spring.on("change", (v) =>
      setDisplay(Math.round(v).toLocaleString("en-IN"))
    );
  }, [spring]);

  return <span ref={ref}>{display}{suffix}</span>;
}

// ─── Fade-up wrapper ───────────────────────────────────────────────────────
function FadeUp({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Feature card ──────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon,
  title,
  desc,
  accent,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  accent: string;
  delay?: number;
}) {
  return (
    <FadeUp delay={delay}>
      <div className="h-full rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </FadeUp>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────
function StepCard({
  step,
  title,
  desc,
  isLast,
  delay,
}: {
  step: string;
  title: string;
  desc: string;
  isLast?: boolean;
  delay?: number;
}) {
  return (
    <FadeUp delay={delay} className="flex gap-5">
      <div className="shrink-0 flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
          {step}
        </div>
        {!isLast && <div className="flex-1 w-px bg-border mt-2 min-h-[2.5rem]" />}
      </div>
      <div className={isLast ? "pb-0" : "pb-8"}>
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </FadeUp>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Utensils className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight text-primary">SmartTiffin</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features"     className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#for-owners"   className="hover:text-foreground transition-colors">For Owners</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Get started
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-28 overflow-hidden">
        {/* glow blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, hsl(184 90% 25% / 0.12), transparent)" }} />
        <div aria-hidden className="pointer-events-none absolute top-0 right-0 w-[600px] h-[600px] opacity-40"
          style={{ background: "radial-gradient(circle at 80% 20%, hsl(184 90% 25% / 0.12), transparent 60%)" }} />
        {/* dot grid */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "radial-gradient(circle, hsl(222 47% 11%) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">

            {/* Left — copy */}
            <div className="flex-1 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-6"
              >
                <Star className="w-3 h-3 fill-primary" />
                Built for Indian students &amp; tiffin businesses
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.08 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter leading-[1.05] text-foreground mb-6"
              >
                Track meals.
                <br />Manage money.
                <br /><span className="text-primary">Run your tiffin.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.18 }}
                className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0 mb-10 leading-relaxed"
              >
                SmartTiffin connects students and home tiffin owners on one
                platform — expense tracking, meal attendance, billing and
                payments, all in one clean dashboard.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.28 }}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
              >
                <Link href="/register?role=student">
                  <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground gap-2 px-7">
                    I'm a Student <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/register?role=owner">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 px-7">
                    I'm a Tiffin Owner <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs text-muted-foreground"
              >
                {["Free to get started", "No credit card", "Instant access"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />{t}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Right — mock dashboard */}
            <div className="flex-1 w-full max-w-md lg:max-w-none relative hidden lg:block">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                {/* dashboard card */}
                <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
                  {/* mock browser bar */}
                  <div className="h-10 border-b border-border bg-muted/40 flex items-center px-4 gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400/50" />
                    <div className="ml-2 text-xs text-muted-foreground font-mono">smarttiffin / owner / dashboard</div>
                  </div>

                  <div className="p-5 flex gap-4">
                    {/* mock sidebar */}
                    <div className="w-28 shrink-0 flex flex-col gap-1.5">
                      {["Dashboard", "Customers", "Billing", "Payments", "Analytics"].map((item, i) => (
                        <div key={item} className={`rounded-md px-2 py-1.5 text-xs flex items-center gap-2 ${i === 0 ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground"}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-primary-foreground" : "bg-muted-foreground/40"}`} />
                          {item}
                        </div>
                      ))}
                    </div>

                    {/* mock main area */}
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Collection",   val: "₹24,800", color: "text-primary" },
                          { label: "Outstanding",  val: "₹8,640",  color: "text-amber-600" },
                          { label: "Customers",    val: "10",       color: "text-foreground" },
                          { label: "Rate",         val: "87%",      color: "text-green-600" },
                        ].map((s) => (
                          <div key={s.label} className="rounded-lg border border-border bg-background p-2.5">
                            <div className="text-[10px] text-muted-foreground">{s.label}</div>
                            <div className={`font-bold text-sm ${s.color}`}>{s.val}</div>
                          </div>
                        ))}
                      </div>

                      {/* mock bar chart */}
                      <div className="rounded-lg border border-border bg-background p-3">
                        <div className="text-[10px] text-muted-foreground mb-2">Monthly Billing</div>
                        <div className="flex items-end gap-1 h-12">
                          {[65, 82, 58, 90, 72, 88, 45].map((h, i) => (
                            <div key={i} className="flex-1 rounded-sm bg-primary/10 relative overflow-hidden" style={{ height: "100%" }}>
                              <motion.div
                                className="absolute bottom-0 left-0 right-0 bg-primary rounded-sm"
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                transition={{ delay: 0.6 + i * 0.06, duration: 0.5, ease: "easeOut" }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* mock customer row */}
                      <div className="rounded-lg border border-border bg-background p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">AS</div>
                          <div>
                            <div className="text-[10px] font-medium">Arjun Sharma</div>
                            <div className="text-[9px] text-muted-foreground">Full Day · ₹2,850</div>
                          </div>
                        </div>
                        <div className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">Paid</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* floating student budget card */}
                <motion.div
                  initial={{ opacity: 0, x: -20, y: 10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="absolute -left-10 bottom-10 w-48 rounded-xl border border-border bg-card shadow-xl p-3.5"
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Wallet className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-xs font-semibold">June Budget</span>
                  </div>
                  <div className="text-lg font-bold text-foreground mb-1">
                    ₹5,760 <span className="text-xs font-normal text-muted-foreground">/ ₹8,000</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <motion.div className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }} animate={{ width: "72%" }}
                      transition={{ delay: 0.9, duration: 0.6 }} />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">72% used · ₹2,240 left</div>
                </motion.div>

                {/* floating payment chip */}
                <motion.div
                  initial={{ opacity: 0, x: 20, y: -10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ delay: 0.85, duration: 0.5 }}
                  className="absolute -right-6 top-14 rounded-xl border border-border bg-card shadow-xl p-3 w-44"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold">Payment received</div>
                      <div className="text-[10px] text-muted-foreground">Priya — ₹1,800 via UPI</div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: "Meals tracked daily", to: 1200, suffix: "+" },
              { label: "Active customers",    to: 850,  suffix: "+" },
              { label: "Bills generated",     to: 24000,suffix: "+" },
              { label: "Collection rate",     to: 94,   suffix: "%" },
            ].map((s, i) => (
              <FadeUp key={s.label} delay={i * 0.08}>
                <div className="text-3xl font-bold text-primary tabular-nums">
                  <AnimatedCounter to={s.to} suffix={s.suffix} />
                </div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Student Features ─────────────────────────────────────────────── */}
      <section id="features" className="py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <FadeUp className="text-center mb-4">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
            For Students
          </span>
        </FadeUp>
        <FadeUp delay={0.05} className="text-center mb-4">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Your money. Your meals. Your control.
          </h2>
        </FadeUp>
        <FadeUp delay={0.1} className="text-center mb-14">
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Built for hostel and PG students who want to stay on top of daily
            expenses, tiffin attendance and monthly budgets — all without spreadsheets.
          </p>
        </FadeUp>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FeatureCard icon={Wallet}     title="Expense Tracking"    desc="Log daily spends by category — food, transport, education and more. See exactly where your money goes."              accent="bg-primary/10 text-primary"    delay={0}    />
          <FeatureCard icon={PieChart}   title="Smart Budgets"       desc="Set monthly and weekly limits with custom alert thresholds. Get notified before you overspend."                    accent="bg-blue-100 text-blue-600"     delay={0.07} />
          <FeatureCard icon={Calendar}   title="Meal Attendance"     desc="Track which meals you've consumed each day. View your 30-day streak and attendance rate at a glance."              accent="bg-amber-100 text-amber-600"   delay={0.14} />
          <FeatureCard icon={TrendingUp} title="Spending Analytics"  desc="Month-over-month trends, category breakdowns and unusual-spending alerts help you spend smarter."                  accent="bg-green-100 text-green-600"   delay={0.21} />
        </div>

        {/* Bento — student */}
        <div className="mt-6 grid md:grid-cols-5 gap-4">
          <FadeUp delay={0.05} className="md:col-span-3">
            <div className="rounded-xl border border-border bg-card p-6 h-full">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-primary" />
                </div>
                <span className="font-semibold text-sm">Category breakdown — June</span>
              </div>
              <div className="space-y-3">
                {[
                  { cat: "Food",       pct: 44, color: "bg-primary",   amt: "₹3,520" },
                  { cat: "Transport",  pct: 18, color: "bg-blue-400",  amt: "₹1,440" },
                  { cat: "Education",  pct: 22, color: "bg-amber-400", amt: "₹1,760" },
                  { cat: "Shopping",   pct: 10, color: "bg-green-400", amt: "₹800"   },
                  { cat: "Other",      pct: 6,  color: "bg-slate-300", amt: "₹480"   },
                ].map((item) => (
                  <div key={item.cat} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-muted-foreground shrink-0">{item.cat}</div>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${item.color} rounded-full`}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${item.pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                      />
                    </div>
                    <div className="w-14 text-xs font-medium text-right">{item.amt}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.1} className="md:col-span-2 flex flex-col gap-4">
            <div className="rounded-xl border border-border bg-card p-5 flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
                <span className="font-semibold text-sm">Meal streak</span>
              </div>
              <div className="text-3xl font-bold mb-1">
                12 <span className="text-lg font-normal text-muted-foreground">days</span>
              </div>
              <div className="text-xs text-muted-foreground mb-3">Consecutive attendance 🔥</div>
              <div className="flex gap-1 flex-wrap">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div key={i} className={`w-5 h-5 rounded-sm text-[8px] flex items-center justify-center font-medium ${i < 12 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-amber-600" />
                </div>
                <span className="font-semibold text-sm">Budget alert</span>
              </div>
              <div className="text-sm text-muted-foreground mb-1">You've used</div>
              <div className="text-2xl font-bold text-amber-600 mb-2">72%</div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: "72%" }} />
              </div>
              <div className="text-[11px] text-muted-foreground mt-2">₹2,240 remaining in June budget</div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Owner Features ───────────────────────────────────────────────── */}
      <section
        id="for-owners"
        className="py-24 border-t border-border"
        style={{ background: "radial-gradient(ellipse 100% 60% at 50% 0%, hsl(184 90% 25% / 0.06), transparent 70%)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <FadeUp className="text-center mb-4">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
              For Tiffin Owners
            </span>
          </FadeUp>
          <FadeUp delay={0.05} className="text-center mb-4">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Run your kitchen like a business.
            </h2>
          </FadeUp>
          <FadeUp delay={0.1} className="text-center mb-14">
            <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Stop managing customers in WhatsApp groups and handwritten ledgers.
              SmartTiffin gives you a real operations dashboard built for home tiffin services.
            </p>
          </FadeUp>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <FeatureCard icon={Users}     title="Customer Management" desc="Full directory with plan types, status, joining dates and linked student profiles."                                   accent="bg-primary/10 text-primary"      delay={0}    />
            <FeatureCard icon={Calendar}  title="Daily Attendance"    desc="Mark morning and evening attendance for each customer. Data feeds directly into monthly billing."                    accent="bg-purple-100 text-purple-600"   delay={0.07} />
            <FeatureCard icon={Receipt}   title="Auto Billing"        desc="Bills generated from actual meals consumed × rate, with discounts and extra charges fully supported."               accent="bg-amber-100 text-amber-600"     delay={0.14} />
            <FeatureCard icon={CreditCard} title="Payment Tracking"   desc="Record cash, UPI and bank transfers. Track partial payments and outstanding balances per customer."                 accent="bg-green-100 text-green-600"     delay={0.21} />
          </div>

          {/* Bento — owner */}
          <div className="grid md:grid-cols-5 gap-4">
            <FadeUp delay={0.05} className="md:col-span-2 flex flex-col gap-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-semibold text-sm">SMS Reminders</span>
                </div>
                <div className="space-y-2.5">
                  {[
                    { name: "Rohit Kumar",  amt: "₹1,600", status: "Sent"    },
                    { name: "Neha Joshi",   amt: "₹2,850", status: "Sent"    },
                    { name: "Deepak Yadav", amt: "₹1,440", status: "Pending" },
                  ].map((r) => (
                    <div key={r.name} className="flex items-center justify-between text-xs">
                      <span>{r.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{r.amt}</span>
                        <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${r.status === "Sent" ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                          {r.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <Button size="sm" className="mt-4 w-full text-xs bg-primary hover:bg-primary/90 text-primary-foreground h-7">
                  Send all reminders
                </Button>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="font-semibold text-sm">Collection rate</span>
                </div>
                <div className="flex items-end gap-2">
                  <div className="text-3xl font-bold">87<span className="text-primary">%</span></div>
                  <div className="text-xs text-green-600 mb-1 flex items-center gap-1">
                    ↑ 5% <span className="text-muted-foreground ml-0.5">vs last month</span>
                  </div>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.1} className="md:col-span-3">
              <div className="rounded-xl border border-border bg-card p-6 h-full">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-semibold text-sm">Billing status — June 2026</span>
                </div>
                <div className="space-y-1">
                  {[
                    { name: "Arjun Sharma",  plan: "Full Day", total: "₹2,850", paid: "₹2,850", status: "paid"    },
                    { name: "Priya Verma",   plan: "Evening",  total: "₹1,620", paid: "₹810",   status: "partial" },
                    { name: "Vikram Singh",  plan: "Morning",  total: "₹1,350", paid: "₹1,350", status: "paid"    },
                    { name: "Neha Joshi",    plan: "Full Day", total: "₹2,700", paid: "₹0",     status: "unpaid"  },
                    { name: "Rohit Kumar",   plan: "Evening",  total: "₹1,560", paid: "₹0",     status: "unpaid"  },
                  ].map((row) => (
                    <div key={row.name} className="flex items-center justify-between text-xs py-2.5 border-b border-border last:border-0">
                      <div>
                        <div className="font-medium text-foreground">{row.name}</div>
                        <div className="text-muted-foreground">{row.plan}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <div className="font-medium">{row.paid}</div>
                          <div className="text-muted-foreground">of {row.total}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium capitalize min-w-[3.5rem] text-center ${
                          row.status === "paid"    ? "bg-green-50 text-green-700 border-green-200" :
                          row.status === "partial" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                     "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          {row.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <FadeUp>
                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20 mb-4">
                  How it works
                </span>
              </FadeUp>
              <FadeUp delay={0.05}>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-10">
                  Up and running in minutes.
                </h2>
              </FadeUp>
              <StepCard step="1" title="Create your account"       desc="Sign up as a student or tiffin owner. Takes 30 seconds — no credit card needed."                                                                                            delay={0.05} />
              <StepCard step="2" title="Connect to your service"   desc="Owners share a unique invite code. Students enter it to link their profile — attendance and billing then sync automatically."                                               delay={0.12} />
              <StepCard step="3" title="Manage everything in one place" desc="Mark attendance, generate bills from actual meals consumed, accept payments and track expenses — all in one clear dashboard." isLast delay={0.19} />
            </div>

            {/* Highlight pillars */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: ShieldCheck,  title: "Accurate billing",      desc: "Bills calculated from real attendance data — never estimate or guess again.",               accent: "bg-primary/10 text-primary"    },
                { icon: Smartphone,   title: "Works on any device",   desc: "Responsive design with a collapsible sidebar adapts from phone to widescreen.",              accent: "bg-purple-100 text-purple-600" },
                { icon: Bell,         title: "Payment reminders",     desc: "Send SMS reminders to customers with outstanding bills in a single click.",                  accent: "bg-amber-100 text-amber-600"  },
                { icon: BarChart3,    title: "Rich analytics",        desc: "Charts, trends and summaries for both students and owners to make smarter decisions.",        accent: "bg-green-100 text-green-600"  },
              ].map((item, i) => (
                <FadeUp key={item.title} delay={i * 0.08}>
                  <div className="rounded-xl border border-border bg-card p-5 h-full hover:-translate-y-1 transition-transform duration-300">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${item.accent}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24 border-t border-border relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 80% 70% at 50% 50%, hsl(184 90% 25% / 0.1), transparent)" }} />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <FadeUp>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Ready to take control?
            </h2>
          </FadeUp>
          <FadeUp delay={0.07}>
            <p className="text-muted-foreground text-base mb-10 leading-relaxed">
              Join students and tiffin owners who have already replaced their
              WhatsApp groups and paper ledgers with SmartTiffin.
            </p>
          </FadeUp>
          <FadeUp delay={0.14}>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link href="/register?role=student">
                <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground gap-2 px-8">
                  Start as Student <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/register?role=owner">
                <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 px-8">
                  Start as Tiffin Owner <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </FadeUp>
          <FadeUp delay={0.2}>
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
              {["Free to get started", "No credit card required", "Instant setup", "Demo data included"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />{t}
                </span>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Utensils className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-primary tracking-tight">SmartTiffin</span>
          </div>
          <div className="text-xs text-muted-foreground">
            © 2026 SmartTiffin. Built for students &amp; tiffin owners.
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/login"    className="hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
