"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ArrowRight, User, Key, CheckCircle } from "lucide-react";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace("/login");
      else setUser(user);
    });
  }, [router]);

  const handleSaveProfile = async () => {
    setIsLoading(true);
    const { error } = await createClient().auth.updateUser({
      data: { username }
    });
    setIsLoading(false);
    if (!error) setStep(2);
  };

  const handleSaveKeys = async () => {
    setIsLoading(true);
    const { error } = await createClient().auth.updateUser({
      data: { gemini_api_key: geminiKey }
    });
    setIsLoading(false);
    if (!error) setStep(3);
  };

  const finishOnboarding = () => {
    router.push("/");
  };

  if (!user) return <div className="min-h-screen bg-[var(--bg-canvas)]" />;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "var(--bg-canvas)" }}>
      <div 
        className="animate-enter"
        style={{
          width: "100%", maxWidth: "500px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "24px",
          padding: "48px 40px",
          boxShadow: "var(--shadow-float)",
        }}
      >
        <div style={{ display: "flex", gap: "8px", marginBottom: "40px", justifyContent: "center" }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ width: "32px", height: "4px", borderRadius: "2px", background: step >= i ? "var(--accent)" : "var(--border-strong)" }} />
          ))}
        </div>

        {step === 1 && (
          <div className="animate-enter">
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{ width: "48px", height: "48px", margin: "0 auto 24px", background: "var(--bg-canvas)", border: "1px solid var(--border-strong)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                <User size={24} />
              </div>
              <h1 className="font-serif-title" style={{ fontSize: "28px", color: "var(--text-primary)", marginBottom: "8px" }}>Claim your Pseudonym</h1>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Choose the handle you'll use across the ecosystem.</p>
            </div>
            
            <input
              type="text"
              placeholder="e.g. Satoshi"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: "100%", padding: "14px 16px", background: "var(--bg-canvas)", border: "1px solid var(--border-strong)", borderRadius: "14px", fontSize: "14px", color: "var(--text-primary)", outline: "none", marginBottom: "24px"
              }}
            />
            
            <button onClick={handleSaveProfile} disabled={!username || isLoading} style={{ width: "100%", padding: "14px", background: "var(--text-primary)", color: "var(--bg-canvas)", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 600, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: (!username || isLoading) ? "not-allowed" : "pointer", opacity: (!username || isLoading) ? 0.7 : 1 }}>
              Continue <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-enter">
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{ width: "48px", height: "48px", margin: "0 auto 24px", background: "var(--bg-canvas)", border: "1px solid var(--border-strong)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                <Key size={24} />
              </div>
              <h1 className="font-serif-title" style={{ fontSize: "28px", color: "var(--text-primary)", marginBottom: "8px" }}>Sovereign AI Config</h1>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Add your Gemini API key to power Clario and Metaphor. Stored securely in your profile metadata.</p>
            </div>
            
            <input
              type="password"
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              style={{
                width: "100%", padding: "14px 16px", background: "var(--bg-canvas)", border: "1px solid var(--border-strong)", borderRadius: "14px", fontSize: "14px", color: "var(--text-primary)", outline: "none", marginBottom: "24px", fontFamily: "monospace"
              }}
            />
            
            <button onClick={handleSaveKeys} disabled={isLoading} style={{ width: "100%", padding: "14px", background: "var(--text-primary)", color: "var(--bg-canvas)", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 600, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.7 : 1 }}>
              {geminiKey ? "Save Keys" : "Skip for now"} <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-enter" style={{ textAlign: "center" }}>
            <div style={{ width: "64px", height: "64px", margin: "0 auto 32px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--green)" }}>
              <CheckCircle size={32} />
            </div>
            <h1 className="font-serif-title" style={{ fontSize: "28px", color: "var(--text-primary)", marginBottom: "8px" }}>You're all set!</h1>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "32px", lineHeight: 1.6 }}>
              Your sovereign profile is ready. You can now use Atlas, Metaphor, and Orion securely.
            </p>
            
            <button onClick={finishOnboarding} style={{ width: "100%", padding: "14px", background: "var(--text-primary)", color: "var(--bg-canvas)", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 600 }}>
              Enter Ecosystem
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
