import React from "react";
import { useGetStudentDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, AlertCircle, TrendingUp, IndianRupee, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function StudentDashboard() {
  const { data: dashboard, isLoading, error } = useGetStudentDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load dashboard data.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts section */}
      {dashboard.alerts && dashboard.alerts.length > 0 && (
        <div className="space-y-2">
          {dashboard.alerts.map(alert => (
            <Alert key={alert.id} variant={alert.severity === 'danger' ? 'destructive' : 'default'} className={alert.severity === 'warning' ? 'border-yellow-500 text-yellow-800 bg-yellow-50 dark:bg-yellow-950/20 dark:text-yellow-400' : ''}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="capitalize">{alert.type.replace('_', ' ')}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Budget</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{dashboard.monthlyBudget.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Amount Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{dashboard.amountSpent.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {dashboard.monthlyBudget > 0 ? ((dashboard.amountSpent / dashboard.monthlyBudget) * 100).toFixed(1) : 0}% of budget
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining Budget</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${dashboard.remainingBudget < 0 ? 'text-destructive' : ''}`}>
              ₹{dashboard.remainingBudget.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Risk Score</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.budgetRiskScore}/100</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.recentExpenses && dashboard.recentExpenses.length > 0 ? (
              <div className="space-y-4">
                {dashboard.recentExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium capitalize">{expense.category}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(expense.date).toLocaleDateString()}
                        {expense.description && ` • ${expense.description}`}
                      </div>
                    </div>
                    <div className="font-semibold">₹{expense.amount.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-8 text-center">No recent expenses found.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
