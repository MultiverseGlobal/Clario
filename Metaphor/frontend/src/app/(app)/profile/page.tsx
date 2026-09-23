"use client";

import React, { useEffect, useState } from "react";
import { Mail, CheckCircle2, LogOut, Shield, Key, ArrowRight } from "lucide-react";
import { fetchFromMetaphor } from "@/app/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const data = await fetchFromMetaphor("/auth/me");
        setUser(data);
      } catch (e) {
        console.error("Failed to fetch user profile:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("metaphor_api_key");
      localStorage.removeItem("metaphor_token");
      localStorage.removeItem("metaphor_user_name");
      document.cookie = "metaphor_onboarded=; path=/; max-age=0";
      document.cookie = "metaphor_unlocked=; path=/; max-age=0";
    }
    import("@/lib/settings").then((m) => m.pushSettingsToCloud()).catch(() => {});
    router.push("/login");
  };

  const name = user?.name || (typeof window !== "undefined" ? localStorage.getItem("metaphor_user_name") : "") || "Metaphor Developer";
  const email = user?.email || "developer@local.pseudonyms";
  const initial = (name || "M").charAt(0).toUpperCase();
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "September 2026";

  return (
    <div className="flex flex-col min-h-screen bg-transparent max-w-4xl mx-auto px-6 md:px-12 py-12 md:py-20 animate-in fade-in duration-200">
      {/* ── Profile Header ── */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[rgba(10,10,10,0.06)]">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-[var(--color-ink)] text-white flex items-center justify-center font-display text-3xl font-medium shadow-md">
            {initial}
          </div>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest uppercase text-[#AEB7BC] mb-1">
              <span>Identity &amp; Master Workspace</span>
            </div>
            <h1 className="font-display text-[clamp(32px,4vw,44px)] leading-tight font-normal text-[var(--color-ink)]">
              {name}
            </h1>
            <p className="text-[13px] text-[#555E64] flex items-center gap-2 mt-1">
              <Mail className="w-3.5 h-3.5 text-[#AEB7BC]" /> {email}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[rgba(10,10,10,0.12)] bg-white/80 hover:bg-white hover:border-[var(--color-ink)] transition-all text-[13px] font-medium text-[var(--color-ink)] shadow-sm shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </header>

      <div className="space-y-6">
        {/* Workspace Plan Card */}
        <div className="p-6 rounded-2xl border border-[rgba(10,10,10,0.08)] bg-white/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h2 className="text-[15px] font-medium text-[var(--color-ink)]">
                Metaphor Sovereign Node
              </h2>
            </div>
            <p className="text-[13px] text-[#555E64]">
              Multi-tenant coordination mesh, local graph RAG, and live MCP tool dispatch active.
            </p>
          </div>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-[12px] font-mono tracking-wider uppercase text-[var(--color-ink)] hover:underline whitespace-nowrap"
          >
            <span>Manage Settings</span>
            <ArrowRight size={12} />
          </Link>
        </div>

        {/* Account Details Glass Card */}
        <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] bg-white/70 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.02)] divide-y divide-[rgba(10,10,10,0.06)] overflow-hidden">
          <div className="p-5 flex items-center justify-between">
            <span className="text-[13px] text-[#555E64]">Full Name</span>
            <span className="text-[13px] font-medium text-[var(--color-ink)]">{name}</span>
          </div>
          <div className="p-5 flex items-center justify-between">
            <span className="text-[13px] text-[#555E64]">Email Address</span>
            <span className="text-[13px] font-medium text-[var(--color-ink)]">{email}</span>
          </div>
          <div className="p-5 flex items-center justify-between">
            <span className="text-[13px] text-[#555E64]">Coordination Scope</span>
            <span className="text-[12px] font-mono text-[var(--color-ink)]">Default Organization</span>
          </div>
          <div className="p-5 flex items-center justify-between">
            <span className="text-[13px] text-[#555E64]">Member Since</span>
            <span className="text-[13px] font-medium text-[var(--color-ink)]">{memberSince}</span>
          </div>
        </div>

        {/* Secondary Navigation Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <Link
            href="/api"
            className="p-5 rounded-2xl border border-[rgba(10,10,10,0.08)] bg-white/60 hover:bg-white/90 hover:border-[rgba(10,10,10,0.18)] transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[rgba(17,19,21,0.04)] flex items-center justify-center text-[var(--color-ink)]">
                <Key size={16} />
              </div>
              <div>
                <div className="text-[13px] font-medium text-[var(--color-ink)]">API &amp; MCP Access</div>
                <div className="text-[11px] text-[#AEB7BC]">View tokens &amp; remote SSE URIs</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-[#AEB7BC] group-hover:text-[var(--color-ink)] transition-colors" />
          </Link>

          <Link
            href="/connections"
            className="p-5 rounded-2xl border border-[rgba(10,10,10,0.08)] bg-white/60 hover:bg-white/90 hover:border-[rgba(10,10,10,0.18)] transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[rgba(17,19,21,0.04)] flex items-center justify-center text-[var(--color-ink)]">
                <Shield size={16} />
              </div>
              <div>
                <div className="text-[13px] font-medium text-[var(--color-ink)]">Connected Tools</div>
                <div className="text-[11px] text-[#AEB7BC]">Manage agent scopes &amp; servers</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-[#AEB7BC] group-hover:text-[var(--color-ink)] transition-colors" />
          </Link>
        </div>

        {/* Big Bottom Sign Out Action */}
        <button
          onClick={handleSignOut}
          className="w-full p-4 rounded-2xl border border-red-200 bg-red-50/40 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors text-[13px] font-medium flex items-center justify-center gap-2 mt-8 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Metaphor</span>
        </button>
      </div>
    </div>
  );
}
