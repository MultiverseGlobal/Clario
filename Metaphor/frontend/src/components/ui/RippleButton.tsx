"use client";

import React, { useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  variant?: "primary" | "ghost";
  className?: string;
  children: React.ReactNode;
}

export function RippleButton({ href, variant = "primary", className = "", children, ...props }: RippleButtonProps) {
  const reduce = useReducedMotion();
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);

  const addRipple = (event: React.MouseEvent) => {
    if (reduce) return;
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newRipple = { x, y, id: Date.now() };
    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600); // match ripple animation duration
  };

  const baseClass = variant === "primary" ? "btn-primary" : "btn-ghost";
  const combinedClass = `${baseClass} relative overflow-hidden group ${className}`;

  const renderRipples = () => (
    <>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute bg-white/30 rounded-full pointer-events-none"
          style={{
            left: r.x,
            top: r.y,
            width: 200,
            height: 200,
            transform: "translate(-50%, -50%) scale(0)",
            animation: "ripple 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        />
      ))}
      <style jsx>{`
        @keyframes ripple {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );

  if (href) {
    return (
      <Link href={href} passHref legacyBehavior>
        <a ref={buttonRef as React.RefObject<HTMLAnchorElement>} className={combinedClass} onClick={addRipple}>
          <span className="relative z-10 flex items-center gap-2">{children}</span>
          {renderRipples()}
        </a>
      </Link>
    );
  }

  return (
    <button ref={buttonRef as React.RefObject<HTMLButtonElement>} className={combinedClass} onClick={(e) => { addRipple(e); props.onClick?.(e); }} {...props}>
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      {renderRipples()}
    </button>
  );
}
