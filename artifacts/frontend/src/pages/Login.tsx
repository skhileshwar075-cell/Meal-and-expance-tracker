import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, GraduationCap, UtensilsCrossed } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required.")
});

type LoginFormValues = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  {
    label: "Student Demo",
    email: "arjun@example.com",
    password: "password123",
    description: "View expenses, budgets & meals",
    icon: GraduationCap,
    color: "bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-800",
  },
  {
    label: "Owner Demo",
    email: "ramesh@tiffin.com",
    password: "password123",
    description: "Manage customers & billing",
    icon: UtensilsCrossed,
    color: "bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-800",
  },
];

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({ data }, {
      onSuccess: (response) => {
        login(response);
      },
      onError: (err: any) => {
        toast({
          title: "Login failed",
          description: err.message || "Invalid credentials. Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  const handleDemoLogin = (email: string, password: string) => {
    form.setValue("email", email);
    form.setValue("password", password);
    loginMutation.mutate({ data: { email, password } }, {
      onSuccess: (response) => {
        login(response);
      },
      onError: (err: any) => {
        toast({
          title: "Login failed",
          description: err.message || "Could not sign in with demo account.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-bold text-3xl text-primary tracking-tight">SmartTiffin</Link>
          <h1 className="mt-6 text-2xl font-semibold text-foreground tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-2">Enter your credentials to access your account.</p>
        </div>

        {/* Demo accounts */}
        <div className="mb-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 text-center">
            Quick Demo Access
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((account) => {
              const Icon = account.icon;
              return (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleDemoLogin(account.email, account.password)}
                  disabled={loginMutation.isPending}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${account.color}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-semibold">{account.label}</span>
                  <span className="text-[10px] opacity-70 leading-tight">{account.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or sign in manually</span>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} disabled={loginMutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                    </div>
                    <FormControl>
                      <Input type="password" {...field} disabled={loginMutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign in"}
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
