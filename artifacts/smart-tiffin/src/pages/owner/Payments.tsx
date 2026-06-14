import React, { useState } from "react";
import {
  useListPayments, useRecordPayment, useListBills, useGetCollectionSummary,
  getListPaymentsQueryKey, getGetCollectionSummaryQueryKey, getListBillsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { IndianRupee, Plus, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const now = new Date();

export default function Payments() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ billId: "", amount: "", status: "paid", paymentDate: now.toISOString().split("T")[0], notes: "" });

  const { data: payments, isLoading } = useListPayments({ status: filterStatus as any });
  const { data: summary } = useGetCollectionSummary({ month: now.getMonth() + 1, year: now.getFullYear() });
  const { data: bills } = useListBills({ status: "unpaid" });
  const record = useRecordPayment();

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    try {
      await record.mutateAsync({ data: { billId: Number(form.billId), amount: Number(form.amount), status: form.status as any, paymentDate: form.paymentDate || undefined, notes: form.notes || undefined } });
      qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetCollectionSummaryQueryKey() });
      qc.invalidateQueries({ queryKey: getListBillsQueryKey() });
      toast({ title: "Payment recorded" });
      setOpen(false);
      setForm({ billId: "", amount: "", status: "paid", paymentDate: now.toISOString().split("T")[0], notes: "" });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed to record payment", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and record customer payments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Record Payment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
            <form onSubmit={handleRecord} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Bill</Label>
                <select required className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.billId} onChange={e => setForm(f => ({...f, billId: e.target.value}))}>
                  <option value="">Select unpaid bill…</option>
                  {(bills ?? []).map(b => <option key={b.id} value={b.id}>{b.customerName} — ₹{b.totalAmount} ({new Date(b.year, b.month - 1).toLocaleString("default", { month: "short", year: "numeric" })})</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label>Amount (₹)</Label><Input required type="number" placeholder="Amount received" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} /></div>
              <div className="space-y-1">
                <Label>Status</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                  <option value="paid">Paid in Full</option>
                  <option value="partial">Partial Payment</option>
                </select>
              </div>
              <div className="space-y-1"><Label>Payment Date</Label><Input type="date" value={form.paymentDate} onChange={e => setForm(f => ({...f, paymentDate: e.target.value}))} /></div>
              <div className="space-y-1"><Label>Notes</Label><Input placeholder="Optional" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} /></div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={record.isPending} className="flex-1">{record.isPending ? "Recording…" : "Record"}</Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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

      {/* Filter */}
      <div className="flex gap-1">
        {["all","paid","partial","unpaid"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground border"}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Payments list */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i=><Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : payments && payments.length > 0 ? (
        <div className="space-y-2">
          {payments.map(p => (
            <Card key={p.id}>
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{p.customerName}</p>
                    <p className="text-xs text-muted-foreground">{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("en-IN") : "No date"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
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
            <p className="text-sm">No payment records found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
