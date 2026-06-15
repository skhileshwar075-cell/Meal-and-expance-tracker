import React, { useState, useMemo } from "react";
import {
  useListPayments, useRecordPayment, useListBills, useGetCollectionSummary,
  getListPaymentsQueryKey, getGetCollectionSummaryQueryKey, getListBillsQueryKey,
} from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { IndianRupee, Plus, CreditCard, Search, ChevronLeft, ChevronRight, RefreshCw, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const now = new Date();
const PAGE_SIZE = 10;

const PAYMENT_METHODS = [
  { value: "", label: "Select method…" },
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

function authFetch(url: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("smart_tiffin_access_token");
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  }).then(async r => {
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? r.statusText); }
    return r.json();
  });
}

export default function Payments() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [form, setForm] = useState({
    billId: "", amount: "", status: "paid", method: "",
    paymentDate: now.toISOString().split("T")[0], notes: "",
  });

  const { data: payments, isLoading } = useListPayments({ status: filterStatus as any });
  const { data: summary } = useGetCollectionSummary({ month: now.getMonth() + 1, year: now.getFullYear() });
  const { data: bills } = useListBills({ status: "unpaid" });
  const record = useRecordPayment();

  // Auto-fill amount with remaining balance when bill changes
  function handleBillChange(billId: string) {
    const bill = (bills ?? []).find(b => String(b.id) === billId);
    const remaining = bill ? bill.totalAmount - (bill.paidAmount ?? 0) : 0;
    setForm(f => ({ ...f, billId, amount: remaining > 0 ? String(remaining) : "" }));
  }

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    try {
      await record.mutateAsync({
        data: {
          billId: Number(form.billId),
          amount: Number(form.amount),
          status: form.status as any,
          paymentDate: form.paymentDate || undefined,
          notes: form.notes || undefined,
        },
      });
      qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetCollectionSummaryQueryKey() });
      qc.invalidateQueries({ queryKey: getListBillsQueryKey() });
      toast({ title: "Payment recorded" });
      setOpen(false);
      setForm({ billId: "", amount: "", status: "paid", method: "", paymentDate: now.toISOString().split("T")[0], notes: "" });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed to record payment", variant: "destructive" });
    }
  }

  async function handleReconcile() {
    setReconciling(true);
    try {
      const r = await authFetch("/api/payments/reconcile", { method: "POST" });
      if (r.fixed === 0) {
        toast({ title: "All data is consistent", description: "No corrections needed." });
      } else {
        qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetCollectionSummaryQueryKey() });
        toast({ title: `Fixed ${r.fixed} discrepanc${r.fixed === 1 ? "y" : "ies"}`, description: "Customer totals have been recalculated from actual bill data." });
      }
    } catch (e: any) {
      toast({ title: "Reconcile failed", description: e?.message, variant: "destructive" });
    } finally {
      setReconciling(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments ?? [];
    return (payments ?? []).filter(p => p.customerName.toLowerCase().includes(q));
  }, [payments, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and record customer payments</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm" variant="outline" className="gap-2"
            onClick={handleReconcile} disabled={reconciling}
            title="Recalculate all customer totals from actual bill data"
          >
            <RefreshCw className={`w-4 h-4 ${reconciling ? "animate-spin" : ""}`} />
            {reconciling ? "Reconciling…" : "Reconcile"}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Record Payment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
              <form onSubmit={handleRecord} className="space-y-4 mt-2">
                <div className="space-y-1">
                  <Label>Bill</Label>
                  <select required className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={form.billId} onChange={e => handleBillChange(e.target.value)}>
                    <option value="">Select unpaid bill…</option>
                    {(bills ?? []).map(b => {
                      const remaining = b.totalAmount - (b.paidAmount ?? 0);
                      return (
                        <option key={b.id} value={b.id}>
                          {b.customerName} — ₹{remaining.toLocaleString()} due ({new Date(b.year, b.month - 1).toLocaleString("default", { month: "short", year: "numeric" })})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Amount (₹)</Label>
                    <Input required type="number" placeholder="Amount received" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Method</Label>
                    <select className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                      {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Status</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="paid">Paid in Full</option>
                    <option value="partial">Partial Payment</option>
                  </select>
                </div>
                <div className="space-y-1"><Label>Payment Date</Label><Input type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Notes</Label><Input placeholder="Optional" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={record.isPending} className="flex-1">{record.isPending ? "Recording…" : "Record"}</Button>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Collection Summary */}
      {summary && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">This Month's Collection</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div><p className="text-xs text-muted-foreground">Billed</p><p className="text-xl font-bold">₹{summary.totalBilled.toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Collected</p><p className="text-xl font-bold text-green-600">₹{summary.totalCollected.toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-xl font-bold text-destructive">₹{summary.outstandingAmount.toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Rate</p><p className="text-xl font-bold">{summary.collectionRate}%</p></div>
            </div>
            <Progress value={summary.collectionRate} className={summary.collectionRate < 60 ? "[&>div]:bg-destructive" : summary.collectionRate < 80 ? "[&>div]:bg-yellow-500" : ""} />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" />{summary.paidCount} paid</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded-full" />{summary.partialCount} partial</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full" />{summary.unpaidCount} unpaid</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter + Search */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1">
          {["all","paid","partial","unpaid"].map(s => (
            <button key={s} onClick={() => { setFilterStatus(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground border"}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customer…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-8" />
        </div>
      </div>

      {/* Payments list */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {paginated.map(p => (
            <Card key={p.id}>
              <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.customerName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("en-IN") : "No date"}</span>
                      {(p as any).method && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{(p as any).method.replace("_", " ")}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-semibold">₹{p.amount.toLocaleString()}</span>
                  <Badge className={p.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"} variant="secondary">
                    {p.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <IndianRupee className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{search ? "No payments match your search." : "No payment records found."}</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {totalPages} · {filtered.length} payments</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
