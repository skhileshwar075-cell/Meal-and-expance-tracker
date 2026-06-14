import React, { useState } from "react";
import {
  useListBudgets,
  useGetCurrentBudget,
  useCreateBudget,
  useUpdateBudget,
  getListBudgetsQueryKey,
  getGetCurrentBudgetQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus, Target, TrendingUp, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Budgets() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: current, isLoading: loadingCurrent } = useGetCurrentBudget();
  const { data: budgets, isLoading: loadingList } = useListBudgets();
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();

  const now = new Date();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    monthlyAmount: "",
    weeklyAmount: "",
    alertThreshold: "80",
  });

  function resetForm() {
    setForm({ month: now.getMonth() + 1, year: now.getFullYear(), monthlyAmount: "", weeklyAmount: "", alertThreshold: "80" });
    setEditId(null);
  }

  function openEdit(b: any) {
    setEditId(b.id);
    setForm({
      month: b.month, year: b.year,
      monthlyAmount: String(b.monthlyAmount),
      weeklyAmount: b.weeklyAmount ? String(b.weeklyAmount) : "",
      alertThreshold: b.alertThreshold ? String(b.alertThreshold) : "80",
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      month: Number(form.month), year: Number(form.year),
      monthlyAmount: Number(form.monthlyAmount),
      weeklyAmount: form.weeklyAmount ? Number(form.weeklyAmount) : undefined,
      alertThreshold: form.alertThreshold ? Number(form.alertThreshold) : undefined,
    };
    try {
      if (editId) {
        await updateBudget.mutateAsync({ id: editId, data: payload });
        toast({ title: "Budget updated" });
      } else {
        await createBudget.mutateAsync({ data: payload });
        toast({ title: "Budget created" });
      }
      qc.invalidateQueries({ queryKey: getListBudgetsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetCurrentBudgetQueryKey() });
      setOpen(false);
      resetForm();
    } catch {
      toast({ title: "Error", description: "Failed to save budget", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground text-sm mt-1">Set monthly and weekly spending limits</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Set Budget</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Update Budget" : "Set Budget"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Month</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.month} onChange={e => setForm(f => ({ ...f, month: Number(e.target.value) }))}>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Year</Label>
                  <Input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Monthly Budget (₹)</Label>
                <Input required type="number" placeholder="e.g. 8000" value={form.monthlyAmount} onChange={e => setForm(f => ({ ...f, monthlyAmount: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Weekly Budget (₹) <span className="text-muted-foreground">(optional)</span></Label>
                <Input type="number" placeholder="e.g. 2000" value={form.weeklyAmount} onChange={e => setForm(f => ({ ...f, weeklyAmount: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Alert Threshold (%)</Label>
                <Input type="number" min="1" max="100" value={form.alertThreshold} onChange={e => setForm(f => ({ ...f, alertThreshold: e.target.value }))} />
                <p className="text-xs text-muted-foreground">Get alerted when spending reaches this % of budget</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={createBudget.isPending || updateBudget.isPending} className="flex-1">
                  {createBudget.isPending || updateBudget.isPending ? "Saving…" : editId ? "Update" : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Budget Status */}
      {loadingCurrent ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : current?.budget ? (
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {MONTHS[current.budget.month - 1]} {current.budget.year} — Current Month
              </CardTitle>
              <div className="flex gap-2">
                {current.isAtRisk && <Badge variant="destructive">At Risk</Badge>}
                <Badge variant="outline">{current.percentUsed}% used</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={Math.min(100, current.percentUsed)} className={current.percentUsed > 90 ? "[&>div]:bg-destructive" : current.percentUsed > 70 ? "[&>div]:bg-yellow-500" : ""} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-lg font-bold">₹{current.budget.monthlyAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Spent</p>
                <p className="text-lg font-bold text-destructive">₹{current.spent.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className={`text-lg font-bold ${current.remaining < 0 ? "text-destructive" : "text-green-600"}`}>₹{current.remaining.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Days Left</p>
                <p className="text-lg font-bold">{current.daysLeft}</p>
              </div>
            </div>
            {current.isAtRisk && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Projected spend: ₹{Math.round(current.projectedSpend).toLocaleString()} — exceeds your budget of ₹{current.budget.monthlyAmount.toLocaleString()}.
                </AlertDescription>
              </Alert>
            )}
            <Button variant="outline" size="sm" onClick={() => openEdit(current.budget)}>Edit Budget</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No budget set for this month.</p>
            <p className="text-xs mt-1">Click "Set Budget" to get started.</p>
          </CardContent>
        </Card>
      )}

      {/* Budget History */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Budget History</h2>
        {loadingList ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : budgets && budgets.length > 0 ? (
          <div className="space-y-2">
            {budgets.map(b => (
              <Card key={b.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => openEdit(b)}>
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{MONTHS[b.month - 1]} {b.year}</p>
                      {b.weeklyAmount && <p className="text-xs text-muted-foreground">Weekly: ₹{b.weeklyAmount.toLocaleString()}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{b.monthlyAmount.toLocaleString()}</p>
                    {b.alertThreshold && <p className="text-xs text-muted-foreground">Alert at {b.alertThreshold}%</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 opacity-40" />
              No budget history yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
