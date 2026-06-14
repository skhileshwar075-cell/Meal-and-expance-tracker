import React from "react";
import { useGetOwnerDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, AlertCircle, IndianRupee, PieChart, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function OwnerDashboard() {
  const { data: dashboard, isLoading, error } = useGetOwnerDashboard();

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.activeCustomers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Meals</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.todaysMeals}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{dashboard.monthlyRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(dashboard.collectionRate * 100).toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {dashboard.pendingPayments} pending payments
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.recentPayments && dashboard.recentPayments.length > 0 ? (
              <div className="space-y-4">
                {dashboard.recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium">{payment.customerName}</div>
                      <div className="text-xs text-muted-foreground">
                        {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'No date'}
                        <span className="capitalize ml-2 text-primary">{payment.status}</span>
                      </div>
                    </div>
                    <div className="font-semibold text-primary">₹{payment.amount.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-8 text-center">No recent payments.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
