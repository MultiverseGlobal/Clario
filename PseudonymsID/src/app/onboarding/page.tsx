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

  if (!user) return <div className="min-h-screen bg-[var(--pds-canvas)]" />;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 auth-bg">
      <div
        className="pds-animate-enter w-full max-w-[480px] auth-card p-12"
      >
        {/* Progress steps */}
        <div className="flex gap-2 mb-10 justify-center">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className={`h-1 w-8 rounded-full transition-all duration-300 ${step >= i ? "bg-[var(--pds-accent)]" : "bg-[var(--pds-border-mid)]"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="pds-animate-fade">
            <div className="text-center mb-8">
              <div className="w-12 h-12 mx-auto mb-6 bg-[var(--pds-surface-2)] border border-[var(--pds-border-strong)] rounded-2xl flex items-center justify-center text-[var(--pds-text-primary)]">
                <User size={24} />
              </div>
              <h1 className="pds-title text-3xl mb-2">Claim your Pseudonym</h1>
              <p className="text-[14px] text-[var(--pds-text-secondary)]">Choose the handle you'll use across the ecosystem.</p>
            </div>
            
            <input
              type="text"
              autoFocus
              placeholder="e.g. Satoshi"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && username && !isLoading) handleSaveProfile(); }}
              className="pds-input mb-6"
            />
            
            <button
              onClick={handleSaveProfile}
              disabled={!username || isLoading}
              className="pds-btn-primary"
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="pds-animate-fade">
            <div className="text-center mb-8">
              <div className="w-12 h-12 mx-auto mb-6 bg-[var(--pds-surface-2)] border border-[var(--pds-border-strong)] rounded-2xl flex items-center justify-center text-[var(--pds-text-primary)]">
                <Key size={24} />
              </div>
              <h1 className="pds-title text-3xl mb-2">Sovereign AI Config</h1>
              <p className="text-[14px] text-[var(--pds-text-secondary)]">Add your Gemini API key to power Clario and Metaphor. Stored securely in your profile metadata.</p>
            </div>
            
            <input
              type="password"
              autoFocus
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !isLoading) handleSaveKeys(); }}
              className="pds-input mono mb-6"
            />
            
            <button
              onClick={handleSaveKeys}
              disabled={isLoading}
              className="pds-btn-primary"
            >
              {geminiKey ? "Save Keys" : "Skip for now"} <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="pds-animate-fade text-center">
            <div className="w-16 h-16 mx-auto mb-8 bg-[var(--pds-status-active-bg)] border border-[var(--pds-status-active-border)] rounded-2xl flex items-center justify-center text-[var(--pds-success)]">
              <CheckCircle size={32} />
            </div>
            <h1 className="pds-title text-3xl mb-2">You're all set!</h1>
            <p className="text-[14px] text-[var(--pds-text-secondary)] mb-8 leading-relaxed">
              Your sovereign profile is ready. You can now use Atlas, Metaphor, and Orion securely.
            </p>
            
            <button
              onClick={finishOnboarding}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") finishOnboarding(); }}
              className="pds-btn-primary"
            >
              Enter Ecosystem
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
