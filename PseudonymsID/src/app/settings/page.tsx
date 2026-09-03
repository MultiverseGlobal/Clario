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
    <div className="max-w-[600px] mx-auto px-6 pt-20 pb-32">
      
      {/* Header */}
      <div className="pds-animate-fade mb-14">
        <span className="pds-label mb-4 inline-block">
          Preferences
        </span>
        <h1 className="pds-title text-4xl mb-4">
          Ecosystem Identity & Keys
        </h1>
        <p className="text-base text-[var(--pds-text-secondary)] leading-relaxed">
          Set your username and API keys once here. They are securely encrypted in your Supabase profile and dynamically loaded by Metaphor, Orion, and Atlas.
        </p>
      </div>

      {/* Form */}
      <div className="pds-animate-slide-up pds-card p-8 sm:p-10">
        <div className="flex flex-col gap-6 mb-10">
          
          {/* Username Field */}
          <div>
            <label 
              htmlFor="username" 
              className="pds-label"
            >
              Global Username
            </label>
            <div className="relative">
              <input
                id="username"
                type="text"
                placeholder="e.g. Theo"
                value={keys.username}
                onChange={(e) => setKeys((prev) => ({ ...prev, username: e.target.value }))}
                className="pds-input"
              />
            </div>
          </div>

          <div className="pds-divider my-2" />

          {providers.map((p) => (
            <div key={p.id}>
              <label 
                htmlFor={p.id} 
                className="pds-label"
              >
                {p.label} API Key
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--pds-text-muted)]">
                  <Key size={16} />
                </div>
                <input
                  id={p.id}
                  type="password"
                  placeholder={p.placeholder}
                  value={keys[p.id]}
                  onChange={(e) => setKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  className="pds-input mono icon"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 pt-6 border-t border-[var(--pds-border-subtle)]">
          <button
            onClick={handleSave}
            disabled={status === "saving"}
            className="pds-btn-primary"
          >
            <Save size={16} />
            {status === "saving" ? "Saving..." : "Save Configuration"}
          </button>
          <div className="min-h-[20px] flex justify-center">
            {status === "saved" && <div className="pds-feedback success"><CheckCircle2 size={16} /> Synced securely</div>}
            {status === "error" && <div className="pds-feedback error"><AlertCircle size={16} /> Update failed</div>}
            {status === "saving" && <div className="pds-feedback loading"><div className="pds-spinner" /> Encrypting...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
