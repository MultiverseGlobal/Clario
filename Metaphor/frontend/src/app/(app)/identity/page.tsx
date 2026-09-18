"use client";

import React, { useState, useEffect } from "react";
import { User, Target, PenTool, Hash } from "lucide-react";

export default function IdentityEnginePage() {
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [profile, setProfile] = useState({
    name: "",
    mission_statement: "",
    writing_style: "",
    preferred_terms: "",
    banned_terms: ""
  });

  useEffect(() => {
    async function fetchUser() {
      try {
        const { fetchFromMetaphor } = await import("@/app/api");
        const data = await fetchFromMetaphor("/auth/me");
        if (data) {
          setProfile({
            name: data.name || "",
            mission_statement: data.mission_statement || "",
            writing_style: data.writing_style || "",
            preferred_terms: data.preferred_terms || "",
            banned_terms: data.banned_terms || ""
          });
        }
      } catch (e) {
        console.error("Failed to fetch user:", e);
      }
    }
    fetchUser();
  }, []);

  const handleSave = async (updatedProfile: typeof profile) => {
    setSaveState("saving");
    try {
      const { fetchFromMetaphor } = await import("@/app/api");
      await fetchFromMetaphor("/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProfile)
      });
    } catch (e) {
      console.error("Failed to save profile:", e);
    } finally {
      setTimeout(() => {
        setSaveState("saved");
      }, 500);
    }
  };

  const handleChange = (field: keyof typeof profile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = () => {
    handleSave(profile);
  };

  return (
    <div className="max-w-3xl animate-in fade-in duration-150 p-8">
      <header className="mb-12">
        <h1 className="text-2xl text-foreground font-medium mb-2">Identity Engine</h1>
        <p className="text-muted text-sm leading-relaxed max-w-xl">
          Define the persistent P0 context that Metaphor appends to every AI interaction. This establishes your core profile, mission, and communication style.
        </p>
      </header>

      <div className="space-y-12">
        {/* Core Profile */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <User className="w-4 h-4 text-muted" />
            <h2 className="text-sm font-medium text-foreground tracking-wide uppercase">Core Profile</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">Name / Alias</label>
              <input 
                type="text"
                value={profile.name}
                onChange={(e) => handleChange("name", e.target.value)}
                onBlur={handleBlur}
                placeholder="e.g. Developer"
                className="w-full bg-surface-1 border border-border-subtle rounded-md px-4 py-3 text-sm text-foreground focus:outline-none focus:border-border-strong transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">Mission Statement</label>
              <textarea 
                value={profile.mission_statement}
                onChange={(e) => handleChange("mission_statement", e.target.value)}
                onBlur={handleBlur}
                rows={3}
                placeholder="e.g. Build Multiverse Global Enterprises"
                className="w-full bg-surface-1 border border-border-subtle rounded-md px-4 py-3 text-sm text-foreground focus:outline-none focus:border-border-strong transition-colors resize-none"
              />
            </div>
          </div>
        </section>

        {/* Communication Rules */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <PenTool className="w-4 h-4 text-muted" />
            <h2 className="text-sm font-medium text-foreground tracking-wide uppercase">Communication</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">Writing Style</label>
              <textarea 
                value={profile.writing_style}
                onChange={(e) => handleChange("writing_style", e.target.value)}
                onBlur={handleBlur}
                rows={4}
                placeholder="e.g. Direct, technical, concise. Avoids jargon unless domain-specific. Never use 'In conclusion'."
                className="w-full bg-surface-1 border border-border-subtle rounded-md px-4 py-3 text-sm text-foreground focus:outline-none focus:border-border-strong transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">Preferred Terms (Do Use)</label>
                <textarea 
                  value={profile.preferred_terms}
                  onChange={(e) => handleChange("preferred_terms", e.target.value)}
                  onBlur={handleBlur}
                  rows={4}
                  placeholder="Context Engine\nKnowledge Graph"
                  className="w-full bg-surface-1 border border-border-subtle rounded-md px-4 py-3 text-sm text-foreground focus:outline-none focus:border-border-strong transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">Banned Terms (Do Not Use)</label>
                <textarea 
                  value={profile.banned_terms}
                  onChange={(e) => handleChange("banned_terms", e.target.value)}
                  onBlur={handleBlur}
                  rows={4}
                  placeholder="Second Brain\nDigital Twin"
                  className="w-full bg-surface-1 border border-border-subtle rounded-md px-4 py-3 text-sm text-foreground focus:outline-none focus:border-border-strong transition-colors resize-none"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Fixed Save State Indicator */}
      <div className="fixed bottom-8 right-8 flex items-center gap-2 text-xs text-muted font-medium bg-surface-1 border border-border-subtle px-3 py-1.5 rounded-full shadow-sm">
        {saveState === "saving" ? (
          <>
            <div className="w-2 h-2 rounded-full border-2 border-muted border-t-transparent animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-success/80" />
            Synchronized
          </>
        )}
      </div>
    </div>
  );
}
