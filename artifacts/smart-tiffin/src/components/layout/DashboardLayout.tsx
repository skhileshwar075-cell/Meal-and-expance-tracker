import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { 
  LayoutDashboard, 
  Wallet, 
  PieChart, 
  Calendar, 
  Settings, 
  LogOut, 
  Menu,
  Users,
  Utensils,
  Receipt,
  CreditCard,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const STUDENT_NAV = [
  { name: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { name: "Expenses", href: "/student/expenses", icon: Wallet },
  { name: "Budgets", href: "/student/budgets", icon: PieChart },
  { name: "Meals", href: "/student/meals", icon: Calendar },
  { name: "Analytics", href: "/student/analytics", icon: Utensils },
  { name: "Connection", href: "/student/connection", icon: Users },
  { name: "Settings", href: "/student/settings", icon: Settings },
];

const OWNER_NAV = [
  { name: "Dashboard", href: "/owner/dashboard", icon: LayoutDashboard },
  { name: "Customers", href: "/owner/customers", icon: Users },
  { name: "Attendance", href: "/owner/attendance", icon: Calendar },
  { name: "Meal Plans", href: "/owner/meal-plans", icon: Utensils },
  { name: "Billing", href: "/owner/billing", icon: Receipt },
  { name: "Payments", href: "/owner/payments", icon: CreditCard },
  { name: "Analytics", href: "/owner/analytics", icon: PieChart },
  { name: "Settings", href: "/owner/settings", icon: Settings },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const navItems = user.role === "student" ? STUDENT_NAV : OWNER_NAV;
  const initials = user.name.slice(0, 2).toUpperCase();

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const isActive = location === item.href;
        return (
          <Link 
            key={item.name} 
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              isActive 
                ? "bg-primary text-primary-foreground font-medium" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card h-screen sticky top-0">
        <div className="p-4 border-b">
          <div className="font-bold text-xl text-primary tracking-tight">SmartTiffin</div>
          <div className="text-xs text-muted-foreground capitalize mt-1">{user.role} Portal</div>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          <NavLinks />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="p-4 border-b">
                  <div className="font-bold text-xl text-primary tracking-tight">SmartTiffin</div>
                  <div className="text-xs text-muted-foreground capitalize mt-1">{user.role} Portal</div>
                </div>
                <div className="py-4 px-3 flex flex-col gap-1">
                  <NavLinks />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="font-semibold text-lg truncate hidden sm:block">
              {navItems.find(item => item.href === location)?.name || "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
