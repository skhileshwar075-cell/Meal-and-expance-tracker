import React, { useState, useMemo } from "react";
import {
  useGetSpendingTrend,
  useGetStudentScores,
  useGetStudentInsights,
  useGetExpenseSummary,
  useGetExpensePatterns,
  useGetMealSummary,
  useListBudgets,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  AlertCircle, TrendingUp, TrendingDown, Target, Lightbulb,
  ChevronLeft, ChevronRight, Download, Utensils, Wallet,
  Sun, Moon, Calendar, BarChart3, Flame,
} from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  food: "#f59e0b", transport: "#0ea5e9", education: "#10b981",
  entertainment: "#8b5cf6", shopping: "#ec4899", medical: "#ef4444", other: "#6b7280",
};
const COLORS = ["#0ea5e9", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#ec4899", "#14b8a6"];

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ─── Helpers ───────────────────────────────────────────────────────────────
function fmtAmt(v: number) {
  return `₹${v.toLocaleString("en-IN")}`;
}

function exportCSV(
  summary: { byCategory: { category: string; amount: number; count: number; percentage: number }[] } | undefined,
  month: number, year: number
) {
  if (!summary?.byCategory?.length) return;
  const rows = [
    ["Category", "Amount (₹)", "Transactions", "% of Total"],
    ...summary.byCategory.map(c => [c.category, c.amount, c.count, c.percentage]),
  ];
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `expenses-${year}-${String(month).padStart(2, "0")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components ────────────────────────────────────────────────────────
function ScoreGauge({ value, label, color }: { value: number; label: string; color: string }) {
  const circumference = 251.2;
  const filled = (value / 100) * circumference;
  return (
    <div className="text-center space-y-1">
      <div className="relative inline-flex items-center justify-center">
        <svg width="96" height="96" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
          <circle cx="48" cy="48" r="40" fill="none" strokeWidth="8" stroke={color}
            strokeDasharray={`${filled} ${circumference}`} strokeLinecap="round"
            style={{ transform: "rotate(-90deg)", transformOrigin: "center" }} />
          <text x="48" y="52" textAnchor="middle" fontSize="18" fontWeight="700" fill="currentColor">{value}</text>
        </svg>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, sub, iconBg,
}: { icon: React.ElementType; label: string; value: string; sub?: string; iconBg: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="font-bold text-foreground leading-tight">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Month picker ──────────────────────────────────────────────────────────
function MonthPicker({
  month, year, onChange,
}: { month: number; year: number; onChange: (m: number, y: number) => void }) {
  const now = new Date();
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  function prev() {
    if (month === 1) onChange(12, year - 1);
    else onChange(month - 1, year);
  }
  function next() {
    if (isCurrentMonth) return;
    if (month === 12) onChange(1, year + 1);
    else onChange(month + 1, year);
  }

  // Build year options: current year and 2 past years
  const yearOptions = [year - 2, year - 1, year].filter(y => y >= 2024);

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={prev}>
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-1.5">
        <Select value={String(month)} onValueChange={v => onChange(Number(v), year)}>
          <SelectTrigger className="h-8 w-32 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={v => onChange(month, Number(v))}>
          <SelectTrigger className="h-8 w-20 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" size="icon" className="h-8 w-8" onClick={next} disabled={isCurrentMonth}>
        <ChevronRight className="w-4 h-4" />
      </Button>

      {!isCurrentMonth && (
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
          onClick={() => onChange(now.getMonth() + 1, now.getFullYear())}>
          Today
        </Button>
      )}
    </div>
  );
}

// ─── Budget vs Actual ──────────────────────────────────────────────────────
function BudgetCard({
  month, year, totalSpent,
}: { month: number; year: number; totalSpent: number }) {
  const { data: budgets } = useListBudgets();

  const budget = useMemo(
    () => budgets?.find(b => b.month === month && b.year === year),
    [budgets, month, year]
  );

  if (!budget) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> Budget vs Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-2">
            No budget set for {MONTH_NAMES[month - 1]} {year}.
          </p>
        </CardContent>
      </Card>
    );
  }

  const limit = Number(budget.monthlyAmount);
  const pct = Math.min(100, Math.round((totalSpent / limit) * 100));
  const remaining = Math.max(0, limit - totalSpent);
  const over = totalSpent > limit;
  const alertThreshold = Number(budget.alertThreshold ?? 80);
  const barColor = over ? "bg-destructive" : pct >= alertThreshold ? "bg-amber-400" : "bg-primary";
  const textColor = over ? "text-destructive" : pct >= alertThreshold ? "text-amber-600" : "text-primary";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" /> Budget vs Actual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Spent</span>
          <span className={`font-bold ${textColor}`}>{fmtAmt(totalSpent)}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{pct}% of {fmtAmt(limit)}</span>
          {over
            ? <span className="text-destructive font-medium">{fmtAmt(totalSpent - limit)} over budget</span>
            : <span className="text-green-600 font-medium">{fmtAmt(remaining)} remaining</span>}
        </div>
        {budget.weeklyAmount && (
          <div className="pt-1 border-t text-xs text-muted-foreground flex justify-between">
            <span>Weekly limit</span>
            <span className="font-medium text-foreground">{fmtAmt(Number(budget.weeklyAmount))}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Meal summary card ─────────────────────────────────────────────────────
function MealSummaryCard({ month, year }: { month: number; year: number }) {
  const { data: meal, isLoading } = useGetMealSummary({ month, year });

  if (isLoading) return <Card><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>;

  const maxSlots = meal ? meal.daysTracked * 2 : 1;
  const mRate = meal && maxSlots > 0 ? Math.round((meal.totalMeals / maxSlots) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Utensils className="w-4 h-4 text-primary" /> Meal Attendance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!meal || meal.daysTracked === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No meal records for this month.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-foreground">{mRate}%</span>
              <span className="text-xs text-muted-foreground mb-1">attendance rate</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${mRate}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-amber-500 mb-0.5">
                  <Sun className="w-3.5 h-3.5" />
                </div>
                <p className="text-sm font-semibold">{meal.totalMorning}</p>
                <p className="text-[10px] text-muted-foreground">Morning</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-blue-500 mb-0.5">
                  <Moon className="w-3.5 h-3.5" />
                </div>
                <p className="text-sm font-semibold">{meal.totalEvening}</p>
                <p className="text-[10px] text-muted-foreground">Evening</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-primary mb-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <p className="text-sm font-semibold">{meal.daysTracked}</p>
                <p className="text-[10px] text-muted-foreground">Days tracked</p>
              </div>
            </div>
            {meal.averageMealsPerDay != null && (
              <div className="text-xs text-muted-foreground text-center border-t pt-2">
                Avg <span className="font-medium text-foreground">{Number(meal.averageMealsPerDay).toFixed(1)}</span> meals/day
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function Analytics() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [trendPeriod, setTrendPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");

  const { data: trend, isLoading: loadingTrend } = useGetSpendingTrend({ period: trendPeriod, months: 6 });
  const { data: scores, isLoading: loadingScores } = useGetStudentScores();
  const { data: insights } = useGetStudentInsights();
  const { data: summary, isLoading: loadingSummary } = useGetExpenseSummary({ month, year });
  const { data: patterns } = useGetExpensePatterns();

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const totalSpent = summary?.total ?? 0;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Financial insights and spending patterns</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
          <Button
            variant="outline" size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => exportCSV(summary, month, year)}
            disabled={!summary?.byCategory?.length}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Past month badge */}
      {!isCurrentMonth && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
          <Calendar className="w-4 h-4 shrink-0" />
          Viewing past data for <span className="font-semibold text-foreground">{monthLabel}</span>
        </div>
      )}

      {/* Insights */}
      {insights && insights.length > 0 && (
        <div className="space-y-2">
          {insights.map(ins => (
            <Alert key={ins.id} className={
              ins.severity === "danger"  ? "border-destructive/50 bg-destructive/5" :
              ins.severity === "warning" ? "border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20" :
                                          "border-blue-500/50 bg-blue-50 dark:bg-blue-950/20"
            }>
              <Lightbulb className={`h-4 w-4 ${ins.severity === "danger" ? "text-destructive" : ins.severity === "warning" ? "text-yellow-600" : "text-blue-600"}`} />
              <AlertDescription className="text-sm">{ins.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Summary stat cards */}
      {loadingSummary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Wallet} label="Total Spent" iconBg="bg-primary/10 text-primary"
            value={fmtAmt(totalSpent)}
            sub={monthLabel}
          />
          <StatCard
            icon={BarChart3} label="Daily Average" iconBg="bg-blue-100 text-blue-600"
            value={summary ? fmtAmt(Math.round(summary.dailyAverage)) : "—"}
            sub={`over ${summary?.daysInMonth ?? "—"} days`}
          />
          <StatCard
            icon={TrendingUp} label="Top Category" iconBg="bg-amber-100 text-amber-600"
            value={summary?.topCategory ? summary.topCategory.charAt(0).toUpperCase() + summary.topCategory.slice(1) : "—"}
            sub={summary?.byCategory?.[0] ? `${fmtAmt(summary.byCategory[0].amount)}` : undefined}
          />
          <StatCard
            icon={Flame} label="Categories" iconBg="bg-green-100 text-green-600"
            value={String(summary?.byCategory?.length ?? 0)}
            sub="tracked this month"
          />
        </div>
      )}

      {/* Budget + Meal side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BudgetCard month={month} year={year} totalSpent={totalSpent} />
        <MealSummaryCard month={month} year={year} />
      </div>

      {/* Spending Trend */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Spending Trend</CardTitle>
            <div className="flex gap-1 bg-muted rounded-md p-0.5">
              {(["daily", "weekly", "monthly"] as const).map(p => (
                <button key={p} onClick={() => setTrendPeriod(p)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${trendPeriod === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTrend ? <Skeleton className="h-52 w-full" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend?.data ?? []} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} />
                <Tooltip formatter={(v: number) => [fmtAmt(v), "Spent"]} />
                <Line type="monotone" dataKey="amount" stroke="hsl(184 90% 25%)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
          <p className="text-xs text-muted-foreground text-center mt-2">Showing last 6 months of {trendPeriod} spending</p>
        </CardContent>
      </Card>

      {/* Category Breakdown + Day-of-week */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Spending by Category</CardTitle>
              <span className="text-xs text-muted-foreground">{monthLabel}</span>
            </div>
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-52 w-full" /> :
             summary?.byCategory && summary.byCategory.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={summary.byCategory} dataKey="amount" nameKey="category"
                      cx="50%" cy="50%" outerRadius={72} innerRadius={32}
                      paddingAngle={2}>
                      {summary.byCategory.map((entry, i) => (
                        <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] ?? COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmtAmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-1">
                  {summary.byCategory.map((c, i) => (
                    <div key={c.category} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: CATEGORY_COLORS[c.category] ?? COLORS[i % COLORS.length] }} />
                      <span className="capitalize flex-1 text-muted-foreground">{c.category}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${c.percentage}%`, background: CATEGORY_COLORS[c.category] ?? COLORS[i % COLORS.length] }} />
                      </div>
                      <span className="font-medium w-16 text-right">{fmtAmt(c.amount)}</span>
                      <span className="text-muted-foreground w-8 text-right">{c.percentage}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No expense data for {monthLabel}.</p>
            )}
          </CardContent>
        </Card>

        {/* Day-of-week Pattern */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Day-of-Week Pattern</CardTitle>
          </CardHeader>
          <CardContent>
            {patterns?.weeklyPattern ? (
              <>
                <ResponsiveContainer width="100%" height={195}>
                  <BarChart data={patterns.weeklyPattern} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <Tooltip formatter={(v: number) => [fmtAmt(v), "Avg spent"]} />
                    <Bar dataKey="amount" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground text-center mt-1">Average spending by day of week (all time)</p>
              </>
            ) : <Skeleton className="h-48 w-full" />}
          </CardContent>
        </Card>
      </div>

      {/* Financial Scores */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Financial Health Scores</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingScores ? (
            <div className="flex justify-around">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 w-24 rounded-full" />)}
            </div>
          ) : scores ? (
            <>
              <div className="flex flex-wrap justify-around gap-6">
                <ScoreGauge value={scores.budgetRiskScore} label="Budget Risk"
                  color={scores.budgetRiskScore > 80 ? "#ef4444" : scores.budgetRiskScore > 60 ? "#f59e0b" : "#10b981"} />
                <ScoreGauge value={scores.financialDisciplineScore} label="Discipline" color="#0ea5e9" />
                <ScoreGauge value={scores.savingsRate} label="Savings Rate" color="#10b981" />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  {scores.expenseGrowthRate > 0
                    ? <TrendingUp className="w-4 h-4 text-destructive" />
                    : <TrendingDown className="w-4 h-4 text-green-500" />}
                  <div>
                    <p className="text-xs text-muted-foreground">Expense Growth</p>
                    <p className={`text-sm font-semibold ${scores.expenseGrowthRate > 0 ? "text-destructive" : "text-green-600"}`}>
                      {scores.expenseGrowthRate > 0 ? "+" : ""}{scores.expenseGrowthRate}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Savings Amount</p>
                    <p className="text-sm font-semibold">{fmtAmt(Math.round(scores.savingsAmount ?? 0))}</p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* Recurring Expenses */}
      {patterns?.recurringExpenses && patterns.recurringExpenses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recurring Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {patterns.recurringExpenses.map(r => (
                <div key={r.category} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[r.category] ?? "#6b7280" }} />
                    <span className="text-sm font-medium capitalize">{r.category}</span>
                    <Badge variant="secondary" className="text-xs">{r.frequency}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{fmtAmt(r.averageAmount)}<span className="text-muted-foreground text-xs">/avg</span></p>
                    <p className="text-xs text-muted-foreground">{r.count} entries</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
