"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Mail, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import { MetaphorLogo } from "@/components/ui/MetaphorLogo";
import { createClient } from "@/utils/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAlreadyOnboarded = typeof window !== "undefined" && (localStorage.getItem("metaphor_onboarded") === "true" || document.cookie.includes("metaphor_onboarded=true"));
  const defaultTarget = isAlreadyOnboarded ? "/dashboard" : "/onboarding";
  const redirectTarget = searchParams.get("redirect") || defaultTarget;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isSignUp = false;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const supabase = createClient();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const errorDesc = hashParams.get("error_description") || hashParams.get("error");
      if (errorDesc) {
        setError(errorDesc.replace(/\+/g, " "));
      }
    }
  }, []);

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
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

    if (isSignUp) {
      setError("Sign up is disabled in single-tenant mode.");
      setLoading(false);
      return;
    } else {
      // Single-tenant sovereign bypass:
      document.cookie = "metaphor_unlocked=true; path=/; max-age=31536000";
      if (typeof window !== "undefined") {
        localStorage.setItem("metaphor_user_name", "Admin");
      }
      setLoading(false);
      router.push(redirectTarget);
    }
  };


  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center relative px-4 font-sans selection:bg-primary-dim">
      <div className="w-full max-w-md space-y-6">
        
        {/* Logo and Branding */}
        <div className="flex flex-col items-center space-y-3 text-center mb-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <MetaphorLogo size={32} />
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              Metaphor OS
            </span>
          </Link>
          <p className="text-muted text-xs font-mono tracking-wider">Universal Context Engine</p>
        </div>

        {/* Form Card */}
        <div className="bg-surface-1 border border-border-subtle rounded-2xl p-8 shadow-xl space-y-6">
          
          <div className="text-center space-y-1 pb-2">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              System Unlock
            </h1>
            <p className="text-sm text-muted">
              Master identity required.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-success text-xs flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{message}</span>
            </div>
          )}

          {/* Social Auth Buttons */}
          <div className="space-y-3">


            <button 
              type="button"
              onClick={() => handleOAuthLogin('github')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 p-3.5 rounded-xl border border-border-subtle bg-background hover:bg-surface-2 hover:border-border-strong transition-all duration-200 cursor-pointer disabled:opacity-50 text-sm font-medium shadow-sm"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
              <span>Continue with GitHub</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-border-subtle w-full" />
            <span className="bg-surface-1 px-3 text-[10px] font-mono uppercase text-muted tracking-wider absolute">or continue with email</span>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <Mail className="w-4 h-4 text-muted absolute left-3.5 top-3.5" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-subtle bg-background text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-border-strong transition-colors shadow-sm"
                />
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted absolute left-3.5 top-3.5" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-subtle bg-background text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-border-strong transition-colors shadow-sm"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-foreground text-background text-sm font-medium rounded-xl hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 shadow-md"
            >
              <span>{loading ? "Processing..." : "Unlock System"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link href="/" className="text-xs text-muted hover:text-foreground transition-colors inline-flex items-center gap-1">
            &larr; Back to Landing Page
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
