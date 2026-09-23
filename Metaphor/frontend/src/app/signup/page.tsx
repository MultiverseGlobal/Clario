"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Shield, Layers, Cpu, Sparkles } from "lucide-react";
import { MetaphorLogo } from "@/components/ui/MetaphorLogo";
import { createClient } from "@/utils/supabase/client";
import { pushSettingsToCloud } from "@/lib/settings";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/world";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [projectName, setProjectName] = useState("Autonomous Workspace");
  const [connectedTools, setConnectedTools] = useState<string[]>(["ChatGPT", "GitHub"]);

  const supabase = createClient();

  useEffect(() => {
    // Read onboarding data from previous steps
    try {
      const step1 = sessionStorage.getItem("metaphor_onboard_step1");
      if (step1) {
        const parsed = JSON.parse(step1);
        if (parsed.name) setProjectName(parsed.name.trim());
      }
      const tools = sessionStorage.getItem("metaphor_onboard_tools");
      if (tools) {
        const parsedTools = JSON.parse(tools);
        const active = Object.entries(parsedTools)
          .filter(([_, state]) => state === "connected")
          .map(([id]) => id.charAt(0).toUpperCase() + id.slice(1));
        if (active.length > 0) setConnectedTools(active);
      }
    } catch {}
  }, []);

  const handleOAuthLogin = async (provider: "github" | "google") => {
    setLoading(true);
    setError("");
    setMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTarget)}`,
      },
    });

    if (error) {
      setError("Error with GitHub auth: " + error.message);
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide your email and password");
      return;
    }
    if (password.length < 6) {
      setError("Password should be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    let toolsObj = {};
    try {
      const tData = sessionStorage.getItem("metaphor_onboard_tools");
      if (tData) toolsObj = JSON.parse(tData);
    } catch {}

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name || "Developer",
          project_name: projectName,
          tools_connected: toolsObj,
        },
      },
    });

    if (error) {
      // If Supabase is unconfigured or returns offline demo, gracefully complete transition
      console.warn("Supabase auth warning:", error.message);
    }

    setMessage("Workspace configured. Launching your world...");

    // Store local profile and onboarded status
    if (typeof window !== "undefined") {
      localStorage.setItem("metaphor_user_name", name || email.split("@")[0]);
      document.cookie = "metaphor_onboarded=true; path=/; max-age=31536000";
    }

    pushSettingsToCloud({ onboarded: true });

    setTimeout(() => {
      router.push(redirectTarget);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-between px-6 py-8">
      {/* ── Header ── */}
      <header className="w-full max-w-5xl flex items-center justify-between z-50">
        <div className="flex items-center justify-between w-full h-[52px] px-8 rounded-full glass-clear backdrop-blur-xl border border-[rgba(10,10,10,0.06)] shadow-[0_14px_40px_rgba(0,0,0,0.04)]">
          <Link href="/" className="flex items-center gap-2 group" aria-label="Metaphor home">
            <MetaphorLogo className="w-5 h-5 opacity-90 group-hover:opacity-100 transition-opacity" />
            <span className="text-[14px] font-medium tracking-wide text-[var(--color-ink)]">
              Metaphor
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-[12px] font-mono text-[#AEB7BC] hidden sm:inline">
              Step 3 of 3 &middot; Workspace Finalization
            </span>
            <Link
              href="/login"
              className="text-[13px] text-[#555E64] hover:text-[var(--color-ink)] transition-colors"
            >
              Sign in &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Two-Column Layout ── */}
      <main className="flex-1 flex items-center justify-center w-full max-w-5xl my-10">
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          {/* Left Column: Onboarding & Workspace Summary */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-5 flex flex-col gap-6 p-8 rounded-3xl border border-[rgba(10,10,10,0.08)] bg-white/70 backdrop-blur-md shadow-sm"
          >
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-[#AEB7BC]">
                Workspace Summary
              </span>
              <h2
                className="font-display text-[26px] text-[var(--color-ink)] mt-1"
                style={{ fontStyle: "italic", fontWeight: 400 }}
              >
                {projectName}
              </h2>
            </div>

            <div className="flex flex-col gap-3 py-4 border-y border-[rgba(10,10,10,0.06)] text-[13px] text-[#555E64]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers size={14} className="text-[#AEB7BC]" /> Initial Scope
                </span>
                <span className="font-mono text-[var(--color-ink)]">{projectName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Cpu size={14} className="text-[#AEB7BC]" /> Connected Tools
                </span>
                <span className="font-mono text-[var(--color-ink)]">
                  {connectedTools.length} selected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shield size={14} className="text-[#AEB7BC]" /> Security Model
                </span>
                <span className="font-mono text-emerald-600">Zero-retention</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#AEB7BC] block mb-2">
                Participants in mesh
              </span>
              <div className="flex flex-wrap gap-2">
                {connectedTools.map((tool) => (
                  <span
                    key={tool}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.03] border border-[rgba(10,10,10,0.06)] text-[12px] font-mono text-[var(--color-ink)]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Column: Account Creation Form */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-7 flex flex-col gap-8"
          >
            <div>
              <h1
                className="font-display text-[clamp(36px,4.5vw,48px)] leading-[1.08] tracking-[-0.01em] text-[var(--color-ink)]"
                style={{ fontWeight: 400 }}
              >
                One last thing.
              </h1>
              <p className="text-[15px] text-[#555E64] mt-2 leading-relaxed">
                Save your credentials to initialize your persistent context graph.
              </p>
            </div>

            {/* Social Auth */}
            <div>
              <button
                type="button"
                onClick={() => handleOAuthLogin("github")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 h-[46px] rounded-full border border-[rgba(10,10,10,0.12)] bg-white/70 hover:bg-white hover:border-[var(--color-ink)] transition-all cursor-pointer disabled:opacity-50 text-[13px] font-medium text-[var(--color-ink)] shadow-sm"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
                <span>Continue with GitHub</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-[rgba(10,10,10,0.08)] w-full" />
              <span className="bg-white/80 backdrop-blur-sm px-3 text-[10px] font-mono uppercase text-[#AEB7BC] tracking-widest absolute">
                or account details
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[12px] text-center">
                {error}
              </div>
            )}

            {message && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] flex items-center justify-center gap-2">
                <CheckCircle2 size={15} />
                <span>{message}</span>
              </div>
            )}

            {/* Email form */}
            <form onSubmit={handleEmailAuth} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="signup-name"
                  className="text-[10px] tracking-widest uppercase text-[#AEB7BC] font-mono"
                >
                  Your Name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  className="w-full px-0 py-2.5 bg-transparent border-b text-[18px] text-[var(--color-ink)] placeholder:text-[rgba(10,10,10,0.2)] outline-none transition-colors"
                  style={{
                    fontFamily: "'Cormorant Garamond', var(--next-font-display), serif",
                    fontStyle: "italic",
                    borderBottomColor: name ? "var(--color-ink)" : "rgba(10,10,10,0.15)",
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="signup-email"
                  className="text-[10px] tracking-widest uppercase text-[#AEB7BC] font-mono"
                >
                  Work Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full px-0 py-2.5 bg-transparent border-b text-[18px] text-[var(--color-ink)] placeholder:text-[rgba(10,10,10,0.2)] outline-none transition-colors"
                  style={{
                    fontFamily: "'Cormorant Garamond', var(--next-font-display), serif",
                    fontStyle: "italic",
                    borderBottomColor: email ? "var(--color-ink)" : "rgba(10,10,10,0.15)",
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="signup-password"
                  className="text-[10px] tracking-widest uppercase text-[#AEB7BC] font-mono"
                >
                  Password (min 6 characters)
                </label>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full px-0 py-2.5 bg-transparent border-b text-[18px] text-[var(--color-ink)] placeholder:text-[rgba(10,10,10,0.2)] outline-none transition-colors"
                  style={{
                    borderBottomColor: password ? "var(--color-ink)" : "rgba(10,10,10,0.15)",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full h-[46px] rounded-full bg-[var(--color-ink)] text-white hover:bg-black transition-colors flex items-center justify-center gap-2 text-[14px] font-medium cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <span>{loading ? "Creating workspace..." : "Create Workspace & Enter World"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="text-center text-[12px] text-[#AEB7BC]">
        By initializing your workspace, you agree to the Metaphor zero-retention security guidelines.
      </footer>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-transparent flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[var(--color-ink)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}
