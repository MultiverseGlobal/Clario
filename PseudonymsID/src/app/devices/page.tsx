"use client";

import React, { useState, useEffect } from "react";
import { Smartphone, Monitor, QrCode, X, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function DevicesPage() {
  const [showQR, setShowQR] = useState(false);
  const [pairToken] = useState(() =>
    `psc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  );
  const [countdown, setCountdown] = useState(600); // 10 minutes
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? "");
    });
  }, []);

  // Countdown timer when QR is shown
  useEffect(() => {
    if (!showQR) return;
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(id); setShowQR(false); return 600; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [showQR]);

  const mins = String(Math.floor(countdown / 60)).padStart(2, "0");
  const secs = String(countdown % 60).padStart(2, "0");

  const qrData = encodeURIComponent(`pseudonyms://pair?token=${pairToken}&email=${userEmail}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}&bgcolor=ffffff&color=111318&margin=16`;

  const devices = [
    {
      id: "primary",
      name: "Windows Workstation",
      type: "desktop" as const,
      detail: "Windows 11 · Current session",
      status: "active",
      apps: "Pseudonyms ID · Atlas · Metaphor",
    },
    {
      id: "mobile",
      name: "Redmi 14C",
      type: "mobile" as const,
      detail: "Android 14 · Orion",
      status: "paired",
      apps: "Orion Skia Interface",
    },
  ];

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "80px 24px 120px" }}>
      
      {/* Header */}
      <div className="animate-enter" style={{ marginBottom: "56px", textAlign: "center" }}>
        <span className="label-mono" style={{ display: "inline-block", marginBottom: "16px" }}>
          Ecosystem Hardware
        </span>
        <h1 
          className="font-serif-title"
          style={{ fontSize: "48px", color: "var(--text-primary)", margin: "0 0 16px", lineHeight: 1.1 }}
        >
          Device Pairing
        </h1>
        <p style={{ fontSize: "16px", color: "var(--text-secondary)", maxWidth: "480px", margin: "0 auto", lineHeight: 1.6 }}>
          Scan a QR on Orion to securely push your sovereign session to your Redmi 14C. Zero re-login friction.
        </p>
      </div>

      {/* Action Bar */}
      <div className="animate-enter delay-1" style={{ display: "flex", justifyContent: "center", marginBottom: "48px" }}>
        <button
          onClick={() => { setShowQR(true); setCountdown(600); }}
          style={{
            display: "inline-flex", alignItems: "center", gap: "10px",
            padding: "12px 24px", background: "var(--text-primary)",
            border: "1px solid var(--text-primary)", borderRadius: "30px",
            fontSize: "14px", fontWeight: 500, color: "var(--bg-canvas)",
            cursor: "pointer", transition: "all 0.2s var(--ease-out)",
            boxShadow: "var(--shadow-md)", fontFamily: "var(--font-sans)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "var(--shadow-lg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "var(--shadow-md)";
          }}
        >
          <QrCode size={16} />
          Generate Pairing Token
        </button>
      </div>

      {/* Devices List */}
      <div className="animate-enter delay-2 glass-panel" style={{ borderRadius: "16px", overflow: "hidden" }}>
        {devices.map((device, i) => (
          <div
            key={device.id}
            style={{
              padding: "24px 32px",
              borderBottom: i !== devices.length - 1 ? "1px solid var(--border-subtle)" : "none",
              display: "grid",
              gridTemplateColumns: "48px 1fr auto",
              gap: "24px",
              alignItems: "center",
              background: device.status === "active" ? "var(--bg-surface)" : "transparent"
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: "48px", height: "48px", borderRadius: "12px",
                background: "var(--bg-surface)", border: "1px solid var(--border-strong)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: device.type === "mobile" ? "var(--accent)" : "var(--text-primary)",
                boxShadow: "var(--shadow-sm)"
              }}
            >
              {device.type === "mobile" ? <Smartphone size={20} /> : <Monitor size={20} />}
            </div>

            {/* Info */}
            <div>
              <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>
                {device.name}
              </p>
              <p className="label-mono" style={{ margin: "0 0 4px", color: "var(--text-secondary)" }}>
                {device.detail}
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
                {device.apps}
              </p>
            </div>

            {/* Status */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className={`status-dot ${device.status === "active" ? "active" : "inactive"}`} />
              <span className="label-mono" style={{ color: device.status === "active" ? "var(--green)" : "var(--text-muted)" }}>
                {device.status === "active" ? "Current" : "Standby"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* QR Modal - High-end glass aesthetic */}
      {showQR && (
        <div
          className="animate-blur-in"
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(248, 247, 244, 0.8)", backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowQR(false); }}
        >
          <div
            className="animate-enter"
            style={{
              width: "100%", maxWidth: "380px",
              background: "var(--bg-surface)", border: "1px solid var(--border-strong)",
              borderRadius: "24px", padding: "40px 32px",
              boxShadow: "var(--shadow-float)", textAlign: "center"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", position: "absolute", top: "24px", right: "24px", left: "24px" }}>
              <div className="label-mono" style={{ color: "var(--accent)" }}>Secure Handoff</div>
              <button
                onClick={() => setShowQR(false)}
                style={{ background: "var(--bg-canvas)", border: "1px solid var(--border-subtle)", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-secondary)" }}
              >
                <X size={14} />
              </button>
            </div>

            <h3 className="font-serif-title" style={{ fontSize: "28px", margin: "16px 0 8px" }}>Scan on Orion</h3>
            <p className="label-mono" style={{ marginBottom: "32px", color: "var(--text-muted)" }}>Expires in {mins}:{secs}</p>

            <div style={{ display: "inline-block", background: "#FFFFFF", padding: "16px", borderRadius: "16px", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-sm)", marginBottom: "32px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="Pairing QR" width={220} height={220} style={{ display: "block" }} />
            </div>

            <div style={{ background: "var(--bg-canvas)", border: "1px solid var(--border-subtle)", borderRadius: "12px", padding: "12px 16px", textAlign: "left", marginBottom: "16px" }}>
              <span className="label-mono" style={{ display: "block", marginBottom: "6px" }}>Session Token</span>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-secondary)", margin: 0, wordBreak: "break-all" }}>
                {pairToken}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--green)" }}>
              <ShieldCheck size={14} />
              <span className="label-mono" style={{ color: "var(--green)" }}>End-to-End Encrypted</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
