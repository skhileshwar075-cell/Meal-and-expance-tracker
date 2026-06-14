import React, { useState, useMemo, useEffect } from "react";
import {
  useListBills, useGenerateBill, useUpdateBill, useListCustomers,
  getListBillsQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { FileText, Plus, CheckCircle2, Clock, AlertCircle, Search, ChevronLeft, ChevronRight, Layers, Eye, UtensilsCrossed } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 10;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  paid:    { label: "Paid",    color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",   icon: CheckCircle2 },
  unpaid:  { label: "Unpaid",  color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",           icon: AlertCircle },
  partial: { label: "Partial", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400", icon: Clock },
};

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

export default function Billing() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const now = new Date();

  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editBill, setEditBill] = useState<any>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  const [genForm, setGenForm] = useState({
    customerId: "", month: now.getMonth() + 1, year: now.getFullYear(), discount: "", extraCharges: "", notes: "",
  });
  const [editForm, setEditForm] = useState({ discount: "", extraCharges: "", notes: "", status: "unpaid" });
  const [bulkForm, setBulkForm] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });

  const { data: bills, isLoading } = useListBills({ month: filterMonth, year: filterYear, status: filterStatus as any });
  const { data: customers } = useListCustomers({ status: "active" });
  const generateBill = useGenerateBill();
  const updateBill = useUpdateBill();

  // Bill preview — auto-fetches when customer + month + year are all set
  const canPreview = Boolean(genForm.customerId && genForm.month && genForm.year);
  const { data: preview, isFetching: previewLoading } = useQuery<any>({
    queryKey: ["bill-preview", genForm.customerId, genForm.month, genForm.year],
    queryFn: () => authFetch(`/api/bills/preview?customerId=${genForm.customerId}&month=${genForm.month}&year=${genForm.year}`),
    enabled: canPreview,
    staleTime: 30_000,
  });

  const discountNum = Number(genForm.discount) || 0;
  const extraNum = Number(genForm.extraCharges) || 0;
  const estimatedTotal = preview ? Math.max(0, preview.baseAmount - discountNum + extraNum) : null;

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await generateBill.mutateAsync({ data: {
        customerId: Number(genForm.customerId), month: Number(genForm.month), year: Number(genForm.year),
        discount: genForm.discount ? Number(genForm.discount) : undefined,
        extraCharges: genForm.extraCharges ? Number(genForm.extraCharges) : undefined,
        notes: genForm.notes || undefined,
      }});
      qc.invalidateQueries({ queryKey: getListBillsQueryKey() });
      toast({ title: "Bill generated" });
      setGenerateOpen(false);
      setGenForm({ customerId: "", month: now.getMonth() + 1, year: now.getFullYear(), discount: "", extraCharges: "", notes: "" });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed to generate bill", variant: "destructive" });
    }
  }

  async function handleBulkGenerate() {
    setBulkGenerating(true);
    try {
      const result = await authFetch("/api/bills/bulk", {
        method: "POST",
        body: JSON.stringify({ month: bulkForm.month, year: bulkForm.year }),
      });
      qc.invalidateQueries({ queryKey: getListBillsQueryKey() });
      toast({
        title: `Bulk billing complete`,
        description: `Generated ${result.generated} bill${result.generated !== 1 ? "s" : ""}${result.skipped > 0 ? `, skipped ${result.skipped} (already exist)` : ""}.`,
      });
      setBulkOpen(false);
    } catch (e: any) {
      toast({ title: "Bulk generation failed", description: e?.message, variant: "destructive" });
    } finally {
      setBulkGenerating(false);
    }
  }

  async function handleEditBill(e: React.FormEvent) {
    e.preventDefault();
    if (!editBill) return;
    try {
      await updateBill.mutateAsync({ id: editBill.id, data: {
        discount: editForm.discount ? Number(editForm.discount) : undefined,
        extraCharges: editForm.extraCharges ? Number(editForm.extraCharges) : undefined,
        notes: editForm.notes || undefined,
        status: editForm.status as any,
      }});
      qc.invalidateQueries({ queryKey: getListBillsQueryKey() });
      toast({ title: "Bill updated" });
      setEditBill(null);
    } catch {
      toast({ title: "Error", description: "Failed to update bill", variant: "destructive" });
    }
  }

  const totalBilled = (bills ?? []).reduce((s, b) => s + b.totalAmount, 0);
  const totalCollected = (bills ?? []).reduce((s, b) => s + (b.paidAmount ?? 0), 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bills ?? [];
    return (bills ?? []).filter(b => b.customerName.toLowerCase().includes(q));
  }, [bills, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground text-sm mt-1">Generate and manage monthly bills</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setBulkOpen(true)}>
            <Layers className="w-4 h-4" />Generate All
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setGenerateOpen(true)}>
            <Plus className="w-4 h-4" />Generate Bill
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Billed", value: `₹${totalBilled.toLocaleString()}`, color: "" },
          { label: "Collected",    value: `₹${totalCollected.toLocaleString()}`, color: "text-green-600" },
          { label: "Outstanding",  value: `₹${(totalBilled - totalCollected).toLocaleString()}`, color: "text-destructive" },
        ].map(s => (
          <Card key={s.label}><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <select className="border rounded-md px-3 py-2 text-sm bg-background" value={filterMonth} onChange={e => { setFilterMonth(Number(e.target.value)); setPage(1); }}>
          {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <Input type="number" className="w-24" value={filterYear} onChange={e => { setFilterYear(Number(e.target.value)); setPage(1); }} />
        <div className="flex gap-1">
          {["all","paid","unpaid","partial"].map(s => (
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

      {/* Bills list */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {paginated.map(bill => {
            const { label, color, icon: Icon } = STATUS_CONFIG[bill.status] ?? STATUS_CONFIG.unpaid;
            return (
              <Card key={bill.id} className="cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => { setEditBill(bill); setEditForm({ discount: bill.discount != null ? String(bill.discount) : "", extraCharges: bill.extraCharges != null ? String(bill.extraCharges) : "", notes: bill.notes ?? "", status: bill.status }); }}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{bill.customerName}</p>
                        <p className="text-xs text-muted-foreground">{MONTHS[bill.month - 1]} {bill.year} · {bill.mealsConsumed} meals</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold">₹{bill.totalAmount.toLocaleString()}</p>
                        {bill.status === "partial" && bill.paidAmount != null && <p className="text-xs text-muted-foreground">Paid: ₹{bill.paidAmount.toLocaleString()}</p>}
                        {bill.discount != null && bill.discount > 0 && <p className="text-xs text-green-600">-₹{bill.discount} disc</p>}
                      </div>
                      <Badge className={`${color} text-xs`}><Icon className="w-3 h-3 mr-1" />{label}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{search ? "No bills match your search." : "No bills for this period."}</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {totalPages} · {filtered.length} bills</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* ── Generate Bill Dialog (with preview) ── */}
      <Dialog open={generateOpen} onOpenChange={v => { setGenerateOpen(v); if (!v) setGenForm({ customerId: "", month: now.getMonth() + 1, year: now.getFullYear(), discount: "", extraCharges: "", notes: "" }); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Generate Bill</DialogTitle></DialogHeader>
          <form onSubmit={handleGenerate} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Customer</Label>
              <select required className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={genForm.customerId} onChange={e => setGenForm(f => ({ ...f, customerId: e.target.value }))}>
                <option value="">Select customer…</option>
                {(customers ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Month</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={genForm.month} onChange={e => setGenForm(f => ({ ...f, month: Number(e.target.value) }))}>
                  {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Year</Label>
                <Input type="number" value={genForm.year} onChange={e => setGenForm(f => ({ ...f, year: Number(e.target.value) }))} />
              </div>
            </div>

            {/* Preview panel */}
            {canPreview && (
              <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Eye className="w-3.5 h-3.5" />Bill Preview
                </div>
                {previewLoading ? (
                  <div className="space-y-1.5"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
                ) : preview ? (
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1"><UtensilsCrossed className="w-3.5 h-3.5" />Meals consumed</span>
                      <span className="font-medium">{preview.mealsConsumed} / {preview.expectedMeals} expected</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plan</span>
                      <span className="font-medium">{preview.planName ?? "None (default ₹50/meal)"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rate</span>
                      <span className="font-medium">₹{preview.rate}/meal</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base amount</span>
                      <span className="font-medium">₹{preview.baseAmount.toLocaleString()}</span>
                    </div>
                    {(discountNum > 0 || extraNum > 0) && (
                      <>
                        {discountNum > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>− ₹{discountNum}</span></div>}
                        {extraNum > 0 && <div className="flex justify-between text-orange-600"><span>Extra charges</span><span>+ ₹{extraNum}</span></div>}
                      </>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Estimated total</span>
                      <span>₹{(estimatedTotal ?? preview.baseAmount).toLocaleString()}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Discount (₹)</Label><Input type="number" placeholder="0" value={genForm.discount} onChange={e => setGenForm(f => ({ ...f, discount: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Extra Charges (₹)</Label><Input type="number" placeholder="0" value={genForm.extraCharges} onChange={e => setGenForm(f => ({ ...f, extraCharges: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Input placeholder="Optional notes" value={genForm.notes} onChange={e => setGenForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={generateBill.isPending || !canPreview} className="flex-1">
                {generateBill.isPending ? "Generating…" : "Confirm & Generate"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Generate Dialog ── */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate Bills for All Customers</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Generates bills for all <strong>active</strong> customers for the selected month based on their actual attendance. Customers who already have a bill for the period will be skipped.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Month</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={bulkForm.month} onChange={e => setBulkForm(f => ({ ...f, month: Number(e.target.value) }))}>
                  {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Year</Label>
                <Input type="number" value={bulkForm.year} onChange={e => setBulkForm(f => ({ ...f, year: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              <strong>{(customers ?? []).length}</strong> active customer{(customers ?? []).length !== 1 ? "s" : ""} will be processed.
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleBulkGenerate} disabled={bulkGenerating} className="flex-1">
                {bulkGenerating ? "Generating…" : `Generate for ${MONTHS[bulkForm.month - 1]} ${bulkForm.year}`}
              </Button>
              <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Bill Dialog ── */}
      <Dialog open={!!editBill} onOpenChange={v => !v && setEditBill(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Bill — {editBill?.customerName}</DialogTitle></DialogHeader>
          <div className="text-sm text-muted-foreground mb-2">{MONTHS[(editBill?.month ?? 1) - 1]} {editBill?.year} · {editBill?.mealsConsumed} meals</div>
          <form onSubmit={handleEditBill} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Discount (₹)</Label><Input type="number" value={editForm.discount} onChange={e => setEditForm(f => ({ ...f, discount: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Extra Charges (₹)</Label><Input type="number" value={editForm.extraCharges} onChange={e => setEditForm(f => ({ ...f, extraCharges: e.target.value }))} /></div>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={updateBill.isPending} className="flex-1">{updateBill.isPending ? "Saving…" : "Save"}</Button>
              <Button type="button" variant="outline" onClick={() => setEditBill(null)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
