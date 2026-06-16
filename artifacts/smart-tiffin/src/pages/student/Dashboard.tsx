import React, { useMemo } from "react";
import { useLocation } from "wouter";
import {
  useGetStudentDashboard,
  useGetMealSummary,
  useGetExpenseSummary,
  useGetStudentInsights,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  IndianRupee, TrendingUp, TrendingDown, ShieldAlert, Utensils,
  Plus, BarChart3, Target, Lightbulb, Sun, Moon,
  ShoppingBag, Bus, BookOpen, Film, Stethoscope, UtensilsCrossed,
  ChevronRight, Wallet, Flame,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) { return `₹${n.toLocaleString("en-IN")}`; }

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const CATEGORY_COLORS: Record<string, string> = {
  food: "#f59e0b", transport: "#0ea5e9", education: "#10b981",
  entertainment: "#8b5cf6", shopping: "#ec4899", medical: "#ef4444", other: "#6b7280",
};
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  food: UtensilsCrossed, transport: Bus, education: BookOpen,
  entertainment: Film, shopping: ShoppingBag, medical: Stethoscope, other: Flame,
};

// ── sub-components ────────────────────────────────────────────────────────────
function QuickAction({
  icon: Icon, label, sub, color, onClick,
}: { icon: React.ElementType; label: string; sub: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors w-full text-center">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-xs font-medium leading-tight">{label}</span>
      <span className="text-[10px] text-muted-foreground leading-tight">{sub}</span>
    </button>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, iconBg, trend,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  iconBg: string; trend?: "up" | "down" | null;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-lg leading-tight">{value}</p>
            {trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-destructive" />}
            {trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-green-500" />}
          </div>
          {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const [, navigate] = useLocation();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { data: dash, isLoading } = useGetStudentDashboard();
  const { data: meals } = useGetMealSummary({ month, year });
  const { data: summary } = useGetExpenseSummary({ month, year });
  // Match staleTime with Analytics.tsx so both share the same cache options
  const { data: rawInsights } = useGetStudentInsights({ query: { staleTime: 60_000 } });

  const uniqueInsights = useMemo(() => {
    if (!rawInsights) return [];
    const seenIds = new Set<string>();
    const seenMessages = new Set<string>();
    return rawInsights.filter(ins => {
      const msgKey = ins.message.trim().toLowerCase();
      if (seenIds.has(ins.id) || seenMessages.has(msgKey)) return false;
      seenIds.add(ins.id);
      seenMessages.add(msgKey);
      return true;
    });
  }, [rawInsights]);

  const budgetPct = dash && dash.monthlyBudget > 0
    ? Math.min(100, Math.round((dash.amountSpent / dash.monthlyBudget) * 100))
    : 0;
  const barColor = budgetPct >= 90 ? "bg-destructive" : budgetPct >= 75 ? "bg-amber-400" : "bg-primary";
  const mealRate = meals && meals.daysTracked > 0
    ? Math.round((meals.totalMeals / (meals.daysTracked * 2)) * 100) : 0;

  const monthName = now.toLocaleString("en-IN", { month: "long" });
  const dateLabel = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-64 rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-3">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting()}! 👋</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{dateLabel} · {monthName} overview</p>
      </div>

      {/* Insights */}
      {uniqueInsights.length > 0 && (
        <div className="space-y-2">
          {uniqueInsights.slice(0, 2).map(ins => (
            <Alert key={ins.id} className={
              ins.severity === "danger"  ? "border-destructive/50 bg-destructive/5 py-2" :
              ins.severity === "warning" ? "border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 py-2" :
                                          "border-blue-500/50 bg-blue-50 dark:bg-blue-950/20 py-2"
            }>
              <Lightbulb className={`h-4 w-4 ${ins.severity === "danger" ? "text-destructive" : ins.severity === "warning" ? "text-yellow-600" : "text-blue-600"}`} />
              <AlertDescription className="text-sm">{ins.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Budget progress */}
      {dash && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Monthly Budget</p>
                <p className="font-bold text-xl">{fmt(dash.monthlyBudget)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Spent</p>
                <p className={`font-bold text-xl ${budgetPct >= 90 ? "text-destructive" : budgetPct >= 75 ? "text-amber-600" : "text-foreground"}`}>
                  {fmt(dash.amountSpent)}
                </p>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${budgetPct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="font-medium">{budgetPct}% used</span>
              <span className={dash.remainingBudget < 0 ? "text-destructive font-medium" : "text-green-600 font-medium"}>
                {dash.remainingBudget < 0 ? `${fmt(Math.abs(dash.remainingBudget))} over` : `${fmt(dash.remainingBudget)} left`}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Quick Actions</p>
        <div className="grid grid-cols-4 gap-2">
          <QuickAction icon={Plus} label="Add Expense" sub="Log spending" color="bg-primary/10 text-primary" onClick={() => navigate("/student/expenses")} />
          <QuickAction icon={Utensils} label="Log Meal" sub="Today's meal" color="bg-amber-100 text-amber-600" onClick={() => navigate("/student/meals")} />
          <QuickAction icon={Target} label="Budget" sub="Set & track" color="bg-green-100 text-green-600" onClick={() => navigate("/student/budgets")} />
          <QuickAction icon={BarChart3} label="Analytics" sub="Full report" color="bg-purple-100 text-purple-600" onClick={() => navigate("/student/analytics")} />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          icon={Utensils} label="Meals This Month" iconBg="bg-amber-100 text-amber-600"
          value={meals ? String(meals.totalMeals) : "—"}
          sub={meals ? `${mealRate}% attendance` : undefined}
        />
        <KpiCard
          icon={Wallet} label="Daily Average" iconBg="bg-blue-100 text-blue-600"
          value={summary ? fmt(Math.round(summary.dailyAverage)) : "—"}
          sub={summary ? `over ${summary.daysInMonth} days` : undefined}
        />
        <KpiCard
          icon={IndianRupee} label="Savings" iconBg="bg-green-100 text-green-600"
          value={dash ? fmt(Math.max(0, Math.round(dash.savings))) : "—"}
          sub="projected this month"
          trend={dash && dash.savings < 0 ? "up" : null}
        />
        <KpiCard
          icon={ShieldAlert} label="Budget Risk" iconBg="bg-red-100 text-red-600"
          value={dash ? `${dash.budgetRiskScore}/100` : "—"}
          sub={dash && dash.budgetRiskScore > 70 ? "⚠ review spending" : "looking good"}
        />
      </div>

      {/* Meal attendance + Top category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Meal mini card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Utensils className="w-4 h-4 text-primary" /> Meal Attendance
              <Badge variant="secondary" className="ml-auto text-xs">{monthName}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!meals || meals.daysTracked === 0 ? (
              <p className="text-sm text-muted-foreground py-3">No meal records yet.</p>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold">{mealRate}%</span>
                  <span className="text-xs text-muted-foreground mb-1">attendance</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${mealRate}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Sun className="w-3 h-3 text-amber-500" />{meals.totalMorning} morning</span>
                  <span className="flex items-center gap-1"><Moon className="w-3 h-3 text-blue-500" />{meals.totalEvening} evening</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top spending categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Top Categories
              <Badge variant="secondary" className="ml-auto text-xs">{monthName}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!summary?.byCategory?.length ? (
              <p className="text-sm text-muted-foreground py-3">No expenses yet.</p>
            ) : (
              <div className="space-y-2">
                {summary.byCategory.slice(0, 4).map(c => {
                  const Icon = CATEGORY_ICONS[c.category] ?? Flame;
                  return (
                    <div key={c.category} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[c.category] ?? "#6b7280" }} />
                      <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-xs capitalize flex-1 text-muted-foreground">{c.category}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${c.percentage}%`, background: CATEGORY_COLORS[c.category] ?? "#6b7280" }} />
                      </div>
                      <span className="text-xs font-medium w-14 text-right">{fmt(c.amount)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent expenses */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Recent Expenses</CardTitle>
            <button onClick={() => navigate("/student/expenses")}
              className="text-xs text-primary flex items-center gap-0.5 hover:underline">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {!dash?.recentExpenses?.length ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No expenses yet.{" "}
              <button onClick={() => navigate("/student/expenses")} className="text-primary hover:underline">
                Add your first one
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {dash.recentExpenses.slice(0, 6).map(exp => {
                const Icon = CATEGORY_ICONS[exp.category] ?? Flame;
                const color = CATEGORY_COLORS[exp.category] ?? "#6b7280";
                return (
                  <div key={exp.id} className="flex items-center gap-3 py-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${color}20` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{exp.description ?? exp.category}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(exp.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        {" · "}
                        <span className="capitalize">{exp.category}</span>
                      </p>
                    </div>
                    <span className="text-sm font-semibold shrink-0">{fmt(exp.amount)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
