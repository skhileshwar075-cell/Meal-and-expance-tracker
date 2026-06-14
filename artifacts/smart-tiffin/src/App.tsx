import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/lib/auth";
import "@/lib/api-client";

// Public pages
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";

// Student pages
import StudentDashboard from "@/pages/student/Dashboard";
import Expenses from "@/pages/student/Expenses";
import Budgets from "@/pages/student/Budgets";
import Meals from "@/pages/student/Meals";
import Analytics from "@/pages/student/Analytics";
import Connection from "@/pages/student/Connection";
import StudentSettings from "@/pages/student/Settings";

// Owner pages
import OwnerDashboard from "@/pages/owner/Dashboard";
import Customers from "@/pages/owner/Customers";
import Attendance from "@/pages/owner/Attendance";
import MealPlans from "@/pages/owner/MealPlans";
import Billing from "@/pages/owner/Billing";
import Payments from "@/pages/owner/Payments";
import OwnerAnalytics from "@/pages/owner/Analytics";
import OwnerSettings from "@/pages/owner/Settings";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, role, ...rest }: any) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (role && user?.role !== role) {
    return <Redirect to={user?.role === "student" ? "/student/dashboard" : "/owner/dashboard"} />;
  }

  return (
    <DashboardLayout>
      <Component {...rest} />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Student Routes */}
      <Route path="/student/dashboard">{() => <ProtectedRoute component={StudentDashboard} role="student" />}</Route>
      <Route path="/student/expenses">{() => <ProtectedRoute component={Expenses} role="student" />}</Route>
      <Route path="/student/budgets">{() => <ProtectedRoute component={Budgets} role="student" />}</Route>
      <Route path="/student/meals">{() => <ProtectedRoute component={Meals} role="student" />}</Route>
      <Route path="/student/analytics">{() => <ProtectedRoute component={Analytics} role="student" />}</Route>
      <Route path="/student/connection">{() => <ProtectedRoute component={Connection} role="student" />}</Route>
      <Route path="/student/settings">{() => <ProtectedRoute component={StudentSettings} role="student" />}</Route>

      {/* Owner Routes */}
      <Route path="/owner/dashboard">{() => <ProtectedRoute component={OwnerDashboard} role="owner" />}</Route>
      <Route path="/owner/customers">{() => <ProtectedRoute component={Customers} role="owner" />}</Route>
      <Route path="/owner/attendance">{() => <ProtectedRoute component={Attendance} role="owner" />}</Route>
      <Route path="/owner/meal-plans">{() => <ProtectedRoute component={MealPlans} role="owner" />}</Route>
      <Route path="/owner/billing">{() => <ProtectedRoute component={Billing} role="owner" />}</Route>
      <Route path="/owner/payments">{() => <ProtectedRoute component={Payments} role="owner" />}</Route>
      <Route path="/owner/analytics">{() => <ProtectedRoute component={OwnerAnalytics} role="owner" />}</Route>
      <Route path="/owner/settings">{() => <ProtectedRoute component={OwnerSettings} role="owner" />}</Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
