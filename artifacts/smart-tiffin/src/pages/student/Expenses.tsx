import React, { useState, useMemo } from "react";
import {
  useListExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense,
  getListExpensesQueryKey, ExpenseCategory,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2, Pencil, IndianRupee, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const CATEGORIES = ["food", "transport", "education", "entertainment", "shopping", "medical", "other"] as const;

const CAT_COLOR: Record<string, string> = {
  food: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  transport: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  education: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  entertainment: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400",
  shopping: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
  medical: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const PAGE_SIZE = 10;

const expenseSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be at least 1"),
  category: z.enum(CATEGORIES),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
});
type ExpenseFormValues = z.infer<typeof expenseSchema>;

export default function Expenses() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: expenses, isLoading } = useListExpenses({ month, year });
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const addForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { amount: 0, category: "food", description: "", date: now.toISOString().split("T")[0] },
  });

  const editForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { amount: 0, category: "food", description: "", date: "" },
  });

  function openEdit(exp: any) {
    setEditExpense(exp);
    editForm.reset({
      amount: exp.amount,
      category: exp.category,
      description: exp.description ?? "",
      date: exp.date,
    });
  }

  const filtered = useMemo(() => {
    let list = expenses ?? [];
    if (categoryFilter !== "all") list = list.filter(e => e.category === categoryFilter);
    if (search.trim()) list = list.filter(e =>
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      (e.description ?? "").toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [expenses, categoryFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);

  function resetPage() { setPage(1); }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey({ month, year }) });

  const onAdd = (data: ExpenseFormValues) => {
    createExpense.mutate({ data }, {
      onSuccess: () => { invalidate(); setAddOpen(false); addForm.reset(); toast({ title: "Expense added" }); },
      onError: (e: any) => toast({ title: "Failed to add expense", description: e.message, variant: "destructive" }),
    });
  };

  const onEdit = (data: ExpenseFormValues) => {
    if (!editExpense) return;
    updateExpense.mutate({ id: editExpense.id, data }, {
      onSuccess: () => { invalidate(); setEditExpense(null); toast({ title: "Expense updated" }); },
      onError: (e: any) => toast({ title: "Failed to update expense", description: e.message, variant: "destructive" }),
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this expense?")) return;
    deleteExpense.mutate({ id }, {
      onSuccess: () => { invalidate(); toast({ title: "Expense deleted" }); },
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Expenses</h2>
          {filtered.length > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {filtered.length} entries · Total ₹{totalAmount.toLocaleString()}
            </p>
          )}
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
            <ExpenseForm form={addForm} onSubmit={onAdd} isPending={createExpense.isPending} label="Save" />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-2">
        {/* Month + Year */}
        <Select value={month.toString()} onValueChange={(v) => { setMonth(parseInt(v)); resetPage(); }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => <SelectItem key={i+1} value={(i+1).toString()}>{m}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={year.toString()} onValueChange={(v) => { setYear(parseInt(v)); resetPage(); }}>
          <SelectTrigger className="w-[90px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[year - 2, year - 1, year, year + 1].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Category filter */}
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); resetPage(); }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search description…"
            value={search}
            onChange={e => { setSearch(e.target.value); resetPage(); }}
            className="pl-8"
          />
        </div>
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : paginated.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground flex flex-col items-center">
              <IndianRupee className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">No expenses found</p>
              <p className="text-xs mt-1">
                {(expenses ?? []).length === 0
                  ? "Try a different month or add your first expense."
                  : "Try clearing the search or category filter."}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {paginated.map((expense) => (
                <div key={expense.id} className="p-3 sm:p-4 flex items-start sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                      <IndianRupee className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className={`${CAT_COLOR[expense.category]} text-[10px] capitalize`} variant="secondary">
                          {expense.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(expense.date), "MMM d, yyyy")}
                        </span>
                      </div>
                      {expense.description && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">{expense.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="font-semibold text-base mr-2">₹{expense.amount.toLocaleString()}</span>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(expense)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(expense.id)}
                      disabled={deleteExpense.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {totalPages} · {filtered.length} results</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editExpense} onOpenChange={v => !v && setEditExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <ExpenseForm form={editForm} onSubmit={onEdit} isPending={updateExpense.isPending} label="Save Changes" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExpenseForm({ form, onSubmit, isPending, label }: { form: any; onSubmit: (d: ExpenseFormValues) => void; isPending: boolean; label: string }) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-1">
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (₹)</FormLabel>
              <FormControl><Input type="number" min="1" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="category" render={({ field }) => (
          <FormItem>
            <FormLabel>Category</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description (optional)</FormLabel>
            <FormControl><Input placeholder="e.g. Lunch at canteen" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : label}
        </Button>
      </form>
    </Form>
  );
}
