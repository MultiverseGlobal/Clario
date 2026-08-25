"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ArrowRight, Mail, KeyRound, Loader2, AlertCircle } from "lucide-react";
import { getEcosystemIcon } from "@/components/EcosystemIcons";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // If already logged in, redirect to overview
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace("/");
    });
  }, [router]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      router.push("/");
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "http://localhost:3005/api/auth/callback" },
    });
    if (error) {
      setError(error.message);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "var(--bg-canvas)" }}>
      
      {/* Container */}
      <div 
        className="animate-enter"
        style={{
          width: "100%", maxWidth: "420px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "24px",
          padding: "48px 40px",
          boxShadow: "var(--shadow-float)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Decorative Top Bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, var(--accent), var(--green), var(--amber))", opacity: 0.8 }} />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div 
            style={{
              width: "48px", height: "48px", margin: "0 auto 24px",
              background: "var(--bg-canvas)", border: "1px solid var(--border-strong)",
              borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--shadow-sm)", color: "var(--text-primary)"
            }}
          >
            {getEcosystemIcon("Metaphor", 24, "var(--text-primary)")}
          </div>
          <h1 className="font-serif-title" style={{ fontSize: "32px", color: "var(--text-primary)", margin: "0 0 8px", lineHeight: 1.2 }}>
            Sovereign Access
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
            Authenticate once for the entire ecosystem.
          </p>
        </div>

        {error && (
          <div className="animate-enter" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "12px", marginBottom: "24px" }}>
            <AlertCircle size={16} color="var(--red)" />
            <span style={{ fontSize: "13px", color: "var(--red)", fontWeight: 500 }}>{error}</span>
          </div>
        )}

        {/* OAuth Buttons */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
            padding: "14px", background: "var(--bg-canvas)", border: "1px solid var(--border-strong)",
            borderRadius: "14px", fontSize: "14px", fontWeight: 500, color: "var(--text-primary)",
            cursor: (isGoogleLoading || isLoading) ? "not-allowed" : "pointer",
            transition: "all 0.2s var(--ease-out)", boxShadow: "var(--shadow-sm)",
            fontFamily: "var(--font-sans)", marginBottom: "32px", opacity: (isGoogleLoading || isLoading) ? 0.7 : 1
          }}
          onMouseEnter={(e) => { if (!isGoogleLoading && !isLoading) { e.currentTarget.style.background = "var(--bg-surface-2)"; } }}
          onMouseLeave={(e) => { if (!isGoogleLoading && !isLoading) { e.currentTarget.style.background = "var(--bg-canvas)"; } }}
        >
          {isGoogleLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
          <span className="label-mono" style={{ color: "var(--text-muted)" }}>or email</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailSignIn} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
              <Mail size={16} />
            </div>
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%", padding: "14px 16px 14px 44px",
                background: "var(--bg-canvas)", border: "1px solid var(--border-strong)",
                borderRadius: "14px", fontSize: "14px", color: "var(--text-primary)",
                fontFamily: "var(--font-sans)", outline: "none",
                transition: "all 0.2s var(--ease-out)", boxShadow: "var(--shadow-sm)"
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border-strong)"}
            />
          </div>

          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
              <KeyRound size={16} />
            </div>
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%", padding: "14px 16px 14px 44px",
                background: "var(--bg-canvas)", border: "1px solid var(--border-strong)",
                borderRadius: "14px", fontSize: "14px", color: "var(--text-primary)",
                fontFamily: "var(--font-sans)", outline: "none",
                transition: "all 0.2s var(--ease-out)", boxShadow: "var(--shadow-sm)"
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border-strong)"}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              padding: "16px", background: "var(--text-primary)", border: "none",
              borderRadius: "14px", fontSize: "15px", fontWeight: 500, color: "var(--bg-canvas)",
              cursor: (isLoading || isGoogleLoading) ? "not-allowed" : "pointer",
              transition: "all 0.2s var(--ease-out)", boxShadow: "var(--shadow-md)",
              fontFamily: "var(--font-sans)", marginTop: "8px", opacity: (isLoading || isGoogleLoading) ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!isLoading && !isGoogleLoading) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "var(--shadow-lg)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading && !isGoogleLoading) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
              }
            }}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Sign In"}
            {!isLoading && <ArrowRight size={16} />}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", marginTop: "32px", fontFamily: "var(--font-sans)" }}>
          Secured by Supabase Core
        </p>
      </div>
    </div>
  );
}
