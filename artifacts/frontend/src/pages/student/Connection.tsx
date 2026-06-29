import React, { useState } from "react";
import {
  useGetMyConnection,
  useJoinTiffinService,
  useLeaveService,
  useGetStudentBills,
  getGetMyConnectionQueryKey,
  getGetStudentBillsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Link2, Unlink, FileText, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLOR: Record<string, string> = { paid: "text-green-600", unpaid: "text-destructive", partial: "text-yellow-600" };

export default function Connection() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [code, setCode] = useState("");

  const { data: connection, isLoading, error } = useGetMyConnection();
  const { data: bills } = useGetStudentBills();
  const join = useJoinTiffinService();
  const leave = useLeaveService();

  const isConnected = !!connection && !error;

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      await join.mutateAsync({ data: { serviceCode: code.toUpperCase().trim() } });
      toast({ title: "Connected!", description: "You've joined the tiffin service." });
      qc.invalidateQueries({ queryKey: getGetMyConnectionQueryKey() });
      qc.invalidateQueries({ queryKey: getGetStudentBillsQueryKey() });
      setCode("");
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Invalid or expired service code", variant: "destructive" });
    }
  }

  async function handleLeave() {
    try {
      await leave.mutateAsync();
      toast({ title: "Left service", description: "You've disconnected from the tiffin service." });
      qc.invalidateQueries({ queryKey: getGetMyConnectionQueryKey() });
    } catch {
      toast({ title: "Error", description: "Failed to leave service", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6 max-w-2xl lg:max-w-4xl mx-auto px-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tiffin Connection</h1>
        <p className="text-muted-foreground text-sm mt-1">Connect to your tiffin service to track bills and attendance</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : isConnected && connection ? (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-green-500" />
                {connection.businessName}
              </CardTitle>
              <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">Connected</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Joined</p>
                <p className="font-medium">{new Date(connection.joinedAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{connection.status}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5 gap-2" onClick={handleLeave} disabled={leave.isPending}>
              <Unlink className="w-4 h-4" />
              {leave.isPending ? "Leaving…" : "Leave Service"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Join a Tiffin Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Enter the invite code shared by your tiffin service owner to connect your account.</p>
            <form onSubmit={handleJoin} className="flex gap-3">
              <Input
                placeholder="Enter invite code (e.g. PATEL1)"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                className="uppercase font-mono tracking-widest"
                maxLength={10}
              />
              <Button type="submit" disabled={join.isPending || !code.trim()}>
                {join.isPending ? "Joining…" : "Connect"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Bills section */}
      {isConnected && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Bills</h2>
          {bills && bills.length > 0 ? (
            <div className="space-y-2">
              {bills.map(bill => (
                <Card key={bill.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{new Date(bill.year, bill.month - 1).toLocaleString("default", { month: "long", year: "numeric" })}</p>
                          <p className="text-xs text-muted-foreground">{bill.mealsConsumed} meals consumed</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold flex items-center gap-0.5"><IndianRupee className="w-3 h-3" />{bill.totalAmount.toLocaleString()}</p>
                        <p className={`text-xs font-medium capitalize ${STATUS_COLOR[bill.status] ?? ""}`}>{bill.status}</p>
                        {bill.status === "partial" && bill.paidAmount != null && <p className="text-xs text-muted-foreground">Paid: ₹{bill.paidAmount.toLocaleString()}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                <FileText className="w-6 h-6 mx-auto mb-2 opacity-40" />
                No bills generated yet.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
