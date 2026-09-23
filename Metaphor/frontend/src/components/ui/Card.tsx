import React from "react";
import { ArrowRight } from "lucide-react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  noPadding?: boolean;
}

export function Card({ children, className = "", noPadding = false, ...props }: CardProps) {
  return (
    <div 
      className={`bg-surface-1 rounded-2xl border transition-all ${noPadding ? "" : "p-6"} ${className}`}
      style={{ 
        borderColor: "var(--color-border-subtle)",
        transition: 'all var(--transition-base)' 
      }}
      {...props}
    >
      {children}
    </div>
  );
}

// The dominant Hero Card for continuing a workflow
export function HeroActionCard({ title, subtitle, metadata, onClick }: { title: string, subtitle: string, metadata: string, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="group relative flex flex-col justify-end p-8 w-full min-h-[220px] rounded-[24px] cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      style={{ 
        background: "var(--color-surface-1)",
        border: "1px solid var(--color-border-subtle)",
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)' 
      }}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick?.(); }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "var(--color-border-strong)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--color-border-subtle)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Subtle glowing orb effect in the background */}
      <div 
        className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-700"
        style={{ background: "radial-gradient(circle, rgba(76,175,125,0.15) 0%, rgba(0,0,0,0) 70%)" }}
      ></div>
      
      <div className="relative z-10 w-full">
        <p className="text-[10px] font-mono uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: "var(--color-muted)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-primary)", boxShadow: "0 0 6px rgba(76,175,125,0.6)" }}></span>
          {metadata}
        </p>
        <h2 
          className="text-3xl md:text-4xl font-normal mb-3"
          style={{ 
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            color: "var(--color-foreground)",
            letterSpacing: "-0.01em"
          }}
        >
          {title}
        </h2>
        <div className="flex items-center justify-between">
          <p className="text-sm font-light" style={{ color: "var(--color-muted)", fontFamily: "'Satoshi', sans-serif" }}>{subtitle}</p>
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300"
            style={{ 
              background: "var(--color-surface-2)",
              color: "var(--color-foreground)"
            }}
          >
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal action card, no borders, just a subtle hover fill
export function ActionCard({ icon, title, description, onClick }: { icon: React.ReactNode, title: string, description: string, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="group flex flex-col items-start p-5 rounded-2xl cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
      style={{ 
        background: "transparent",
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' 
      }}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick?.(); }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "var(--color-surface-2)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <div className="w-full">
        <div 
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-300 mb-5"
          style={{
            background: "var(--color-surface-2)",
            color: "var(--color-muted)"
          }}
        >
          {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4" })}
        </div>
        <h3 className="text-[14px] font-medium tracking-tight mb-1.5" style={{ color: "var(--color-foreground)", fontFamily: "'Satoshi', sans-serif" }}>{title}</h3>
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>{description}</p>
      </div>
    </div>
  );
}
