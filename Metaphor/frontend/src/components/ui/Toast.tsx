import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastMessage = {
  id: string;
  title: string;
  description?: string;
  type?: "success" | "error" | "info";
};

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto p-4 rounded-2xl flex items-start justify-between gap-4 animate-in slide-in-from-bottom-3 fade-in duration-300"
          style={{
            background: "var(--color-surface-1)",
            border: "1px solid var(--color-border-subtle)",
            boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)",
          }}
        >
          <div className="flex items-start gap-3">
            {toast.type === "error" ? (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "rgba(244,63,94,0.8)" }} />
            ) : toast.type === "info" ? (
              <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--color-primary)" }} />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "rgba(76,175,125,0.8)" }} />
            )}
            <div>
              <h4 className="text-[13px] font-medium tracking-tight leading-snug" style={{ color: "var(--color-foreground)", fontFamily: "'Satoshi', sans-serif" }}>
                {toast.title}
              </h4>
              {toast.description && (
                <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--color-muted)", fontFamily: "'Satoshi', sans-serif" }}>
                  {toast.description}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded-md transition-colors cursor-pointer"
            style={{ color: "var(--color-muted)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--color-foreground)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--color-muted)")}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
