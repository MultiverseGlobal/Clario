"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ArrowRight, Mail, KeyRound, Loader2, AlertCircle } from "lucide-react";

/**
 * PseudonymsID Login — The Cinematic Gateway
 *
 * New user (first visit):
 *   Plays a one-time sequence where the ecosystem is revealed:
 *   darkness → wordmark → five app dots → login form
 *
 * Returning user:
 *   Wordmark is already present. Form fades in beneath.
 */

const APP_DOTS = [
  { label: "atlas", color: "#10b981" },
  { label: "metaphor", color: "hsl(260, 70%, 62%)" },
  { label: "orion", color: "#00f0ff" },
  { label: "clario", color: "#ec4899" },
  { label: "id", color: "rgba(255,255,255,0.9)" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Cinematic sequence state
  const [phase, setPhase] = useState<"black" | "wordmark" | "dots" | "tagline" | "form">("black");
  const isFirstVisit = typeof window !== "undefined" && !localStorage.getItem("psy_visited");

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace("/");
    });
  }, [router]);

  useEffect(() => {
    if (!isFirstVisit) {
      setPhase("form");
      return;
    }

    // Mark visited so sequence never replays
    localStorage.setItem("psy_visited", "1");

    const sequence = [
      { delay: 400, fn: () => setPhase("wordmark") },
      { delay: 1400, fn: () => setPhase("dots") },
      { delay: 2600, fn: () => setPhase("tagline") },
      { delay: 3800, fn: () => setPhase("form") },
    ];

    const timers = sequence.map(({ delay, fn }) => setTimeout(fn, delay));
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = isSignUp
        ? await createClient().auth.signUp({ email, password })
        : await createClient().auth.signInWithPassword({ email, password });

      if (error) {
        setError(error.message);
        setIsLoading(false);
      } else {
        router.push(isSignUp ? "/onboarding" : "/");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#07080c",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* ── Wordmark ────────────────────────────────────────────────── */}
      <div style={{
        textAlign: "center",
        marginBottom: phase === "form" ? "48px" : "0px",
        transition: "margin 600ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        <h1 style={{
          fontSize: "42px",
          fontWeight: 300,
          color: "rgba(240,240,240,0.95)",
          letterSpacing: "0.14em",
          fontFamily: "'Inter', sans-serif",
          margin: 0,
          opacity: phase === "black" ? 0 : 1,
          transform: phase === "black" ? "translateY(8px)" : "translateY(0)",
          transition: "opacity 900ms ease-out, transform 900ms ease-out",
        }}>
          pseudonyms
        </h1>

        {/* ── Five app dots ─────────────────────────────────────────── */}
        <div style={{
          display: "flex",
          gap: "20px",
          justifyContent: "center",
          marginTop: "24px",
          opacity: phase === "black" || phase === "wordmark" ? 0 : 1,
          transition: "opacity 600ms ease-out",
        }}>
          {APP_DOTS.map((dot, i) => (
            <div
              key={dot.label}
              title={dot.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                opacity: phase === "dots" || phase === "tagline" || phase === "form" ? 1 : 0,
                transform: phase === "dots" || phase === "tagline" || phase === "form"
                  ? "scale(1)"
                  : "scale(0.6)",
                transition: `opacity 400ms ease-out ${i * 80}ms, transform 400ms cubic-bezier(0.16,1,0.3,1) ${i * 80}ms`,
              }}
            >
              <div style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: dot.color,
                boxShadow: `0 0 10px ${dot.color}80`,
              }} />
              <span style={{
                fontSize: "9px",
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "0.1em",
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {dot.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Tagline ───────────────────────────────────────────────── */}
        <p style={{
          marginTop: "28px",
          fontSize: "13px",
          color: "rgba(255,255,255,0.3)",
          letterSpacing: "0.06em",
          fontFamily: "'Inter', sans-serif",
          fontWeight: 300,
          opacity: phase === "tagline" || phase === "form" ? 1 : 0,
          transition: "opacity 500ms ease-out",
        }}>
          your cognitive os. one session. five surfaces.
        </p>
      </div>

      {/* ── Auth form ─────────────────────────────────────────────── */}
      <div style={{
        width: "100%",
        maxWidth: "400px",
        padding: "0 24px",
        opacity: phase === "form" ? 1 : 0,
        transform: phase === "form" ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 500ms ease-out, transform 500ms cubic-bezier(0.16,1,0.3,1)",
        pointerEvents: phase === "form" ? "auto" : "none",
      }}>
        {/* Error */}
        {error && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 16px",
            background: "rgba(236, 72, 153, 0.08)",
            border: "1px solid rgba(236, 72, 153, 0.2)",
            borderRadius: "10px",
            marginBottom: "20px",
          }}>
            <AlertCircle size={15} color="#ec4899" />
            <span style={{ fontSize: "13px", color: "#ec4899" }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Email */}
          <div style={{ position: "relative" }}>
            <Mail size={15} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)", pointerEvents: "none" }} />
            <input
              type="email"
              required
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px 14px 44px",
                background: "#10131b",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                fontSize: "14px",
                color: "rgba(240,240,240,0.9)",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 300,
                outline: "none",
                letterSpacing: "0.01em",
                boxSizing: "border-box",
                transition: "border-color 200ms ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.22)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
            />
          </div>

          {/* Password */}
          <div style={{ position: "relative" }}>
            <KeyRound size={15} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)", pointerEvents: "none" }} />
            <input
              type="password"
              required
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px 14px 44px",
                background: "#10131b",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                fontSize: "14px",
                color: "rgba(240,240,240,0.9)",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 300,
                outline: "none",
                letterSpacing: "0.02em",
                boxSizing: "border-box",
                transition: "border-color 200ms ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.22)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "15px",
              background: "rgba(240,240,240,0.95)",
              border: "none",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 500,
              color: "#07080c",
              cursor: isLoading ? "not-allowed" : "pointer",
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.02em",
              marginTop: "6px",
              opacity: isLoading ? 0.6 : 1,
              transition: "opacity 200ms ease, transform 200ms ease",
            }}
            onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {isLoading ? (
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <>
                {isSignUp ? "create account" : "enter"}
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        <p style={{
          textAlign: "center",
          fontSize: "13px",
          color: "rgba(255,255,255,0.22)",
          marginTop: "20px",
          fontFamily: "'Inter', sans-serif",
          fontWeight: 300,
        }}>
          {isSignUp ? "already a member? " : "new here? "}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            style={{
              background: "none", border: "none",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
              fontWeight: 400,
              padding: 0,
              fontSize: "13px",
              fontFamily: "'Inter', sans-serif",
              textDecoration: "underline",
              textDecorationColor: "rgba(255,255,255,0.2)",
            }}
          >
            {isSignUp ? "sign in" : "create account"}
          </button>
        </p>
      </div>
    </div>
  );
}
