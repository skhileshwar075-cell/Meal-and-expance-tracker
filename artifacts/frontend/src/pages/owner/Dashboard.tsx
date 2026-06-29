import React, { useMemo } from "react";
import { useLocation } from "wouter";
import {
  useGetOwnerDashboard,
  useGetTodayAttendance,
  useGetCollectionSummary,
  useGetChurnRisk,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users, IndianRupee, TrendingUp, TrendingDown, Utensils,
  Plus, ClipboardList, Receipt, BarChart3, Sun, Moon,
  ChevronRight, AlertCircle, UserX, CheckCircle2, Lightbulb,
  Banknote, Clock, Calendar,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) { return `₹${n.toLocaleString("en-IN")}`; }

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── sub-components ────────────────────────────────────────────────────────────
function QuickAction({
  icon: Icon, label, sub, color, onClick,
}: { icon: React.ElementType; label: string; sub: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors w-full text-center">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-xs font-medium leading-tight">{label}</span>
      <span className="text-[10px] text-muted-foreground leading-tight">{sub}</span>
    </button>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, iconBg, highlight,
}: {
  icon: React.ElementType; label: string; value: string;
  sub?: string; iconBg: string; highlight?: "danger" | "warn" | "ok" | null;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className={`font-bold text-lg leading-tight ${
            highlight === "danger" ? "text-destructive" :
            highlight === "warn"   ? "text-amber-600"   :
            highlight === "ok"     ? "text-green-600"   : ""
          }`}>{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function OwnerDashboard() {
  const [, navigate] = useLocation();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { data: dash, isLoading } = useGetOwnerDashboard();
  const { data: todayAtt } = useGetTodayAttendance();
  const { data: collection } = useGetCollectionSummary({ month, year });
  const { data: churnRisks } = useGetChurnRisk();

  const highRisk = useMemo(() => churnRisks?.filter(c => c.riskLevel === "high") ?? [], [churnRisks]);
  const medRisk  = useMemo(() => churnRisks?.filter(c => c.riskLevel === "medium") ?? [], [churnRisks]);

  const collPct = collection && collection.totalBilled > 0
    ? Math.round((collection.totalCollected / collection.totalBilled) * 100) : 0;
  const collColor = collPct >= 80 ? "bg-primary" : collPct >= 60 ? "bg-amber-400" : "bg-destructive";

  const todayAttTotal = (todayAtt?.morningCount ?? 0) + (todayAtt?.eveningCount ?? 0);
  const dateLabel = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const monthName = now.toLocaleString("en-IN", { month: "long" });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-72 rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-3">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl lg:max-w-6xl mx-auto px-4">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting()}! 👋</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{dateLabel} · {monthName} overview</p>
      </div>

      {/* Alerts from dashboard */}
      {dash?.alerts && dash.alerts.length > 0 && (
        <div className="space-y-2">
          {dash.alerts.slice(0, 2).map(alert => (
            <Alert key={alert.id} className={
              alert.severity === "danger"  ? "border-destructive/50 bg-destructive/5 py-2" :
              alert.severity === "warning" ? "border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 py-2" :
                                            "border-blue-500/50 bg-blue-50 dark:bg-blue-950/20 py-2"
            }>
              <Lightbulb className={`h-4 w-4 ${alert.severity === "danger" ? "text-destructive" : alert.severity === "warning" ? "text-yellow-600" : "text-blue-600"}`} />
              <AlertDescription className="text-sm">{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          icon={Users} label="Active Customers" iconBg="bg-primary/10 text-primary"
          value={String(dash?.activeCustomers ?? "—")}
          sub="on meal plans"
        />
        <KpiCard
          icon={Utensils} label="Today's Meals" iconBg="bg-amber-100 text-amber-600"
          value={String(todayAttTotal)}
          sub={`${todayAtt?.morningCount ?? 0}M + ${todayAtt?.eveningCount ?? 0}E`}
        />
        <KpiCard
          icon={IndianRupee} label="Monthly Revenue" iconBg="bg-green-100 text-green-600"
          value={dash ? fmt(dash.monthlyRevenue) : "—"}
          sub={monthName}
          highlight={dash && dash.monthlyRevenue > 0 ? "ok" : null}
        />
        <KpiCard
          icon={TrendingUp} label="Collection Rate" iconBg="bg-blue-100 text-blue-600"
          value={dash ? `${dash.collectionRate.toFixed(0)}%` : "—"}
          sub={dash ? `${dash.pendingPayments} pending` : undefined}
          highlight={dash && dash.collectionRate >= 80 ? "ok" : dash && dash.collectionRate < 60 ? "danger" : "warn"}
        />
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Quick Actions</p>
        <div className="grid grid-cols-4 gap-2">
          <QuickAction icon={ClipboardList} label="Attendance" sub="Mark today" color="bg-primary/10 text-primary" onClick={() => navigate("/owner/attendance")} />
          <QuickAction icon={Plus} label="Add Customer" sub="New signup" color="bg-amber-100 text-amber-600" onClick={() => navigate("/owner/customers")} />
          <QuickAction icon={Receipt} label="Billing" sub="Manage bills" color="bg-green-100 text-green-600" onClick={() => navigate("/owner/billing")} />
          <QuickAction icon={BarChart3} label="Analytics" sub="Full report" color="bg-purple-100 text-purple-600" onClick={() => navigate("/owner/analytics")} />
        </div>
      </div>

      {/* Today's attendance + Collection summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Today's attendance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Today's Attendance
              <Badge variant="secondary" className="ml-auto text-xs">
                {now.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!todayAtt ? (
              <p className="text-sm text-muted-foreground py-3">No data for today.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold">{todayAttTotal}</span>
                  <span className="text-xs text-muted-foreground mb-1">
                    meals of {todayAtt.totalCustomers * 2} possible
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="h-full bg-primary rounded-full"
                    style={{ width: `${todayAtt.totalCustomers > 0 ? Math.round((todayAttTotal / (todayAtt.totalCustomers * 2)) * 100) : 0}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-muted-foreground">Morning</span>
                    <span className="font-semibold ml-auto">{todayAtt.morningCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="text-muted-foreground">Evening</span>
                    <span className="font-semibold ml-auto">{todayAtt.eveningCount}</span>
                  </div>
                </div>
                <button onClick={() => navigate("/owner/attendance")}
                  className="text-xs text-primary flex items-center gap-0.5 hover:underline">
                  View full attendance <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Collection summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Banknote className="w-4 h-4 text-primary" /> Collection — {monthName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!collection ? (
              <p className="text-sm text-muted-foreground py-3">No billing data.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Collected</span>
                  <span className="font-bold text-green-600">{fmt(collection.totalCollected)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div className={`h-full rounded-full ${collColor}`} style={{ width: `${collPct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{collPct}% of {fmt(collection.totalBilled)}</span>
                  <span className="text-destructive font-medium">{fmt(collection.outstandingAmount)} due</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-xs pt-1 border-t">
                  <div className="text-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mx-auto mb-0.5" />
                    <p className="font-semibold">{collection.paidCount}</p>
                    <p className="text-muted-foreground">Paid</p>
                  </div>
                  <div className="text-center">
                    <Clock className="w-3.5 h-3.5 text-amber-500 mx-auto mb-0.5" />
                    <p className="font-semibold">{collection.partialCount}</p>
                    <p className="text-muted-foreground">Partial</p>
                  </div>
                  <div className="text-center">
                    <AlertCircle className="w-3.5 h-3.5 text-destructive mx-auto mb-0.5" />
                    <p className="font-semibold">{collection.unpaidCount}</p>
                    <p className="text-muted-foreground">Unpaid</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Churn risk */}
      {(highRisk.length > 0 || medRisk.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserX className="w-4 h-4 text-destructive" /> Churn Risk
              </CardTitle>
              <button onClick={() => navigate("/owner/analytics")}
                className="text-xs text-primary flex items-center gap-0.5 hover:underline">
                Full report <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...highRisk, ...medRisk].slice(0, 4).map(c => (
                <div key={c.customerId} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${c.riskLevel === "high" ? "bg-destructive" : "bg-amber-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.customerName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {c.reasons.slice(0, 2).join(" · ")}
                    </p>
                  </div>
                  <Badge variant={c.riskLevel === "high" ? "destructive" : "outline"}
                    className="shrink-0 text-xs capitalize">
                    {c.riskLevel}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent payments */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Recent Payments</CardTitle>
            <button onClick={() => navigate("/owner/payments")}
              className="text-xs text-primary flex items-center gap-0.5 hover:underline">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {!dash?.recentPayments?.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No recent payments.</p>
          ) : (
            <div className="divide-y">
              {dash.recentPayments.slice(0, 6).map(pay => (
                <div key={pay.id} className="flex items-center gap-3 py-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    pay.status === "paid" ? "bg-green-100 text-green-600" :
                    pay.status === "partial" ? "bg-amber-100 text-amber-600" :
                    "bg-red-100 text-red-600"
                  }`}>
                    <IndianRupee className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pay.customerName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {pay.paymentDate
                        ? new Date(pay.paymentDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                        : "—"
                      }
                      {" · "}
                      <span className={`capitalize font-medium ${
                        pay.status === "paid" ? "text-green-600" :
                        pay.status === "partial" ? "text-amber-600" : "text-destructive"
                      }`}>{pay.status}</span>
                    </p>
                  </div>
                  <span className="text-sm font-semibold shrink-0 text-primary">{fmt(pay.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
