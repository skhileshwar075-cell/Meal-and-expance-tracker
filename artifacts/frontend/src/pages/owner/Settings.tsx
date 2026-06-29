import React, { useState, useEffect } from "react";
import { useGetOwnerProfile, useUpdateOwnerProfile, useGenerateServiceCode, getGetOwnerProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Building2, Phone, MapPin, User, RefreshCw, Copy } from "lucide-react";

export default function OwnerSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { logout } = useAuth();
  const { data: profile, isLoading } = useGetOwnerProfile();
  const update = useUpdateOwnerProfile();
  const genCode = useGenerateServiceCode();
  const [form, setForm] = useState({ businessName: "", ownerName: "", phone: "", address: "" });
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);

  useEffect(() => {
    if (profile) setForm({ businessName: profile.businessName ?? "", ownerName: profile.ownerName ?? "", phone: profile.phone ?? "", address: profile.address ?? "" });
    if (profile?.serviceCode) setCode({ code: profile.serviceCode, expiresAt: "" });
  }, [profile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync({ data: form });
      qc.invalidateQueries({ queryKey: getGetOwnerProfileQueryKey() });
      toast({ title: "Profile updated" });
    } catch {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    }
  }

  async function handleGenCode() {
    try {
      const result = await genCode.mutateAsync();
      setCode(result);
      qc.invalidateQueries({ queryKey: getGetOwnerProfileQueryKey() });
      toast({ title: "New invite code generated", description: `Code: ${result.code}` });
    } catch {
      toast({ title: "Error", description: "Failed to generate code", variant: "destructive" });
    }
  }

  function copyCode() {
    if (!code) return;
    navigator.clipboard.writeText(code.code);
    toast({ title: "Copied!", description: "Invite code copied to clipboard" });
  }

  return (
    <div className="space-y-6 max-w-2xl lg:max-w-4xl mx-auto px-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your business profile and invite code</p>
      </div>

      {/* Service Invite Code */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3"><CardTitle className="text-base">Service Invite Code</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Share this code with students to let them connect to your service.</p>
          {code ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-2xl font-bold tracking-widest text-center">{code.code}</div>
              <Button variant="outline" size="icon" onClick={copyCode}><Copy className="w-4 h-4" /></Button>
            </div>
          ) : (
            <div className="bg-muted rounded-lg px-4 py-3 text-center text-muted-foreground text-sm">No code generated yet</div>
          )}
          <Button onClick={handleGenCode} disabled={genCode.isPending} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${genCode.isPending ? "animate-spin" : ""}`} />
            {genCode.isPending ? "Generating…" : code ? "Generate New Code" : "Generate Code"}
          </Button>
          {code?.expiresAt && <p className="text-xs text-muted-foreground">Expires: {new Date(code.expiresAt).toLocaleDateString()}</p>}
        </CardContent>
      </Card>

      {/* Business Profile */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" />Business Profile</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">{[1,2,3,4].map(i=><Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label>Business Name</Label>
                <div className="relative"><Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={form.businessName} onChange={e => setForm(f => ({...f, businessName: e.target.value}))} /></div>
              </div>
              <div className="space-y-1">
                <Label>Owner Name</Label>
                <div className="relative"><User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={form.ownerName} onChange={e => setForm(f => ({...f, ownerName: e.target.value}))} /></div>
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <div className="relative"><Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="+91 99887 76655" /></div>
              </div>
              <div className="space-y-1">
                <Label>Address</Label>
                <div className="relative"><MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} /></div>
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={profile?.email ?? ""} disabled className="bg-muted" />
              </div>
              <Button type="submit" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save Changes"}</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader className="pb-3"><CardTitle className="text-base text-destructive">Danger Zone</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Sign out of your account.</p>
          <Button variant="destructive" size="sm" onClick={logout}>Sign Out</Button>
        </CardContent>
      </Card>
    </div>
  );
}
