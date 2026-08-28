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
      <div className="w-full max-w-md glass-panel rounded-2xl p-6 sm:p-8 border border-border-subtle shadow-2xl space-y-6">
        
        {/* App connection header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-brand-600 to-neon-cyan p-[1px] shadow-glow">
            <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
          </div>

          <div>
            <h1 className="text-lg font-bold text-white">Authorize Access</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">
              <span className="text-white font-semibold">{app.name}</span> wants to connect to your Master Pseudonyms ID
            </p>
          </div>
        </div>

        {/* Master account info */}
        <div className="p-3.5 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center font-bold text-xs text-white">
              {user?.email?.slice(0, 2).toUpperCase() ?? "??"}
            </div>
            <div>
              <p className="text-xs font-semibold text-white">{user?.email?.split("@")[0] ?? "—"}</p>
              <p className="text-[10px] text-slate-400 font-mono">{user?.email ?? "—"}</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-neon-emerald px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            Sovereign
          </span>
        </div>

        {/* Permissions list */}
        <div className="space-y-2">
          <p className="text-xs font-mono uppercase text-slate-400 tracking-wider">Requested Privileges:</p>
          <div className="space-y-1.5">
            {app.permissions.map((perm) => (
              <div key={perm} className="flex items-center gap-2 text-xs text-slate-300">
                <Check className="w-3.5 h-3.5 text-neon-cyan shrink-0" />
                <span className="font-mono text-[11px]">{perm}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Consent Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handleApprove}
            disabled={approving}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-neon-cyan text-white text-xs font-semibold shadow-glow hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{approving ? "Exchanging Tokens..." : "Allow & Unlock Application"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => router.push("/")}
            className="w-full py-2.5 text-xs text-slate-400 hover:text-white transition-colors"
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
