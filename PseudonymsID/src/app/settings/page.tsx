"use client";

import React, { useState, useEffect } from "react";
import { Key, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function SettingsPage() {
  const [keys, setKeys] = useState({ gemini: "", openai: "", anthropic: "", username: "" });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      const meta = user?.user_metadata ?? {};
      setKeys({
        gemini: meta.gemini_api_key ?? "",
        openai: meta.openai_api_key ?? "",
        anthropic: meta.anthropic_api_key ?? "",
        username: meta.username ?? "",
      });
    });
  }, []);

  const handleSave = async () => {
    setStatus("saving");
    const { error } = await createClient().auth.updateUser({
      data: {
        gemini_api_key: keys.gemini,
        openai_api_key: keys.openai,
        anthropic_api_key: keys.anthropic,
        username: keys.username,
      },
    });
    
    if (error) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    } else {
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const providers = [
    { id: "gemini" as const, label: "Google Gemini", placeholder: "AIzaSy..." },
    { id: "anthropic" as const, label: "Anthropic Claude", placeholder: "sk-ant-..." },
    { id: "openai" as const, label: "OpenAI", placeholder: "sk-..." },
  ];

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "80px 24px 120px" }}>
      
      {/* Header */}
      <div className="animate-enter" style={{ marginBottom: "56px" }}>
        <span className="label-mono" style={{ display: "inline-block", marginBottom: "16px" }}>
          Preferences
        </span>
        <h1 
          className="font-serif-title"
          style={{ fontSize: "48px", color: "var(--text-primary)", margin: "0 0 16px", lineHeight: 1.1 }}
        >
          Ecosystem Identity & Keys
        </h1>
        <p style={{ fontSize: "16px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Set your username and API keys once here. They are securely encrypted in your Supabase profile and dynamically loaded by Metaphor, Orion, and Atlas.
        </p>
      </div>

      {/* Form */}
      <div className="animate-enter delay-1 glass-panel" style={{ padding: "40px 32px", borderRadius: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginBottom: "40px" }}>
          
          {/* Username Field */}
          <div>
            <label 
              htmlFor="username" 
              className="label-mono"
              style={{ display: "block", marginBottom: "12px", color: "var(--text-primary)" }}
            >
              Global Username
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="username"
                type="text"
                placeholder="e.g. Theo"
                value={keys.username}
                onChange={(e) => setKeys((prev) => ({ ...prev, username: e.target.value }))}
                style={{
                  width: "100%", padding: "14px 16px",
                  background: "var(--bg-canvas)", border: "1px solid var(--border-strong)",
                  borderRadius: "12px", fontSize: "14px", color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)", outline: "none",
                  transition: "all 0.2s var(--ease-out)", boxShadow: "var(--shadow-sm)"
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border-strong)"}
              />
            </div>
          </div>

          <div style={{ height: "1px", background: "var(--border-subtle)", margin: "8px 0" }} />

          {providers.map((p) => (
            <div key={p.id}>
              <label 
                htmlFor={p.id} 
                className="label-mono"
                style={{ display: "block", marginBottom: "12px", color: "var(--text-primary)" }}
              >
                {p.label} API Key
              </label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
                  <Key size={16} />
                </div>
                <input
                  id={p.id}
                  type="password"
                  placeholder={p.placeholder}
                  value={keys[p.id]}
                  onChange={(e) => setKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  style={{
                    width: "100%", padding: "14px 16px 14px 44px",
                    background: "var(--bg-canvas)", border: "1px solid var(--border-strong)",
                    borderRadius: "12px", fontSize: "14px", color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)", outline: "none",
                    transition: "all 0.2s var(--ease-out)", boxShadow: "var(--shadow-sm)"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--border-strong)"}
                />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "24px", borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
            {status === "saved" && <><CheckCircle2 size={16} color="var(--green)" /> <span style={{ color: "var(--green)" }}>Synced securely</span></>}
            {status === "error" && <><AlertCircle size={16} color="var(--red)" /> <span style={{ color: "var(--red)" }}>Update failed</span></>}
            {status === "saving" && <span>Encrypting...</span>}
          </div>
          
          <button
            onClick={handleSave}
            disabled={status === "saving"}
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "12px 24px", background: "var(--text-primary)",
              border: "1px solid var(--text-primary)", borderRadius: "30px",
              fontSize: "14px", fontWeight: 500, color: "var(--bg-canvas)",
              cursor: status === "saving" ? "not-allowed" : "pointer", 
              transition: "all 0.2s var(--ease-out)",
              boxShadow: "var(--shadow-md)", fontFamily: "var(--font-sans)",
              opacity: status === "saving" ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (status !== "saving") {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "var(--shadow-lg)";
              }
            }}
            onMouseLeave={(e) => {
              if (status !== "saving") {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
              }
            }}
          >
            <Save size={16} />
            {status === "saving" ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}
