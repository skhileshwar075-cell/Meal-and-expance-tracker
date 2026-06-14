import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGetChurnRisk } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Users, AlertTriangle, Trophy, Shield, CalendarDays } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const RISK_COLOR: Record<string, string> = {
  low:    "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
  high:   "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

function authFetch(url: string) {
  const token = localStorage.getItem("smart_tiffin_access_token");
  return fetch(url, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  }).then(async r => {
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  });
}

function OverviewCard({ label, value, sub, icon: Icon }: any) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function OwnerAnalytics() {
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [selYear, setSelYear] = useState(now.getFullYear());

  const qParams = `month=${selMonth}&year=${selYear}`;

  const { data: overview } = useQuery<any>({
    queryKey: ["owner-overview", selMonth, selYear],
    queryFn: () => authFetch(`/api/analytics/owner/overview?${qParams}`),
    staleTime: 60_000,
  });

  const { data: revenue, isLoading: lr } = useQuery<any>({
    queryKey: ["owner-revenue", selMonth, selYear],
    queryFn: () => authFetch(`/api/analytics/owner/revenue?months=6&endMonth=${selMonth}&endYear=${selYear}`),
    staleTime: 60_000,
  });

  const { data: retention } = useQuery<any>({
    queryKey: ["owner-retention", selMonth, selYear],
    queryFn: () => authFetch(`/api/analytics/owner/retention?${qParams}`),
    staleTime: 60_000,
  });

  const { data: topCustomers } = useQuery<any[]>({
    queryKey: ["owner-top-customers", selMonth, selYear],
    queryFn: () => authFetch(`/api/analytics/owner/top-customers?${qParams}`),
    staleTime: 60_000,
  });

  const { data: churn } = useGetChurnRisk();

  const isCurrentMonth = selMonth === (now.getMonth() + 1) && selYear === now.getFullYear();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Business insights, retention, and churn analysis</p>
        </div>
        {/* Month / Year filter */}
        <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-muted/40">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <select
            className="bg-transparent text-sm font-medium focus:outline-none"
            value={selMonth}
            onChange={e => setSelMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <Input
            type="number"
            className="w-20 h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0 font-medium"
            value={selYear}
            onChange={e => setSelYear(Number(e.target.value))}
          />
          {!isCurrentMonth && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline ml-1"
              onClick={() => { setSelMonth(now.getMonth() + 1); setSelYear(now.getFullYear()); }}
            >
              reset
            </button>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <OverviewCard label="Retention Rate"   value={`${overview?.retentionRate ?? "—"}%`}        icon={Shield}        sub={`${MONTHS[selMonth - 1]} ${selYear}`} />
        <OverviewCard label="Collection Rate"  value={`${overview?.collectionEfficiency ?? "—"}%`} icon={TrendingUp}     sub="Payments collected" />
        <OverviewCard label="Avg Attendance"   value={`${overview?.avgAttendanceRate ?? "—"}%`}    icon={Users}         sub="Meals attended" />
        <OverviewCard label="Churn Risk"       value={`${overview?.churnRisk ?? "—"}%`}            icon={AlertTriangle} sub="At-risk customers" />
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Revenue — 6 months to {MONTHS[selMonth - 1]} {selYear}</CardTitle>
            {revenue && (
              <div className="flex items-center gap-2 text-sm">
                {revenue.growth > 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
                <span className={revenue.growth > 0 ? "text-green-600" : "text-destructive"}>
                  {revenue.growth > 0 ? "+" : ""}{revenue.growth}% MoM
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {lr ? <Skeleton className="h-48" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenue?.data ?? []} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="amount" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Retention */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" />Customer Retention</CardTitle>
          </CardHeader>
          <CardContent>
            {retention ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-center"><p className="text-2xl font-bold text-green-600">{retention.activeCustomers}</p><p className="text-xs text-muted-foreground">Active</p></div>
                  <div className="text-center"><p className="text-2xl font-bold text-blue-500">{retention.newCustomers}</p><p className="text-xs text-muted-foreground">New ({MONTHS[selMonth - 1]})</p></div>
                  <div className="text-center"><p className="text-2xl font-bold text-destructive">{retention.lostCustomers}</p><p className="text-xs text-muted-foreground">Lost</p></div>
                  <div className="text-center"><p className="text-2xl font-bold">{retention.retentionRate}%</p><p className="text-xs text-muted-foreground">Rate</p></div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Avg tenure: <span className="font-medium text-foreground">{retention.averageTenureMonths} months</span></p>
                </div>
              </div>
            ) : <Skeleton className="h-28" />}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-500" />Top Customers — {MONTHS[selMonth - 1]} {selYear}</CardTitle>
          </CardHeader>
          <CardContent>
            {topCustomers && topCustomers.length > 0 ? (
              <div className="space-y-2">
                {topCustomers.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${c.rank <= 3 ? "bg-yellow-100 text-yellow-700" : "bg-muted text-muted-foreground"}`}>{c.rank}</span>
                      <span className="font-medium">{c.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹{c.totalPaid.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{c.loyaltyMonths}mo · {c.attendanceRate}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-8">No billing data for {MONTHS[selMonth - 1]} {selYear}.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Churn Risk — always current state */}
      {churn && churn.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />Churn Risk Analysis
              <Badge variant="outline" className="text-xs font-normal ml-auto">Current state</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {churn.map((c: any) => (
                <div key={c.customerId} className="flex items-start justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{c.customerName}</p>
                      <Badge className={`${RISK_COLOR[c.riskLevel]} text-xs`}>{c.riskLevel} risk</Badge>
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {c.reasons.map((r: string, i: number) => <li key={i} className="text-xs text-muted-foreground">· {r}</li>)}
                    </ul>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{c.riskScore}</p>
                    <p className="text-xs text-muted-foreground">risk score</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
