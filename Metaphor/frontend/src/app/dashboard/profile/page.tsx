"use client";

import React, { useEffect, useState } from "react";
import { Mail, CheckCircle2, LogOut, Shield } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { fetchFromMetaphor } from "@/app/api";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const data = await fetchFromMetaphor("/auth/me");
        setUser(data);
      } catch (e) {
        console.error("Failed to fetch user profile:", e);
      }
    }
    fetchUser();
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("metaphor_api_key");
    localStorage.removeItem("metaphor_token");
    import("@/lib/settings").then(m => m.pushSettingsToCloud());
    router.push("/");
  };

  const name = user ? (user.name || "Your Workspace") : "Loading...";
  const email = user ? (user.email || "") : "...";
  const initial = name.charAt(0).toUpperCase();
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Loading...';

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-150 max-w-3xl mx-auto p-8">
      
      <header className="mb-10 flex items-end gap-6">
        <div className="w-24 h-24 rounded-2xl bg-foreground text-background flex items-center justify-center text-4xl font-bold shadow-lg">
          {initial}
        </div>
        <div className="pb-2">
          <h1 className="text-3xl font-semibold text-foreground tracking-tight mb-1">{name}</h1>
          <p className="text-sm text-muted flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4" /> {email}
          </p>
          <p className="text-muted text-sm flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            Member since {memberSince}
          </p>
        </div>
      </header>

      <div className="space-y-6">
        
        {/* Plan Info */}
        <Card className="flex items-center justify-between border-primary/20 bg-primary/5">
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" /> Metaphor Pro
            </h2>
            <p className="text-xs text-muted">Unlimited nodes and active webhook ingestion.</p>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2 bg-background border border-border-strong text-xs font-medium rounded-lg hover:border-primary transition-colors shadow-sm">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </Card>

        {/* Account Details */}
        <Card noPadding className="divide-y divide-border-subtle">
          <div className="p-5 flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Full Name</span>
            <span className="text-sm font-semibold text-foreground">{name}</span>
          </div>
          <div className="p-5 flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Email Address</span>
            <span className="text-sm font-semibold text-foreground">{email}</span>
          </div>
          <div className="p-5 flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Member Since</span>
            <span className="text-sm font-semibold text-foreground">August 2026</span>
          </div>
        </Card>

        <button className="w-full p-4 rounded-xl border border-border-subtle text-accent-red font-medium text-sm flex items-center justify-center gap-2 hover:bg-accent-red/5 transition-colors mt-8">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>

      </div>
    </div>
  );
}
