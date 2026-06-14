import React, { useState, useMemo } from "react";
import {
  useListCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer,
  useListMealPlans, getListCustomersQueryKey, CustomerInputStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2, Pencil, UserCircle, Search, ChevronLeft, ChevronRight, Phone, MapPin, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const PAGE_SIZE = 10;

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  inactive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  suspended: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  mobile: z.string().optional(),
  address: z.string().optional(),
  planId: z.string().optional(),
  status: z.enum(["active", "inactive", "suspended"]),
  startDate: z.string().min(1, "Start date is required"),
});
type CustomerFormValues = z.infer<typeof customerSchema>;

export default function Customers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<any>(null);

  const { data: customers, isLoading } = useListCustomers({ status: statusFilter as any });
  const { data: plans } = useListMealPlans();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const addForm = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", mobile: "", address: "", planId: "none", status: "active", startDate: new Date().toISOString().split("T")[0] },
  });

  const editForm = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", mobile: "", address: "", planId: "none", status: "active", startDate: "" },
  });

  function openEdit(c: any) {
    setEditCustomer(c);
    editForm.reset({
      name: c.name,
      mobile: c.mobile ?? "",
      address: c.address ?? "",
      planId: c.planId ? String(c.planId) : "none",
      status: c.status,
      startDate: c.startDate,
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (customers ?? []).filter(c =>
      !q || c.name.toLowerCase().includes(q) || (c.mobile ?? "").includes(q) || (c.address ?? "").toLowerCase().includes(q)
    );
  }, [customers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeCount = (customers ?? []).filter(c => c.status === "active").length;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });

  function buildPayload(data: CustomerFormValues) {
    return {
      name: data.name,
      mobile: data.mobile || undefined,
      address: data.address || undefined,
      planId: data.planId && data.planId !== "none" ? Number(data.planId) : undefined,
      startDate: data.startDate,
      status: data.status as CustomerInputStatus,
    };
  }

  const onAdd = (data: CustomerFormValues) => {
    createCustomer.mutate({ data: buildPayload(data) }, {
      onSuccess: () => { invalidate(); setAddOpen(false); addForm.reset(); toast({ title: "Customer added" }); },
      onError: (e: any) => toast({ title: "Failed to add customer", description: e.message, variant: "destructive" }),
    });
  };

  const onEdit = (data: CustomerFormValues) => {
    if (!editCustomer) return;
    updateCustomer.mutate({ id: editCustomer.id, data: buildPayload(data) }, {
      onSuccess: () => { invalidate(); setEditCustomer(null); toast({ title: "Customer updated" }); },
      onError: (e: any) => toast({ title: "Failed to update customer", description: e.message, variant: "destructive" }),
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this customer? This action cannot be undone.")) return;
    deleteCustomer.mutate({ id }, {
      onSuccess: () => { invalidate(); toast({ title: "Customer deleted" }); },
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
          {customers && <p className="text-sm text-muted-foreground mt-0.5">{activeCount} active · {customers.length} total</p>}
        </div>
        <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" />Add Customer
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v: any) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Customer list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : paginated.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground flex flex-col items-center">
              <UserCircle className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">No customers found</p>
              <p className="text-xs mt-1">Try clearing the search or status filter.</p>
            </div>
          ) : (
            <div className="divide-y">
              {paginated.map((customer) => (
                <div key={customer.id} className="p-3 sm:p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    {/* Avatar + info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                        {customer.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-sm">{customer.name}</span>
                          <Badge className={`${STATUS_COLORS[customer.status]} text-[10px]`} variant="secondary">
                            {customer.status}
                          </Badge>
                          {customer.planName && (
                            <Badge variant="outline" className="text-[10px]">{customer.planName}</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          {customer.mobile && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />{customer.mobile}
                            </span>
                          )}
                          {customer.address && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 truncate max-w-[200px]">
                              <MapPin className="w-3 h-3 flex-shrink-0" />{customer.address}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />Since {format(new Date(customer.startDate), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right side: outstanding + actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold">₹{(customer.outstandingAmount ?? 0).toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">outstanding</p>
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(customer)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(customer.id)}
                        disabled={deleteCustomer.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Mobile outstanding */}
                  <div className="sm:hidden mt-2 flex items-center gap-4 pl-13">
                    <span className="text-xs text-muted-foreground">Outstanding:</span>
                    <span className="text-sm font-semibold">₹{(customer.outstandingAmount ?? 0).toLocaleString()}</span>
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

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
          <CustomerForm form={addForm} onSubmit={onAdd} isPending={createCustomer.isPending} label="Add Customer" plans={plans ?? []} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editCustomer} onOpenChange={v => !v && setEditCustomer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer — {editCustomer?.name}</DialogTitle>
          </DialogHeader>
          <CustomerForm form={editForm} onSubmit={onEdit} isPending={updateCustomer.isPending} label="Save Changes" plans={plans ?? []} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomerForm({ form, onSubmit, isPending, label, plans }: {
  form: any; onSubmit: (d: CustomerFormValues) => void; isPending: boolean; label: string; plans: any[];
}) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-1">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Name *</FormLabel>
            <FormControl><Input placeholder="Full name" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="mobile" render={({ field }) => (
            <FormItem>
              <FormLabel>Mobile</FormLabel>
              <FormControl><Input placeholder="+91 XXXXX XXXXX" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="startDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date *</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="address" render={({ field }) => (
          <FormItem>
            <FormLabel>Address</FormLabel>
            <FormControl><Input placeholder="Room / hostel address" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="planId" render={({ field }) => (
            <FormItem>
              <FormLabel>Meal Plan</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? "none"}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No plan</SelectItem>
                  {plans.filter(p => p.isActive).map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : label}
        </Button>
      </form>
    </Form>
  );
}
