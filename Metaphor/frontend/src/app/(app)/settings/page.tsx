"use client";

import React, { useState, useEffect } from "react";
import { Settings, Moon, Sun, Monitor, Bell, Database, Key, Copy, Shield } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { fetchFromMetaphor } from "@/app/api";
import { getLocalSettings } from "@/lib/settings";

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
        const settingsMem = getLocalSettings();
        const localTheme = settingsMem?.theme || "light";
        applyTheme(localTheme);
        setSettings(prev => ({ ...prev, theme: localTheme }));

        const storedName = settingsMem?.user_name;
        const user = await fetchFromMetaphor("/auth/me", undefined, "GET", false, true);
        if (user) {
          const cleanName = storedName || (user.name && user.name !== "Supabase User" && user.name !== "Developer User"
            ? user.name
            : user.email ? user.email.split("@")[0] : "multiverseglobals");
          setUserName(cleanName);
          setUserEmail(user.email || "");
          if (user.settings?.theme && !settingsMem?.theme) {
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
    // Theme changes will be captured when saving all settings, but we apply classes immediately
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
    // No more localStorage.setItem("metaphor_user_name", targetName);
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
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-150 max-w-2xl mx-auto px-6 md:px-10 pt-8 pb-20">
      
      <header className="mb-12" style={{ borderBottom: "1px solid var(--color-border-subtle)", paddingBottom: "28px" }}>
        <div
          className="text-[10px] font-mono uppercase tracking-widest mb-4"
          style={{ color: "var(--color-muted)" }}
        >
          Configuration
        </div>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(32px, 4vw, 48px)",
            fontWeight: 400,
            letterSpacing: "-0.015em",
            lineHeight: 1.1,
            color: "var(--color-foreground)",
            marginBottom: "10px",
          }}
        >
          <em style={{ fontStyle: "italic", fontWeight: 300 }}>Settings.</em>
        </h1>
        <p
          className="text-xs font-mono"
          style={{ color: "var(--color-muted)" }}
        >
          Trust model · data governance · workspace preferences.
        </p>
      </header>

      <div className="space-y-8 mb-12">
        
        {/* Profile & Identity */}
        <section>
          <div
            className="text-[10px] font-mono uppercase tracking-widest mb-5 pt-2"
            style={{ color: "var(--color-muted)", borderTop: "1px solid var(--color-border-subtle)" }}
          />
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-5"
            style={{ color: "var(--color-muted)" }}
          >
            Profile &amp; Identity
          </h2>
          <div
            className="rounded-xl p-6 space-y-5"
            style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border-subtle)" }}
          >
            <div>
              <label className="pds-label">Display Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. SUDO"
                  className="flex-1 px-3 py-2 text-sm font-mono focus:outline-none transition-colors"
                  style={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border-subtle)",
                    borderRadius: "10px",
                    color: "var(--color-foreground)",
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = "var(--color-border-strong)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "var(--color-border-subtle)")}
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="btn-flora-primary text-xs"
                  style={{ minHeight: "38px", padding: "0 18px", borderRadius: "10px" }}
                >
                  {savingName ? "Saving…" : nameSaved ? "✓ Saved" : "Save"}
                </button>
              </div>
            </div>

            <div>
              <label className="pds-label">Account Email</label>
              <input
                type="text"
                value={userEmail}
                disabled
                className="w-full px-3 py-2 text-sm font-mono cursor-not-allowed opacity-50"
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: "10px",
                  color: "var(--color-muted)",
                }}
              />
            </div>
          </div>
        </section>

        {/* API Keys */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-5 mt-8"
            style={{ color: "var(--color-muted)" }}
          >
            API Keys &amp; Authentication
          </h2>
          <div
            className="rounded-xl p-6"
            style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border-subtle)" }}
          >
            <p
              className="text-sm mb-5 leading-relaxed"
              style={{ color: "var(--color-muted)", fontFamily: "'Satoshi', sans-serif" }}
            >
              Generate an API key to connect external AI assistants (Antigravity, Cursor) to your Metaphor context engine.
            </p>
            
            {apiKey ? (
              <div
                className="p-4 space-y-3 relative"
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border-strong)",
                  borderRadius: "12px",
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[9px] font-mono uppercase tracking-widest"
                    style={{ color: "var(--color-muted)" }}
                  >
                    New API Key
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(apiKey);
                      const el = document.getElementById("copy-key-text");
                      if (el) el.innerText = "Copied!";
                      setTimeout(() => { if (el) el.innerText = "Copy"; }, 2000);
                    }}
                    className="text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    style={{ color: "var(--color-muted)" }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--color-foreground)"}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--color-muted)"}
                  >
                    <Copy className="w-3.5 h-3.5" /> <span id="copy-key-text">Copy</span>
                  </button>
                </div>
                <code
                  className="block text-xs font-mono break-all p-3"
                  style={{
                    background: "var(--color-background)",
                    border: "1px solid var(--color-border-strong)",
                    borderRadius: "8px",
                    color: "var(--color-foreground)",
                  }}
                >
                  {apiKey}
                </code>
                <p
                  className="text-[10px] font-mono flex items-center gap-1.5 mt-2"
                  style={{ color: "rgba(244,63,94,0.80)" }}
                >
                  <Shield className="w-3 h-3" /> Copy now — this key won&apos;t be shown again.
                </p>
              </div>
            ) : (
              <button
                onClick={handleGenerateApiKey}
                disabled={generatingKey}
                className="btn-flora-primary text-xs"
                style={{ minHeight: "38px", padding: "0 20px", borderRadius: "10px" }}
              >
                <Key className="w-3.5 h-3.5" />
                {generatingKey ? "Generating…" : "Generate API Key"}
              </button>
            )}
          </div>
        </section>

        
        {/* Appearance */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-5 mt-8"
            style={{ color: "var(--color-muted)" }}
          >
            Appearance
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {(["light", "dark", "system"] as const).map((t) => {
              const Icon = t === "light" ? Sun : t === "dark" ? Moon : Monitor;
              const label = t === "light" ? "Light" : t === "dark" ? "Dark" : "System";
              const isActive = settings.theme === t;
              return (
                <button
                  key={t}
                  onClick={() => updateSetting("theme", t)}
                  className="flex flex-col items-center gap-2.5 p-5 cursor-pointer transition-all"
                  style={{
                    background: isActive ? "rgba(76,175,125,0.07)" : "var(--color-surface-1)",
                    border: `1px solid ${isActive ? "rgba(76,175,125,0.25)" : "var(--color-border-subtle)"}`,
                    borderRadius: "14px",
                  }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{ color: isActive ? "#4CAF7D" : "var(--color-muted)" }}
                  />
                  <span
                    className="text-[10px] font-mono uppercase tracking-widest"
                    style={{ color: isActive ? "#4CAF7D" : "var(--color-muted)" }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Sovereign Trust Model / Engine Behavior */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-5 mt-8"
            style={{ color: "var(--color-foreground)" }}
          >
            Engine Behavior
          </h2>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--color-border-subtle)" }}
          >
            {/* Toggle row helper */}
            <div
              onClick={() => updateSetting("sovereignMode", !settings.sovereignMode)}
              className="p-4 flex items-center justify-between cursor-pointer transition-colors"
              style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "var(--color-surface-2)"}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4" style={{ color: "var(--color-muted)" }} />
                <div>
                  <h3 className="text-xs font-semibold" style={{ color: "var(--color-foreground)", fontFamily: "'Satoshi', sans-serif" }}>Sovereign Mode</h3>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--color-muted)" }}>Credentials stay local. Raw document text never leaves your machine.</p>
                </div>
              </div>
              {/* Flora toggle */}
              <div
                className="w-10 h-5 rounded-full relative shadow-inner transition-colors"
                style={{ background: settings.sovereignMode ? "#4CAF7D" : "var(--color-surface-2)", border: settings.sovereignMode ? "none" : "1px solid var(--color-border-strong)" }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                  style={{
                    right: settings.sovereignMode ? "2px" : undefined,
                    left: settings.sovereignMode ? undefined : "2px",
                    background: settings.sovereignMode ? "#fff" : "var(--color-muted)",
                  }}
                />
              </div>
            </div>

            <div
              className="p-5"
              style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
            >
              <div className="flex items-center gap-4 mb-3">
                <Database className="w-5 h-5" style={{ color: "var(--color-muted)" }} />
                <div>
                  <h3 className="text-sm font-medium" style={{ color: "var(--color-foreground)", fontFamily: "'Satoshi', sans-serif" }}>Data Retention</h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>Graph nodes older than this are automatically archived.</p>
                </div>
              </div>
              <div className="flex gap-2 pl-9">
                {[30, 90, 180, 365].map(days => (
                  <button
                    key={days}
                    onClick={() => updateSetting("retentionDays", days)}
                    className="px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer"
                    style={{
                      borderRadius: "9999px",
                      border: `1px solid ${settings.retentionDays === days ? "#4CAF7D" : "var(--color-border-subtle)"}`,
                      color: settings.retentionDays === days ? "#4CAF7D" : "var(--color-muted)",
                      background: settings.retentionDays === days ? "rgba(76,175,125,0.08)" : "transparent",
                    }}
                  >
                    {days}d
                  </button>
                ))}
              </div>
            </div>

            <div
              onClick={() => updateSetting("passiveIngestion", !settings.passiveIngestion)}
              className="p-4 flex items-center justify-between cursor-pointer transition-colors"
              style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "var(--color-surface-2)"}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
            >
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4" style={{ color: "var(--color-muted)" }} />
                <div>
                  <h3 className="text-xs font-semibold" style={{ color: "var(--color-foreground)", fontFamily: "'Satoshi', sans-serif" }}>Passive Ingestion Mode</h3>
                  <p className="text-[10px] font-mono mt-1" style={{ color: "var(--color-muted)" }}>Allow webhooks to automatically create Nodes without approval.</p>
                </div>
              </div>
              <div
                className="w-10 h-5 rounded-full relative shadow-inner transition-colors"
                style={{ background: settings.passiveIngestion ? "#4CAF7D" : "var(--color-surface-2)", border: settings.passiveIngestion ? "none" : "1px solid var(--color-border-strong)" }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                  style={{
                    right: settings.passiveIngestion ? "2px" : undefined,
                    left: settings.passiveIngestion ? undefined : "2px",
                    background: settings.passiveIngestion ? "#fff" : "var(--color-muted)",
                  }}
                />
              </div>
            </div>

            <div
              onClick={() => updateSetting("clarificationNotifications", !settings.clarificationNotifications)}
              className="p-4 flex items-center justify-between cursor-pointer transition-colors"
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "var(--color-surface-2)"}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4" style={{ color: "var(--color-muted)" }} />
                <div>
                  <h3 className="text-xs font-semibold" style={{ color: "var(--color-foreground)", fontFamily: "'Satoshi', sans-serif" }}>Clarification Notifications</h3>
                  <p className="text-[10px] font-mono mt-1" style={{ color: "var(--color-muted)" }}>Notify me when the engine encounters conflicting truths.</p>
                </div>
              </div>
              <div
                className="w-10 h-5 rounded-full relative shadow-inner transition-colors"
                style={{ background: settings.clarificationNotifications ? "#4CAF7D" : "var(--color-surface-2)", border: settings.clarificationNotifications ? "none" : "1px solid var(--color-border-strong)" }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                  style={{
                    right: settings.clarificationNotifications ? "2px" : undefined,
                    left: settings.clarificationNotifications ? undefined : "2px",
                    background: settings.clarificationNotifications ? "#fff" : "var(--color-muted)",
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-5 mt-8"
            style={{ color: "rgba(244,63,94,0.60)" }}
          >
            Danger Zone
          </h2>
          <div
            className="p-5 space-y-4 rounded-xl"
            style={{
              background: "rgba(244,63,94,0.04)",
              border: "1px solid rgba(244,63,94,0.15)",
            }}
          >
            <p
              className="text-sm leading-relaxed"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontStyle: "italic",
                fontWeight: 400,
                color: "rgba(244,63,94,0.65)",
              }}
            >
              Purge your entire context graph. This action is permanent and irreversible.
            </p>
            <button
              className="text-[11px] font-mono cursor-pointer transition-colors"
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: "1px solid rgba(244,63,94,0.30)",
                borderRadius: "9999px",
                color: "rgba(244,63,94,0.70)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(244,63,94,0.65)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(244,63,94,1)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(244,63,94,0.30)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(244,63,94,0.70)";
              }}
            >
              Delete All Graph Data
            </button>
          </div>
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
