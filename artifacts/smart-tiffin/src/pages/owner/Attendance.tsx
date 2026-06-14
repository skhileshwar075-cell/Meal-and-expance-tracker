import React, { useState } from "react";
import {
  useGetTodayAttendance,
  useListAttendance,
  useListCustomers,
  useMarkAttendance,
  useGetMealForecast,
  getGetTodayAttendanceQueryKey,
  getListAttendanceQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sunrise, Sunset, Users, ChevronLeft, ChevronRight, CalendarCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Attendance() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: todayAtt, isLoading: loadingToday } = useGetTodayAttendance();
  const { data: forecast } = useGetMealForecast();
  const { data: customers } = useListCustomers({ status: "active" });
  const { data: dateAtt, isLoading: loadingDate } = useListAttendance({ date: selectedDate });
  const markAtt = useMarkAttendance();

  const today = new Date().toISOString().split("T")[0];
  const attMap = new Map((dateAtt ?? []).map(a => [a.customerId, a]));

  function changeDate(delta: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split("T")[0]);
  }

  async function toggleCustomerAttendance(customerId: number, field: "morningPresent" | "eveningPresent") {
    const existing = attMap.get(customerId);
    const morning = field === "morningPresent" ? !(existing?.morningPresent ?? false) : (existing?.morningPresent ?? false);
    const evening = field === "eveningPresent" ? !(existing?.eveningPresent ?? false) : (existing?.eveningPresent ?? false);
    try {
      await markAtt.mutateAsync({ data: { records: [{ customerId, date: selectedDate, morningPresent: morning, eveningPresent: evening }] } });
      qc.invalidateQueries({ queryKey: getListAttendanceQueryKey({ date: selectedDate }) });
      qc.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() });
    } catch {
      toast({ title: "Error", description: "Failed to update attendance", variant: "destructive" });
    }
  }

  async function markAll(field: "morningPresent" | "eveningPresent", value: boolean) {
    if (!customers) return;
    const records = customers.map(c => {
      const existing = attMap.get(c.id);
      return {
        customerId: c.id, date: selectedDate,
        morningPresent: field === "morningPresent" ? value : (existing?.morningPresent ?? false),
        eveningPresent: field === "eveningPresent" ? value : (existing?.eveningPresent ?? false),
      };
    });
    try {
      await markAtt.mutateAsync({ data: { records } });
      qc.invalidateQueries({ queryKey: getListAttendanceQueryKey({ date: selectedDate }) });
      qc.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() });
      toast({ title: "Attendance updated" });
    } catch {
      toast({ title: "Error", description: "Failed to mark attendance", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground text-sm mt-1">Mark daily meal attendance for your customers</p>
      </div>

      {/* Today's Summary + Forecast */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Today's Meals</CardTitle></CardHeader>
          <CardContent>
            {loadingToday ? <Skeleton className="h-16" /> : (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1"><Sunrise className="w-4 h-4 text-orange-500" /></div>
                  <p className="text-2xl font-bold">{todayAtt?.morningCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Morning</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1"><Sunset className="w-4 h-4 text-blue-500" /></div>
                  <p className="text-2xl font-bold">{todayAtt?.eveningCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Evening</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1"><Users className="w-4 h-4 text-muted-foreground" /></div>
                  <p className="text-2xl font-bold">{todayAtt?.totalCustomers ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tomorrow's Forecast</CardTitle></CardHeader>
          <CardContent>
            {forecast ? (
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold">{forecast.predictedMorning}</p>
                  <p className="text-xs text-muted-foreground">Morning <span className="text-primary">{forecast.morningConfidence}% conf.</span></p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{forecast.predictedEvening}</p>
                  <p className="text-xs text-muted-foreground">Evening <span className="text-primary">{forecast.eveningConfidence}% conf.</span></p>
                </div>
              </div>
            ) : <Skeleton className="h-16" />}
          </CardContent>
        </Card>
      </div>

      {/* Date Selector + Mark Attendance */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="w-4 h-4" />
              {new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              {selectedDate === today && <Badge className="bg-primary/10 text-primary text-xs">Today</Badge>}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeDate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSelectedDate(today)}>Today</Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={selectedDate >= today} onClick={() => changeDate(1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          {selectedDate <= today && (
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => markAll("morningPresent", true)}><Sunrise className="w-3 h-3 text-orange-500" />All Morning</Button>
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => markAll("eveningPresent", true)}><Sunset className="w-3 h-3 text-blue-500" />All Evening</Button>
              <Button variant="outline" size="sm" className="text-xs text-destructive" onClick={() => markAll("morningPresent", false)}>Clear Morning</Button>
              <Button variant="outline" size="sm" className="text-xs text-destructive" onClick={() => markAll("eveningPresent", false)}>Clear Evening</Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loadingDate ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i=><Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : customers && customers.length > 0 ? (
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-3 py-1 text-xs text-muted-foreground font-medium">
                <span>Customer</span>
                <span className="flex items-center gap-1"><Sunrise className="w-3 h-3 text-orange-400" />Morning</span>
                <span className="flex items-center gap-1"><Sunset className="w-3 h-3 text-blue-400" />Evening</span>
              </div>
              {customers.map(c => {
                const att = attMap.get(c.id);
                return (
                  <div key={c.id} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      {c.mobile && <p className="text-xs text-muted-foreground">{c.mobile}</p>}
                    </div>
                    <button
                      disabled={selectedDate > today}
                      onClick={() => toggleCustomerAttendance(c.id, "morningPresent")}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${att?.morningPresent ? "bg-orange-500 border-orange-500 text-white" : "border-muted-foreground/30 hover:border-orange-400"}`}
                    >
                      <Sunrise className="w-4 h-4" />
                    </button>
                    <button
                      disabled={selectedDate > today}
                      onClick={() => toggleCustomerAttendance(c.id, "eveningPresent")}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${att?.eveningPresent ? "bg-blue-500 border-blue-500 text-white" : "border-muted-foreground/30 hover:border-blue-400"}`}
                    >
                      <Sunset className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">No active customers found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
