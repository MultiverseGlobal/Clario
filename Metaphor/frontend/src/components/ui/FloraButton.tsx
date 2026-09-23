"use client";

import React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type FloraButtonVariant = "primary" | "ghost" | "mono";
type FloraButtonSize    = "sm" | "md" | "lg";

interface FloraButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: FloraButtonVariant;
  size?: FloraButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

// ── Style maps ────────────────────────────────────────────────────────────────

const BASE = `
  inline-flex items-center justify-center gap-2
  font-sans font-medium cursor-pointer
  select-none whitespace-nowrap
  transition-all duration-150
  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
  disabled:opacity-40 disabled:cursor-not-allowed
`.trim().replace(/\s+/g, " ");

const VARIANT_STYLES: Record<FloraButtonVariant, React.CSSProperties> = {
  primary: {
    background: "#4CAF7D",
    color: "#ffffff",
    border: "none",
    borderRadius: "9999px",
  },
  ghost: {
    background: "transparent",
    color: "var(--color-foreground)",
    border: "1px solid var(--color-border-strong)",
    borderRadius: "9999px",
  },
  mono: {
    background: "rgba(255,255,255,0.04)",
    color: "var(--color-foreground)",
    border: "1px solid var(--color-border-mid)",
    borderRadius: "12px",
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    letterSpacing: "0.02em",
  },
};

const SIZE_STYLES: Record<FloraButtonSize, React.CSSProperties> = {
  sm: { fontSize: "12px", padding: "0 16px", minHeight: "34px" },
  md: { fontSize: "14px", padding: "0 22px", minHeight: "44px" },
  lg: { fontSize: "15px", padding: "0 28px", minHeight: "52px" },
};

// Hover overrides are handled via CSS class injected in globals.css
// These inline styles are base state only.

// ── Component ─────────────────────────────────────────────────────────────────

export function FloraButton({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  style,
  ...props
}: FloraButtonProps) {
  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle    = SIZE_STYLES[size];

  const hoverClass =
    variant === "primary" ? "hover:opacity-90 active:scale-[0.98]" :
    variant === "ghost"   ? "hover:bg-white/[0.04] hover:border-white/30 active:scale-[0.98]" :
                            "hover:bg-white/[0.07] hover:border-white/20 active:scale-[0.98]";

  return (
    <button
      className={`${BASE} ${hoverClass} btn-flora-${variant}`}
      style={{ ...variantStyle, ...sizeStyle, ...style }}
      disabled={loading || props.disabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <span
            className="animate-spin"
            style={{
              width: size === "sm" ? "12px" : "14px",
              height: size === "sm" ? "12px" : "14px",
              borderRadius: "50%",
              border: `2px solid currentColor`,
              borderTopColor: "transparent",
              flexShrink: 0,
            }}
          />
          <span>Loading…</span>
        </>
      ) : children}
    </button>
  );
}
