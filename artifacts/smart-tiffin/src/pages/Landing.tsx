import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="py-4 px-6 border-b flex items-center justify-between bg-card">
        <div className="font-bold text-2xl text-primary tracking-tight">SmartTiffin</div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Sign In
          </Link>
          <Link href="/register" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
            Get Started
          </Link>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center text-center p-6 max-w-4xl mx-auto w-full">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground mb-6">
          The smart ledger for students and tiffin services.
        </h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl">
          Whether you're tracking your monthly expenses and meals, or running a tiffin business handling hundreds of customers — SmartTiffin gives you clear, calm numbers.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/register?role=student" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
            I am a Student
          </Link>
          <Link href="/register?role=owner" className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
            I am a Service Owner
          </Link>
        </div>
      </main>
    </div>
  );
}
