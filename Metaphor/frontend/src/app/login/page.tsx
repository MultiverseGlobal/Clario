"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MetaphorLogo } from "@/components/ui/MetaphorLogo";
import { createClient } from "@/utils/supabase/client";
import { getLocalSettings, pushSettingsToCloud } from "@/lib/settings";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const settingsMem = typeof window !== "undefined" ? getLocalSettings() : null;
  const isAlreadyOnboarded =
    settingsMem?.onboarded ||
    (typeof window !== "undefined" && document.cookie.includes("metaphor_onboarded=true"));
  const defaultTarget = isAlreadyOnboarded ? "/world" : "/onboard";
  const redirectTarget = searchParams.get("redirect") || defaultTarget;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const supabase = createClient();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const errorDesc = hashParams.get("error_description") || hashParams.get("error");
      if (errorDesc) {
        setError(errorDesc.replace(/\+/g, " "));
      }
    }
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
      setError("Error logging in: " + error.message);
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        setError("Account not found or password incorrect.");
      } else {
        setError("Error signing in: " + error.message);
      }
      setLoading(false);
      return;
    }

    setMessage("Success! Redirecting...");

    let finalTarget = redirectTarget;
    if (data?.user) {
      const onboarded = !!data.user.user_metadata?.project_name;
      pushSettingsToCloud({ onboarded });
      if (onboarded) {
        document.cookie = "metaphor_onboarded=true; path=/; max-age=31536000";
        if (finalTarget === "/onboard") {
          finalTarget = "/world";
        }
      }
    }

    router.push(finalTarget);
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-between px-6 py-8">
      {/* ── Header ── */}
      <header className="w-full max-w-4xl flex items-center justify-between z-50">
        <div className="flex items-center justify-between w-full h-[52px] px-8 rounded-full glass-clear backdrop-blur-xl border border-[rgba(10,10,10,0.06)] shadow-[0_14px_40px_rgba(0,0,0,0.04)]">
          <Link href="/" className="flex items-center gap-2 group" aria-label="Metaphor home">
            <MetaphorLogo className="w-5 h-5 opacity-90 group-hover:opacity-100 transition-opacity" />
            <span className="text-[14px] font-medium tracking-wide text-[var(--color-ink)]">
              Metaphor
            </span>
          </Link>
          <Link
            href="/signup"
            className="text-[13px] text-[#555E64] hover:text-[var(--color-ink)] transition-colors"
          >
            Create account &rarr;
          </Link>
        </div>
      </header>

      {/* ── Main Form ── */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-md my-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full flex flex-col gap-10"
        >
          {/* Headline */}
          <div className="flex flex-col gap-3 text-center items-center">
            <h1
              className="font-display text-[clamp(40px,5vw,52px)] leading-[1.08] tracking-[-0.01em] text-[var(--color-ink)]"
              style={{ fontWeight: 400 }}
            >
              Sign In.
            </h1>
            <p className="text-[15px] text-[#555E64] leading-relaxed max-w-xs">
              Enter your workspace to continue your session.
            </p>
          </div>

          {/* Social Auth */}
          <div className="w-full">
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

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-[rgba(10,10,10,0.08)] w-full" />
            <span className="bg-white/80 backdrop-blur-sm px-3 text-[10px] font-mono uppercase text-[#AEB7BC] tracking-widest absolute">
              or email
            </span>
          </div>

          {/* Error / Success Feedback */}
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
                htmlFor="email"
                className="text-[10px] tracking-widest uppercase text-[#AEB7BC] font-mono"
              >
                Email
              </label>
              <input
                id="email"
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
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-[10px] tracking-widest uppercase text-[#AEB7BC] font-mono"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setError("Password reset is currently managed by workspace admin.")}
                  className="text-[11px] text-[#AEB7BC] hover:text-[var(--color-ink)] transition-colors"
                >
                  Forgot?
                </button>
              </div>
              <input
                id="password"
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
              className="mt-4 w-full h-[46px] rounded-full bg-[var(--color-ink)] text-white hover:bg-black transition-colors flex items-center justify-center gap-2 text-[14px] font-medium cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? "Authenticating..." : "Sign In"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </motion.div>
      </main>

      {/* ── Footer ── */}
      <footer className="text-center text-[12px] text-[#AEB7BC]">
        Metaphor &middot; Context Engine for Autonomous Systems
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-transparent flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[var(--color-ink)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
