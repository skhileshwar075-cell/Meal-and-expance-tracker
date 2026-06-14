import React, { useState } from "react";
import {
  useGetSpendingTrend,
  useGetStudentScores,
  useGetStudentInsights,
  useGetExpenseSummary,
  useGetExpensePatterns,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { AlertCircle, TrendingUp, TrendingDown, Shield, Target, Lightbulb } from "lucide-react";

const COLORS = ["#0ea5e9", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#ec4899", "#14b8a6"];

const CATEGORY_COLORS: Record<string, string> = {
  food: "#f59e0b", transport: "#0ea5e9", education: "#10b981",
  entertainment: "#8b5cf6", shopping: "#ec4899", medical: "#ef4444", other: "#6b7280",
};

function ScoreGauge({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="text-center space-y-2">
      <div className="relative inline-flex items-center justify-center">
        <svg width="96" height="96" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
          <circle
            cx="48" cy="48" r="40" fill="none" strokeWidth="8"
            stroke={color}
            strokeDasharray={`${(value / 100) * 251.2} 251.2`}
            strokeLinecap="round"
            style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
          />
          <text x="48" y="52" textAnchor="middle" fontSize="18" fontWeight="700" fill="currentColor">{value}</text>
        </svg>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function Analytics() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const now = new Date();

  const { data: trend, isLoading: loadingTrend } = useGetSpendingTrend({ period, months: 6 });
  const { data: scores, isLoading: loadingScores } = useGetStudentScores();
  const { data: insights } = useGetStudentInsights();
  const { data: summary } = useGetExpenseSummary({ month: now.getMonth() + 1, year: now.getFullYear() });
  const { data: patterns } = useGetExpensePatterns();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Financial insights and spending patterns</p>
      </div>

      {/* Smart Insights */}
      {insights && insights.length > 0 && (
        <div className="space-y-2">
          {insights.map(ins => (
            <Alert key={ins.id} className={
              ins.severity === "danger" ? "border-destructive/50 bg-destructive/5" :
              ins.severity === "warning" ? "border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20" :
              "border-blue-500/50 bg-blue-50 dark:bg-blue-950/20"
            }>
              <Lightbulb className={`h-4 w-4 ${ins.severity === "danger" ? "text-destructive" : ins.severity === "warning" ? "text-yellow-600" : "text-blue-600"}`} />
              <AlertDescription className="text-sm">{ins.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Score Cards */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Financial Scores</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingScores ? (
            <div className="flex justify-around"><Skeleton className="h-24 w-24 rounded-full" /><Skeleton className="h-24 w-24 rounded-full" /><Skeleton className="h-24 w-24 rounded-full" /></div>
          ) : scores ? (
            <div className="flex flex-wrap justify-around gap-6">
              <ScoreGauge value={scores.budgetRiskScore} label="Budget Risk" color={scores.budgetRiskScore > 80 ? "#ef4444" : scores.budgetRiskScore > 60 ? "#f59e0b" : "#10b981"} />
              <ScoreGauge value={scores.financialDisciplineScore} label="Discipline" color="#0ea5e9" />
              <ScoreGauge value={scores.savingsRate} label="Savings Rate" color="#10b981" />
            </div>
          ) : null}
          {scores && (
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                {scores.expenseGrowthRate > 0 ? <TrendingUp className="w-4 h-4 text-destructive" /> : <TrendingDown className="w-4 h-4 text-green-500" />}
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
                  <p className="text-sm font-semibold">₹{Math.round(scores.savingsAmount ?? 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spending Trend Chart */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Spending Trend</CardTitle>
            <div className="flex gap-1">
              {(["daily","weekly","monthly"] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTrend ? <Skeleton className="h-48 w-full" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend?.data ?? []} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={v => `₹${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} />
                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, "Spent"]} />
                <Line type="monotone" dataKey="amount" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Spending by Category</CardTitle></CardHeader>
          <CardContent>
            {summary?.byCategory && summary.byCategory.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={summary.byCategory} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={70} label={({ name, percentage }) => `${name} ${percentage}%`} labelLine={false} fontSize={11}>
                      {summary.byCategory.map((entry, i) => (
                        <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] ?? COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {summary.byCategory.map((c, i) => (
                    <div key={c.category} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: CATEGORY_COLORS[c.category] ?? COLORS[i % COLORS.length] }} />
                        <span className="capitalize">{c.category}</span>
                      </span>
                      <span className="font-medium">₹{c.amount.toLocaleString()} <span className="text-muted-foreground">({c.percentage}%)</span></span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No expense data for this month.</p>}
          </CardContent>
        </Card>

        {/* Weekly Pattern */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Day-of-Week Pattern</CardTitle></CardHeader>
          <CardContent>
            {patterns?.weeklyPattern ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={patterns.weeklyPattern} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                  <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, "Spent"]} />
                  <Bar dataKey="amount" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Skeleton className="h-48 w-full" />}
          </CardContent>
        </Card>
      </div>

      {/* Recurring Expenses */}
      {patterns?.recurringExpenses && patterns.recurringExpenses.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Recurring Expenses</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {patterns.recurringExpenses.map(r => (
                <div key={r.category} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[r.category] ?? "#6b7280" }} />
                    <span className="text-sm font-medium capitalize">{r.category}</span>
                    <Badge variant="secondary" className="text-xs">{r.frequency}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">₹{r.averageAmount.toLocaleString()}<span className="text-muted-foreground text-xs">/avg</span></p>
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
