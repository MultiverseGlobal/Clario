"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Shield, Check, ArrowRight } from "lucide-react";
import { ECOSYSTEM_APPS } from "@/lib/ecosystem";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

function AuthorizeForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  const clientId = searchParams.get("client_id") || "metaphor";
  const redirectUri = searchParams.get("redirect_uri") || "http://localhost:3000/auth/callback";
  const state = searchParams.get("state") || "";

  const app = ECOSYSTEM_APPS.find((a) => a.id === clientId) || ECOSYSTEM_APPS[0];
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const handleApprove = async () => {
    setApproving(true);
    
    const { data } = await createClient().auth.getSession();
    const session = data.session;
    
    setTimeout(() => {
      const target = new URL(redirectUri);
      if (session) {
        target.hash = `access_token=${session.access_token}&refresh_token=${session.refresh_token}&type=recovery`;
      } else {
        target.searchParams.set("error", "no_session");
      }
      if (state) target.searchParams.set("state", state);
      window.location.href = target.toString();
    }, 800);
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4">
      <div className="w-full max-w-[480px] pds-card p-8 space-y-6">
        
        {/* App connection header */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[var(--pds-surface-2)] border border-[var(--pds-border-strong)] flex items-center justify-center">
             <Shield className="w-6 h-6 text-[var(--pds-text-primary)]" />
          </div>

          <div>
            <h1 className="pds-title text-2xl mb-1">Authorize Access</h1>
            <p className="text-[13px] text-[var(--pds-text-secondary)] font-mono">
              <span className="text-[var(--pds-text-primary)] font-semibold">{app.name}</span> wants to connect to your Master Pseudonyms ID
            </p>
          </div>
        </div>

        {/* Master account info */}
        <div className="p-4 rounded-xl bg-[var(--pds-surface-2)] border border-[var(--pds-border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--pds-accent)] flex items-center justify-center font-bold text-xs text-[var(--pds-accent-inv)] font-mono">
              {user?.email?.slice(0, 2).toUpperCase() ?? "??"}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[var(--pds-text-primary)]">{user?.email?.split("@")[0] ?? "—"}</p>
              <p className="text-[11px] text-[var(--pds-text-muted)] font-mono">{user?.email ?? "—"}</p>
            </div>
          </div>
          <div className="pds-status-badge active">
            <div className="pds-status-dot active" />
            Sovereign
          </div>
        </div>

        {/* Permissions list */}
        <div className="space-y-3">
          <p className="pds-label mb-0">Requested Privileges</p>
          <div className="space-y-2">
            {app.permissions.map((perm) => (
              <div key={perm} className="flex items-center gap-2.5 text-[13px] text-[var(--pds-text-secondary)]">
                <Check className="w-4 h-4 text-[var(--pds-text-primary)] shrink-0" />
                <span className="font-mono">{perm}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Consent Buttons */}
        <div className="space-y-3 pt-4 border-t border-[var(--pds-border-subtle)]">
          <button
            onClick={handleApprove}
            disabled={approving}
            className="pds-btn-primary"
          >
            {approving ? "Exchanging Tokens..." : "Allow & Unlock Application"}
          </button>

          <button
            onClick={() => router.push("/")}
            disabled={approving}
            className="pds-btn-text w-full justify-center"
          >
            Deny Access & Return
          </button>
        </div>

      </div>
    </div>
  );
}

export default function AuthorizePage() {
  return (
    <Suspense fallback={<div className="text-white text-center py-20">Loading master identity...</div>}>
      <AuthorizeForm />
    </Suspense>
  );
}
