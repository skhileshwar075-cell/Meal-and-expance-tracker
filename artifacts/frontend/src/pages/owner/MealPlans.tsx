import React, { useState } from "react";
import {
  useListMealPlans, useCreateMealPlan, useUpdateMealPlan, useDeleteMealPlan,
  getListMealPlansQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Sunrise, Sunset, Sun, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PLAN_TYPE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  morning_only: { label: "Morning Only", icon: Sunrise, color: "text-orange-500" },
  evening_only: { label: "Evening Only", icon: Sunset, color: "text-blue-500" },
  both_meals: { label: "Both Meals", icon: Sun, color: "text-yellow-500" },
};

export default function MealPlans() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: plans, isLoading } = useListMealPlans();
  const createPlan = useCreateMealPlan();
  const updatePlan = useUpdateMealPlan();
  const deletePlan = useDeleteMealPlan();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", planType: "both_meals", pricePerMonth: "", pricePerMeal: "", billingType: "monthly", isActive: true });

  function resetForm() { setForm({ name: "", planType: "both_meals", pricePerMonth: "", pricePerMeal: "", billingType: "monthly", isActive: true }); setEditId(null); }

  function openEdit(p: any) {
    setEditId(p.id);
    setForm({ name: p.name, planType: p.planType, pricePerMonth: String(p.pricePerMonth), pricePerMeal: p.pricePerMeal ? String(p.pricePerMeal) : "", billingType: p.billingType, isActive: p.isActive });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name, planType: form.planType as any,
      pricePerMonth: Number(form.pricePerMonth),
      pricePerMeal: form.pricePerMeal ? Number(form.pricePerMeal) : undefined,
      billingType: form.billingType as any,
      isActive: form.isActive,
    };
    try {
      if (editId) {
        await updatePlan.mutateAsync({ id: editId, data: payload });
        toast({ title: "Plan updated" });
      } else {
        await createPlan.mutateAsync({ data: payload });
        toast({ title: "Plan created" });
      }
      qc.invalidateQueries({ queryKey: getListMealPlansQueryKey() });
      setOpen(false); resetForm();
    } catch {
      toast({ title: "Error", description: "Failed to save plan", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deletePlan.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListMealPlansQueryKey() });
      toast({ title: "Plan deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete plan", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meal Plans</h1>
          <p className="text-muted-foreground text-sm mt-1">Define pricing and plan types for your customers</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />New Plan</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit Plan" : "New Meal Plan"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Plan Name</Label>
                <Input required placeholder="e.g. Full Day Meal" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
              </div>
              <div className="space-y-1">
                <Label>Plan Type</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.planType} onChange={e => setForm(f => ({...f, planType: e.target.value}))}>
                  <option value="morning_only">Morning Only</option>
                  <option value="evening_only">Evening Only</option>
                  <option value="both_meals">Both Meals</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Billing Type</Label>
                <div className="flex gap-2">
                  {["monthly", "per_meal"].map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({...f, billingType: t}))}
                      className={`flex-1 py-2 rounded-md border text-sm ${form.billingType === t ? "border-primary bg-primary/10 font-medium" : "border-border"}`}>
                      {t === "monthly" ? "Monthly Flat" : "Per Meal"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Monthly Price (₹)</Label>
                <Input required type="number" placeholder="e.g. 3000" value={form.pricePerMonth} onChange={e => setForm(f => ({...f, pricePerMonth: e.target.value}))} />
              </div>
              {form.billingType === "per_meal" && (
                <div className="space-y-1">
                  <Label>Price Per Meal (₹)</Label>
                  <Input type="number" placeholder="e.g. 60" value={form.pricePerMeal} onChange={e => setForm(f => ({...f, pricePerMeal: e.target.value}))} />
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(f => ({...f, isActive: e.target.checked}))} className="w-4 h-4" />
                <Label htmlFor="isActive" className="cursor-pointer">Active plan</Label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={createPlan.isPending || updatePlan.isPending} className="flex-1">
                  {createPlan.isPending || updatePlan.isPending ? "Saving…" : editId ? "Update" : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i=><Skeleton key={i} className="h-40" />)}</div>
      ) : plans && plans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(p => {
            const { label, icon: Icon, color } = PLAN_TYPE_LABELS[p.planType] ?? PLAN_TYPE_LABELS.both_meals;
            return (
              <Card key={p.id} className={`${!p.isActive ? "opacity-60" : ""}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${color}`} />
                      <CardTitle className="text-base">{p.name}</CardTitle>
                    </div>
                    {!p.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{label} · {p.billingType === "monthly" ? "Monthly" : "Per Meal"}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline gap-1">
                    <IndianRupee className="w-4 h-4 text-muted-foreground" />
                    <span className="text-3xl font-bold">{p.pricePerMonth.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  {p.pricePerMeal && <p className="text-xs text-muted-foreground">₹{p.pricePerMeal}/meal</p>}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={() => openEdit(p)}><Pencil className="w-3 h-3" />Edit</Button>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => handleDelete(p.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Sun className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No meal plans yet.</p>
            <p className="text-xs mt-1">Create plans to assign to your customers.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
