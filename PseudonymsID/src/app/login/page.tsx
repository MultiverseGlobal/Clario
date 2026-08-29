"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ArrowRight, Mail, KeyRound, Loader2, AlertCircle } from "lucide-react";
import { getEcosystemIcon } from "@/components/EcosystemIcons";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // If already logged in, redirect to overview
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace("/");
    });
  }, [router]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const authAction = isSignUp 
        ? createClient().auth.signUp({ email, password })
        : createClient().auth.signInWithPassword({ email, password });
        
      const { data, error } = await authAction;
      
      if (error) {
        setError(error.message);
        setIsLoading(false);
      } else {
        if (isSignUp) {
          router.push("/onboarding");
        } else {
          router.push("/");
        }
      }
    } catch (err: any) {
      console.error("Auth Exception:", err);
      setError(err.message || "An unexpected error occurred during authentication.");
      setIsLoading(false);
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
            Pseudonym ID
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
            {isSignUp ? "Create your sovereign company account." : "Sign in to your sovereign company account."}
          </p>
        </div>

        {error && (
          <div className="animate-enter" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "12px", marginBottom: "24px" }}>
            <AlertCircle size={16} color="var(--red)" />
            <span style={{ fontSize: "13px", color: "var(--red)", fontWeight: 500 }}>{error}</span>
          </div>
        )}


        {/* Email Form */}
        <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
            disabled={isLoading}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              padding: "16px", background: "var(--text-primary)", border: "none",
              borderRadius: "14px", fontSize: "15px", fontWeight: 500, color: "var(--bg-canvas)",
              cursor: isLoading ? "not-allowed" : "pointer",
              transition: "all 0.2s var(--ease-out)", boxShadow: "var(--shadow-md)",
              fontFamily: "var(--font-sans)", marginTop: "8px", opacity: isLoading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "var(--shadow-lg)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
              }
            }}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : (isSignUp ? "Create Account" : "Sign In to Pseudonym")}
            {!isLoading && <ArrowRight size={16} />}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "14px", color: "var(--text-secondary)", marginTop: "24px", fontFamily: "var(--font-sans)" }}>
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <button 
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 500, padding: 0 }}
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>

        <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", marginTop: "32px", fontFamily: "var(--font-sans)" }}>
          Secured by Supabase Core
        </p>
      </div>
    </div>
  );
}
