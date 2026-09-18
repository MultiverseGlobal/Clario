"use client";

import React, { useState, useEffect } from "react";
import { Settings, Moon, Sun, Monitor, Bell, Database, Key, Copy, Shield } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { fetchFromMetaphor } from "@/app/api";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    theme: "system",
    passiveIngestion: true,
    clarificationNotifications: false,
    sovereignMode: true,
    retentionDays: 90,
  });
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [generatingKey, setGeneratingKey] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        // Read localStorage first — this is the source of truth, defaults to dark
        const localTheme = localStorage.getItem("metaphor_theme") || "dark";
        applyTheme(localTheme);
        setSettings(prev => ({ ...prev, theme: localTheme }));

        const storedName = localStorage.getItem("metaphor_user_name");
        const user = await fetchFromMetaphor("/auth/me", undefined, "GET", false, true);
        if (user) {
          const cleanName = storedName || (user.name && user.name !== "Supabase User" && user.name !== "Developer User"
            ? user.name
            : user.email ? user.email.split("@")[0] : "multiverseglobals");
          setUserName(cleanName);
          setUserEmail(user.email || "");
          // Only override if user has explicitly saved a theme to the backend AND nothing is in localStorage
          if (user.settings?.theme && !localStorage.getItem("metaphor_theme")) {
            applyTheme(user.settings.theme);
            setSettings(prev => ({ ...prev, ...user.settings }));
          }
        }
      } catch (e) {
        console.error("Failed to load settings", e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const applyTheme = (themeName: string) => {
    if (typeof window === "undefined") return;
    const root = document.documentElement; // <html>
    const body = document.body;

    if (themeName === "dark") {
      root.classList.add("dark");
      body.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else if (themeName === "light") {
      root.classList.remove("dark");
      body.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    } else {
      // system
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
        body.classList.add("dark");
        root.setAttribute("data-theme", "dark");
      } else {
        root.classList.remove("dark");
        body.classList.remove("dark");
        root.setAttribute("data-theme", "light");
      }
    }
    localStorage.setItem("metaphor_theme", themeName);
  };

  const updateSetting = async (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    if (key === "theme") {
      applyTheme(value);
    }
    
    try {
      await fetchFromMetaphor("/auth/me", {
        name: userName,
        settings: newSettings
      }, "PUT");
      import("@/lib/settings").then(m => m.pushSettingsToCloud());
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  };

  const handleSaveName = async () => {
    if (!userName.trim()) return;
    setSavingName(true);
    const targetName = userName.trim();
    localStorage.setItem("metaphor_user_name", targetName);
    try {
      await fetchFromMetaphor("/auth/me", {
        name: targetName,
        settings
      }, "PUT");
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
      window.dispatchEvent(new Event("user-profile-updated"));
    } catch (e) {
      console.error("Failed to save name:", e);
    } finally {
      setSavingName(false);
    }
  };

  const handleGenerateApiKey = async () => {
    setGeneratingKey(true);
    try {
      const res = await fetchFromMetaphor("/auth/apikeys", {}, "POST");
      if (res && res.key) {
        setApiKey(res.key);
      }
    } catch (e) {
      console.error("Failed to generate API key:", e);
    } finally {
      setGeneratingKey(false);
    }
  };


  if (loading) return null;

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-150 max-w-2xl mx-auto p-8">
      
      <header className="mb-10">
        <div className="text-[9px] font-mono uppercase tracking-widest text-muted mb-3">Configuration</div>
        <h1 className="font-display text-3xl text-foreground tracking-tight mb-2">Settings</h1>
        <p className="text-xs font-mono text-muted">Trust model — data governance — workspace preferences.</p>
      </header>

      <div className="space-y-8 mb-12">
        
        {/* Profile & Identity */}
        <section>
          <h2 className="text-[10px] font-mono text-muted uppercase tracking-widest mb-4 border-b border-border-subtle pb-2">Profile & Identity</h2>
          <Card className="p-6 space-y-4">
            <div>
              <label className="pds-label">Display Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. SUDO"
                  className="flex-1 px-3 py-2 bg-surface-1 border border-border-subtle focus:border-foreground text-sm font-mono text-foreground focus:outline-none transition-colors rounded-sm"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="pds-btn-primary w-auto min-h-[36px] px-4 rounded-sm text-xs"
                >
                  {savingName ? "Saving..." : nameSaved ? "✓ Saved" : "Save"}
                </button>

              </div>
            </div>

            <div>
              <label className="pds-label mt-4 block">Account Email</label>
              <input
                type="text"
                value={userEmail}
                disabled
                className="w-full px-3 py-2 rounded-sm bg-surface-2 border border-border-subtle text-sm font-mono text-muted cursor-not-allowed opacity-60"
              />
            </div>
          </Card>
        </section>

        {/* API Keys */}
        <section>
          <h2 className="text-[10px] font-mono text-muted uppercase tracking-widest mb-4 border-b border-border-subtle pb-2 mt-8">API Keys & Authentication</h2>
          <Card className="p-6">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm text-muted mb-4">
                  Generate an API key to securely connect external AI assistants (like Antigravity or Cursor) to your Metaphor context engine.
                </p>
                
                {apiKey ? (
                  <div className="p-4 bg-surface-2 border border-border-strong rounded-sm space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-muted uppercase tracking-widest">New API Key</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(apiKey);
                          const el = document.getElementById("copy-key-text");
                          if (el) el.innerText = "Copied!";
                          setTimeout(() => { if (el) el.innerText = "Copy"; }, 2000);
                        }}
                        className="text-xs font-medium text-muted hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" /> <span id="copy-key-text">Copy</span>
                      </button>
                    </div>
                    <code className="block text-xs text-foreground font-mono break-all bg-background p-3 rounded-sm border border-border-strong">
                      {apiKey}
                    </code>
                    <p className="text-[10px] text-danger font-mono flex items-center gap-1.5 mt-2">
                      <Shield className="w-3 h-3" /> Copy now — this key won&apos;t be shown again.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateApiKey}
                    disabled={generatingKey}
                    className="pds-btn-primary rounded-sm text-xs"
                  >
                    <Key className="w-3.5 h-3.5" />
                    {generatingKey ? "Generating..." : "Generate API Key"}
                  </button>
                )}
              </div>
            </div>
          </Card>
        </section>

        
        {/* Appearance */}
        <section>
          <h2 className="text-[10px] font-mono text-muted uppercase tracking-widest mb-4 border-b border-border-subtle pb-2 mt-8">Appearance</h2>
          <div className="grid grid-cols-3 gap-2">
            {(["light", "dark", "system"] as const).map((t) => {
              const Icon = t === "light" ? Sun : t === "dark" ? Moon : Monitor;
              const label = t === "light" ? "Light" : t === "dark" ? "Dark" : "System";
              return (
                <button
                  key={t}
                  onClick={() => updateSetting("theme", t)}
                  className={`flex flex-col items-center gap-2 p-4 bg-surface-1 border ${
                    settings.theme === t ? 'border-foreground' : 'border-border-subtle'
                  } hover:border-border-strong rounded-sm cursor-pointer transition-colors`}
                >
                  <Icon className={`w-5 h-5 ${settings.theme === t ? 'text-foreground' : 'text-muted'}`} />
                  <span className={`text-[10px] font-mono uppercase tracking-widest ${settings.theme === t ? 'text-foreground' : 'text-muted'}`}>{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Sovereign Trust Model */}
        <section>
          <h2 className="text-[10px] font-mono text-foreground uppercase tracking-widest mb-4 border-b border-border-subtle pb-2 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" /> Trust & Sovereign Mode
          </h2>
          <Card noPadding className="divide-y divide-border-subtle rounded-sm">
            <div onClick={() => updateSetting("sovereignMode", !settings.sovereignMode)} className="p-4 flex items-center justify-between hover:bg-surface-2/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-muted" />
                <div>
                  <h3 className="text-xs font-semibold text-foreground">Sovereign Mode</h3>
                  <p className="text-[10px] font-mono text-muted mt-1">Credentials stay local. Raw document text never leaves your machine.</p>
                </div>
              </div>
              <div className={`w-10 h-5 rounded-full relative shadow-inner transition-colors ${settings.sovereignMode ? 'bg-foreground' : 'bg-surface-2 border border-border-strong'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${settings.sovereignMode ? 'right-0.5 bg-background shadow-sm' : 'left-0.5 bg-muted'}`} />
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-4 mb-3">
                <Database className="w-5 h-5 text-muted" />
                <div>
                  <h3 className="text-sm font-medium text-foreground">Data Retention</h3>
                  <p className="text-xs text-muted mt-0.5">Graph nodes older than this are automatically archived.</p>
                </div>
              </div>
              <div className="flex gap-2 pl-9">
                {[30, 90, 180, 365].map(days => (
                  <button
                    key={days}
                    onClick={() => updateSetting("retentionDays", days)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      settings.retentionDays === days
                        ? 'border-primary text-foreground bg-primary/10'
                        : 'border-border-subtle text-muted hover:text-foreground hover:border-border-strong'
                    }`}
                  >
                    {days}d
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </section>

        {/* Developer Access */}
        <section>
          <h2 className="text-[10px] font-mono text-muted uppercase tracking-widest mb-4 border-b border-border-subtle pb-2 mt-8">Danger Zone</h2>
          <Card className="p-4 space-y-3 rounded-sm border-danger/20">
            <p className="text-[10px] font-mono text-muted">Purge your entire context graph. This action is permanent and irreversible.</p>
            <button className="pds-btn-ghost w-auto min-h-[32px] px-3 text-danger border-danger/30 hover:border-danger hover:bg-danger/10 rounded-sm text-[10px]">
              Delete All Graph Data
            </button>
          </Card>
        </section>

        {/* Behavior */}
        <section>
          <h2 className="text-[10px] font-mono text-foreground uppercase tracking-widest mb-4 border-b border-border-subtle pb-2 mt-8">Engine Behavior</h2>
          <Card noPadding className="divide-y divide-border-subtle rounded-sm">
            <div onClick={() => updateSetting("passiveIngestion", !settings.passiveIngestion)} className="p-4 flex items-center justify-between hover:bg-surface-2/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-muted" />
                <div>
                  <h3 className="text-xs font-semibold text-foreground">Passive Ingestion Mode</h3>
                  <p className="text-[10px] font-mono text-muted mt-1">Allow webhooks to automatically create Nodes without approval.</p>
                </div>
              </div>
              <div className={`w-10 h-5 rounded-full relative shadow-inner transition-colors ${settings.passiveIngestion ? 'bg-foreground' : 'bg-surface-2 border border-border-strong'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${settings.passiveIngestion ? 'right-0.5 bg-background shadow-sm' : 'left-0.5 bg-muted'}`} />
              </div>
            </div>
            
            <div onClick={() => updateSetting("clarificationNotifications", !settings.clarificationNotifications)} className="p-4 flex items-center justify-between hover:bg-surface-2/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-muted" />
                <div>
                  <h3 className="text-xs font-semibold text-foreground">Clarification Notifications</h3>
                  <p className="text-[10px] font-mono text-muted mt-1">Notify me when the engine encounters conflicting truths.</p>
                </div>
              </div>
              <div className={`w-10 h-5 rounded-full relative shadow-inner transition-colors ${settings.clarificationNotifications ? 'bg-foreground' : 'bg-surface-2 border border-border-strong'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${settings.clarificationNotifications ? 'right-0.5 bg-background shadow-sm' : 'left-0.5 bg-muted'}`} />
              </div>
            </div>
          </Card>
        </section>

      </div>
    </div>
  );
}
