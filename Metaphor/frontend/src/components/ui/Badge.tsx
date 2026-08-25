import React from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "primary";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant = "default", children, className = "", ...props }: BadgeProps) {
  const variants = {
    default: "bg-surface-2 text-muted border-border-subtle",
    primary: "bg-primary-dim text-primary border-primary-dim",
    success: "bg-success-dim text-success border-success-dim",
    warning: "bg-warning-dim text-warning border-warning-dim",
    danger: "bg-danger-dim text-danger border-danger-dim",
  };

  return (
    <span 
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
