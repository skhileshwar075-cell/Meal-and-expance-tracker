import React, { useState } from "react";
import { useListMeals, useGetMealSummary, useCreateMeal, getListMealsQueryKey, getGetMealSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Sunrise, Sunset, CheckCircle2, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function Meals() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: meals, isLoading } = useListMeals({ month, year });
  const { data: summary } = useGetMealSummary({ month, year });
  const createMeal = useCreateMeal();

  const mealMap = new Map((meals ?? []).map(m => [m.date, m]));

  function getDaysInMonth(m: number, y: number) { return new Date(y, m, 0).getDate(); }
  function getFirstDayOfMonth(m: number, y: number) { return new Date(y, m - 1, 1).getDay(); }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1);
  }

  async function toggleMeal(date: string, field: "morningMeal" | "eveningMeal") {
    const existing = mealMap.get(date);
    const morning = field === "morningMeal" ? !(existing?.morningMeal ?? false) : (existing?.morningMeal ?? false);
    const evening = field === "eveningMeal" ? !(existing?.eveningMeal ?? false) : (existing?.eveningMeal ?? false);
    try {
      await createMeal.mutateAsync({ data: { date, morningMeal: morning, eveningMeal: evening } });
      qc.invalidateQueries({ queryKey: getListMealsQueryKey({ month, year }) });
      qc.invalidateQueries({ queryKey: getGetMealSummaryQueryKey({ month, year }) });
    } catch {
      toast({ title: "Error", description: "Failed to update meal", variant: "destructive" });
    }
  }

  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = getFirstDayOfMonth(month, year);
  const calendarDays: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meal Tracker</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your morning and evening meals daily</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Morning Meals", value: summary?.totalMorning ?? 0, icon: Sunrise, color: "text-orange-500" },
          { label: "Evening Meals", value: summary?.totalEvening ?? 0, icon: Sunset, color: "text-blue-500" },
          { label: "Total Meals", value: summary?.totalMeals ?? 0, icon: CheckCircle2, color: "text-green-500" },
          { label: "Avg / Day", value: summary?.averageMealsPerDay?.toFixed(1) ?? "0", icon: Circle, color: "text-muted-foreground" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold mt-0.5">{value}</p>
              </div>
              <Icon className={`w-6 h-6 ${color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{MONTHS[month - 1]} {year}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(d => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>)}
          </div>
          {/* Calendar grid */}
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={idx} />;
                const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const meal = mealMap.get(dateStr);
                const isToday = dateStr === now.toISOString().split("T")[0];
                const isFuture = new Date(dateStr) > now;
                return (
                  <div key={idx} className={`border rounded-lg p-1.5 min-h-[72px] ${isToday ? "border-primary bg-primary/5" : "border-border"} ${isFuture ? "opacity-40" : ""}`}>
                    <div className={`text-xs font-medium mb-1 ${isToday ? "text-primary" : "text-foreground"}`}>{day}</div>
                    {!isFuture && (
                      <div className="space-y-0.5">
                        <button onClick={() => toggleMeal(dateStr, "morningMeal")} className="flex items-center gap-1 w-full hover:opacity-70 transition-opacity">
                          <Sunrise className={`w-3 h-3 ${meal?.morningMeal ? "text-orange-500" : "text-muted-foreground"}`} />
                          <span className={`text-[10px] ${meal?.morningMeal ? "text-orange-500 font-medium" : "text-muted-foreground"}`}>AM</span>
                        </button>
                        <button onClick={() => toggleMeal(dateStr, "eveningMeal")} className="flex items-center gap-1 w-full hover:opacity-70 transition-opacity">
                          <Sunset className={`w-3 h-3 ${meal?.eveningMeal ? "text-blue-500" : "text-muted-foreground"}`} />
                          <span className={`text-[10px] ${meal?.eveningMeal ? "text-blue-500 font-medium" : "text-muted-foreground"}`}>PM</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Sunrise className="w-3 h-3 text-orange-500" /> Morning</span>
            <span className="flex items-center gap-1"><Sunset className="w-3 h-3 text-blue-500" /> Evening</span>
            <span>Click to toggle</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
