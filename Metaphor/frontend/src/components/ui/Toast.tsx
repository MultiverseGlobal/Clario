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
          className="pointer-events-auto p-4 rounded-xl bg-surface-1 border border-border-strong shadow-palette flex items-start justify-between gap-3 animate-in slide-in-from-bottom-3 fade-in duration-200"
        >
          <div className="flex items-start gap-3">
            {toast.type === "error" ? (
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            ) : toast.type === "info" ? (
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="text-xs font-semibold text-foreground leading-snug">{toast.title}</h4>
              {toast.description && (
                <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{toast.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-muted hover:text-foreground p-1 rounded-md hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
