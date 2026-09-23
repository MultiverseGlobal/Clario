import React from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "primary";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant = "default", children, className = "", ...props }: BadgeProps) {
  const variants = {
    default: { bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.15)", text: "rgba(148,163,184,0.80)" },
    primary: { bg: "rgba(76,175,125,0.07)", border: "rgba(76,175,125,0.25)", text: "var(--color-primary)" },
    success: { bg: "rgba(34,197,94,0.07)", border: "rgba(34,197,94,0.20)", text: "rgba(34,197,94,0.85)" },
    warning: { bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.18)", text: "rgba(245,158,11,0.85)" },
    danger: { bg: "rgba(244,63,94,0.08)", border: "rgba(244,63,94,0.20)", text: "rgba(244,63,94,0.85)" },
  };

  const current = variants[variant];

  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-mono font-medium tracking-widest uppercase ${className}`}
      style={{
        background: current.bg,
        border: `1px solid ${current.border}`,
        color: current.text,
      }}
      {...props}
    >
      {children}
    </span>
  );
}
