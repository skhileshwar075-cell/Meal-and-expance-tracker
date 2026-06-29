import React, { useState, useEffect } from "react";
import { useGetStudentProfile, useUpdateStudentProfile, getGetStudentProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { User, GraduationCap, MapPin, Phone } from "lucide-react";

export default function StudentSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { logout } = useAuth();
  const { data: profile, isLoading } = useGetStudentProfile();
  const update = useUpdateStudentProfile();

  const [form, setForm] = useState({ name: "", phone: "", college: "", address: "" });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name ?? "",
        phone: profile.phone ?? "",
        college: profile.college ?? "",
        address: profile.address ?? "",
      });
    }
  }, [profile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync({ data: { name: form.name, phone: form.phone, college: form.college, address: form.address } });
      qc.invalidateQueries({ queryKey: getGetStudentProfileQueryKey() });
      toast({ title: "Profile updated" });
    } catch {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6 max-w-2xl lg:max-w-4xl mx-auto px-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile and account</p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" />Profile Information</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label>Full Name</Label>
                <div className="relative"><User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <div className="relative"><Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="+91 98765 43210" /></div>
              </div>
              <div className="space-y-1">
                <Label>College</Label>
                <div className="relative"><GraduationCap className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={form.college} onChange={e => setForm(f => ({...f, college: e.target.value}))} placeholder="e.g. IIT Bombay" /></div>
              </div>
              <div className="space-y-1">
                <Label>Address</Label>
                <div className="relative"><MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} placeholder="Hostel address" /></div>
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={profile?.email ?? ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <Button type="submit" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save Changes"}</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader className="pb-3"><CardTitle className="text-base text-destructive">Danger Zone</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Sign out of your account on this device.</p>
          <Button variant="destructive" size="sm" onClick={logout}>Sign Out</Button>
        </CardContent>
      </Card>
    </div>
  );
}
