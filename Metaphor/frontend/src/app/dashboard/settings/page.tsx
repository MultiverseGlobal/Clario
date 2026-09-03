"use client";

import React, { useState, useEffect } from "react";
import { Settings, Moon, Sun, Monitor, Bell, Database, Key, Copy, Shield } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { fetchFromMetaphor } from "@/app/api";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    theme: "system",
    passiveIngestion: true,
    clarificationNotifications: false
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
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-150 max-w-3xl mx-auto p-8">
      
      <header className="mb-10">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2 flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" /> Settings
        </h1>
        <p className="text-sm text-muted">Manage your OS preferences and profile identity.</p>
      </header>

      <div className="space-y-8 mb-12">
        
        {/* Profile & Identity */}
        <section>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border-subtle pb-2">Profile & Identity</h2>
          <Card className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Display Name
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your display name (e.g. SUDO)"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-surface-1 border border-border-subtle focus:border-primary text-sm text-foreground focus:outline-none transition-colors"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="px-4 py-2 bg-foreground text-background hover:opacity-90 font-medium text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingName ? "Saving..." : nameSaved ? "Saved!" : "Save Name"}
                </button>

              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Account Email
              </label>
              <input
                type="text"
                value={userEmail}
                disabled
                className="w-full px-3.5 py-2 rounded-xl bg-surface-2 border border-border-subtle text-sm text-muted cursor-not-allowed opacity-75"
              />
            </div>
          </Card>
        </section>

        {/* API Keys */}
        <section>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border-subtle pb-2">API Keys & Authentication</h2>
          <Card className="p-6">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm text-muted mb-4">
                  Generate an API key to securely connect external AI assistants (like Antigravity or Cursor) to your Metaphor context engine.
                </p>
                
                {apiKey ? (
                  <div className="p-4 bg-surface-2 border border-primary/30 rounded-xl space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">Your New API Key</span>
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
                    <code className="block text-sm text-foreground font-mono break-all bg-background p-3 rounded-lg border border-border-subtle">
                      {apiKey}
                    </code>
                    <p className="text-[11px] text-accent-red font-medium flex items-center gap-1.5 mt-2">
                      <Shield className="w-3.5 h-3.5" /> Please copy this key now. You won't be able to see it again!
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateApiKey}
                    disabled={generatingKey}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground font-medium text-sm rounded-xl hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Key className="w-4 h-4" />
                    {generatingKey ? "Generating Key..." : "Generate New API Key"}
                  </button>
                )}
              </div>
            </div>
          </Card>
        </section>

        
        {/* Appearance */}
        <section>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border-subtle pb-2">Appearance</h2>
          <div className="grid grid-cols-3 gap-4">
            <button onClick={() => updateSetting("theme", "light")} className={`flex flex-col items-center gap-3 p-4 bg-surface-1 border ${settings.theme === 'light' ? 'border-primary' : 'border-border-subtle'} hover:border-primary/50 rounded-xl cursor-pointer transition-colors`}>
              <div className="w-10 h-10 rounded-full bg-background border border-border-strong flex items-center justify-center shadow-inner text-foreground">
                <Sun className="w-5 h-5" />
              </div>
              <span className={`text-xs font-semibold ${settings.theme === 'light' ? 'text-foreground' : 'text-muted'}`}>Clean (Light)</span>
            </button>
            <button onClick={() => updateSetting("theme", "dark")} className={`flex flex-col items-center gap-3 p-4 bg-surface-1 border ${settings.theme === 'dark' ? 'border-primary' : 'border-border-subtle'} hover:border-primary/50 rounded-xl cursor-pointer transition-colors`}>
              <div className="w-10 h-10 rounded-full bg-stone-900 border border-stone-700 flex items-center justify-center shadow-inner text-stone-200">
                <Moon className="w-5 h-5" />
              </div>
              <span className={`text-xs font-semibold ${settings.theme === 'dark' ? 'text-foreground' : 'text-muted'}`}>Deep (Dark)</span>
            </button>
            <button onClick={() => updateSetting("theme", "system")} className={`flex flex-col items-center gap-3 p-4 bg-surface-1 border ${settings.theme === 'system' ? 'border-primary' : 'border-border-subtle'} hover:border-primary/50 rounded-xl cursor-pointer transition-colors`}>
              <div className="w-10 h-10 rounded-full bg-background border border-border-strong flex items-center justify-center shadow-inner text-muted">
                <Monitor className="w-5 h-5" />
              </div>
              <span className={`text-xs font-semibold ${settings.theme === 'system' ? 'text-foreground' : 'text-muted'}`}>System</span>
            </button>
          </div>
        </section>

        {/* Behavior */}
        <section>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border-subtle pb-2">Engine Behavior</h2>
          <Card noPadding className="divide-y divide-border-subtle">
            <div onClick={() => updateSetting("passiveIngestion", !settings.passiveIngestion)} className="p-5 flex items-center justify-between hover:bg-surface-2/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <Database className="w-5 h-5 text-muted" />
                <div>
                  <h3 className="text-sm font-medium text-foreground">Passive Ingestion Mode</h3>
                  <p className="text-xs text-muted mt-0.5">Allow webhooks to automatically create Nodes without approval.</p>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full relative shadow-inner transition-colors ${settings.passiveIngestion ? 'bg-success' : 'bg-surface-2 border border-border-strong'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${settings.passiveIngestion ? 'right-1 bg-white shadow-sm' : 'left-1 bg-muted'}`} />
              </div>
            </div>
            
            <div onClick={() => updateSetting("clarificationNotifications", !settings.clarificationNotifications)} className="p-5 flex items-center justify-between hover:bg-surface-2/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <Bell className="w-5 h-5 text-muted" />
                <div>
                  <h3 className="text-sm font-medium text-foreground">Clarification Notifications</h3>
                  <p className="text-xs text-muted mt-0.5">Notify me when the engine encounters conflicting truths.</p>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full relative shadow-inner transition-colors ${settings.clarificationNotifications ? 'bg-success' : 'bg-surface-2 border border-border-strong'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${settings.clarificationNotifications ? 'right-1 bg-white shadow-sm' : 'left-1 bg-muted'}`} />
              </div>
            </div>
          </Card>
        </section>

      </div>
    </div>
  );
}
