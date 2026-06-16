import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft, ChevronRight, Sunrise, Sunset, IndianRupee,
  CalendarDays, TrendingUp, CheckCircle2, AlertCircle, Clock,
} from "lucide-react";

// ── helpers ─────────────────────────────────────────────────────────────────
function authFetch(url: string) {
  const token = localStorage.getItem("smart_tiffin_access_token");
  return fetch(url, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  }).then(async r => {
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? r.statusText); }
    return r.json();
  });
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const WEEK_DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  paid:    { label: "Paid",    color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",     icon: CheckCircle2 },
  unpaid:  { label: "Unpaid",  color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",             icon: AlertCircle },
  partial: { label: "Partial", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400", icon: Clock },
};

// ── types ────────────────────────────────────────────────────────────────────
interface AttendanceDay {
  date: string;
  morningPresent: boolean;
  eveningPresent: boolean;
  notes?: string | null;
}
interface BillSummary {
  id: number; status: string;
  totalAmount: number; paidAmount: number;
  discount: number; extraCharges: number;
  mealsConsumed: number; dueDate?: string | null;
}
interface Payment {
  id: number; amount: number;
  method?: string | null; paymentDate?: string | null;
  status: string; notes?: string | null;
}
interface CustomerMonthData {
  customer: { id: number; name: string; mobile?: string | null };
  month: number; year: number; daysInMonth: number;
  attendance: AttendanceDay[];
  bill: BillSummary | null;
  payments: Payment[];
}

// ── CalendarDay cell ─────────────────────────────────────────────────────────
function DayCell({ day, att }: { day: number; att?: AttendanceDay }) {
  const hasMorning = att?.morningPresent ?? false;
  const hasEvening = att?.eveningPresent ?? false;
  const hasData    = att !== undefined;

  let bg = "bg-muted/30";
  if (!hasData)                       bg = "bg-muted/10 opacity-50";
  else if (hasMorning && hasEvening)  bg = "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800";
  else if (hasMorning)                bg = "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800";
  else if (hasEvening)                bg = "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800";
  else                                bg = "bg-muted/20 border-muted";

  return (
    <div className={`relative rounded-md border p-1.5 min-h-[56px] flex flex-col gap-0.5 ${bg}`}>
      <span className="text-[11px] font-semibold text-muted-foreground leading-none">{day}</span>
      <div className="flex gap-0.5 mt-auto">
        <span className={`w-4 h-4 rounded-full flex items-center justify-center ${hasMorning ? "bg-orange-500 text-white" : "bg-muted/40"}`} title="Morning">
          <Sunrise className="w-2.5 h-2.5" />
        </span>
        <span className={`w-4 h-4 rounded-full flex items-center justify-center ${hasEvening ? "bg-blue-500 text-white" : "bg-muted/40"}`} title="Evening">
          <Sunset className="w-2.5 h-2.5" />
        </span>
      </div>
    </div>
  );
}

// ── Main dialog ──────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  customerId: number;
  customerName: string;
  initialMonth: number;
  initialYear: number;
}

export default function CustomerMealCalendarDialog({
  open, onClose, customerId, customerName, initialMonth, initialYear,
}: Props) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);

  // Reset month when dialog opens with new initial values
  React.useEffect(() => {
    if (open) { setMonth(initialMonth); setYear(initialYear); }
  }, [open, initialMonth, initialYear]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    const now = new Date();
    if (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const { data, isLoading } = useQuery<CustomerMonthData>({
    queryKey: ["customer-month", customerId, month, year],
    queryFn: () => authFetch(`/api/attendance/customer-month?customerId=${customerId}&month=${month}&year=${year}`),
    enabled: open && customerId > 0,
    staleTime: 60_000,
  });

  // Build calendar grid
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = data?.daysInMonth ?? new Date(year, month, 0).getDate();
  const attMap = new Map((data?.attendance ?? []).map(a => [parseInt(a.date.split("-")[2]), a]));

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  // Stats
  const morningPresent = (data?.attendance ?? []).filter(a => a.morningPresent).length;
  const eveningPresent = (data?.attendance ?? []).filter(a => a.eveningPresent).length;
  const totalMeals     = morningPresent + eveningPresent;
  const daysRecorded   = (data?.attendance ?? []).length;
  const possibleMeals  = daysRecorded * 2;
  const attendanceRate = possibleMeals > 0 ? Math.round((totalMeals / possibleMeals) * 100) : 0;

  const bill = data?.bill ?? null;
  const outstanding = bill ? bill.totalAmount - bill.paidAmount : 0;
  const statusCfg = bill ? (STATUS_CONFIG[bill.status] ?? STATUS_CONFIG.unpaid) : null;

  const now = new Date();
  const isCurrentOrFuture = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            {customerName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Month navigator + Payment card side by side */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            {/* Month nav */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={prevMonth}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-sm font-semibold w-32 text-center">
                {MONTH_NAMES[month - 1]} {year}
              </span>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={nextMonth} disabled={isCurrentOrFuture}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Payment summary card — top right */}
            {isLoading ? (
              <Skeleton className="h-24 w-48" />
            ) : bill ? (
              <div className="rounded-lg border bg-card px-3 py-2.5 min-w-[190px] space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bill</span>
                  {statusCfg && (
                    <Badge className={`text-[10px] px-1.5 py-0 ${statusCfg.color}`}>
                      <statusCfg.icon className="w-2.5 h-2.5 mr-0.5" />{statusCfg.label}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold text-right">₹{bill.totalAmount.toLocaleString()}</span>
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-semibold text-right text-green-600">₹{bill.paidAmount.toLocaleString()}</span>
                  {outstanding > 0 && (
                    <>
                      <span className="text-muted-foreground">Due</span>
                      <span className="font-semibold text-right text-destructive">₹{outstanding.toLocaleString()}</span>
                    </>
                  )}
                  {bill.dueDate && (
                    <>
                      <span className="text-muted-foreground">Due date</span>
                      <span className="text-right">{new Date(bill.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    </>
                  )}
                </div>
                {bill.discount > 0 && (
                  <p className="text-[10px] text-green-600">Discount: ₹{bill.discount}</p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2.5 min-w-[190px] text-center">
                <IndianRupee className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">No bill generated</p>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {[
              { icon: <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />, label: "Both meals" },
              { icon: <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />, label: "Morning only" },
              { icon: <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />, label: "Evening only" },
              { icon: <span className="w-3 h-3 rounded-full bg-muted-foreground/30 inline-block" />, label: "Absent" },
            ].map(l => (
              <span key={l.label} className="flex items-center gap-1">{l.icon}{l.label}</span>
            ))}
          </div>

          {/* Calendar grid */}
          {isLoading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array(35).fill(0).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : (
            <div>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEK_DAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, i) =>
                  day === null
                    ? <div key={`empty-${i}`} />
                    : <DayCell key={day} day={day} att={attMap.get(day)} />
                )}
              </div>
            </div>
          )}

          {/* Stats summary */}
          {!isLoading && (
            <div className="grid grid-cols-4 gap-3 rounded-lg border bg-muted/30 p-3">
              {[
                { label: "Total Meals", value: totalMeals, icon: <TrendingUp className="w-3.5 h-3.5 text-primary" />, color: "" },
                { label: "Morning",     value: `${morningPresent}d`,  icon: <Sunrise className="w-3.5 h-3.5 text-orange-500" />, color: "text-orange-600" },
                { label: "Evening",     value: `${eveningPresent}d`,  icon: <Sunset  className="w-3.5 h-3.5 text-blue-500" />,   color: "text-blue-600"   },
                { label: "Rate",        value: `${attendanceRate}%`,  icon: <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />, color: attendanceRate >= 75 ? "text-green-600" : attendanceRate >= 50 ? "text-yellow-600" : "text-destructive" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="flex justify-center mb-0.5">{s.icon}</div>
                  <p className={`text-lg font-bold leading-none ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Payments list */}
          {!isLoading && data?.payments && data.payments.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment History</p>
                <div className="space-y-1.5">
                  {data.payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-sm rounded-md bg-muted/30 px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        <span>{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
                        {p.method && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{p.method.replace("_", " ")}</Badge>
                        )}
                      </div>
                      <span className="font-semibold text-green-600">₹{p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
