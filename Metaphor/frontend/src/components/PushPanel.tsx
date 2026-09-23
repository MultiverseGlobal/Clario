"use client";

import React, { useState, useRef, useEffect } from 'react';
import { gsap } from '@/lib/gsap';
import { Send, Sparkles, X } from 'lucide-react';

interface PushPanelProps {
  selectedNodes: any[];
  onPush: (model: string) => void;
  onClose: () => void;
}

export function PushPanel({ selectedNodes, onPush, onClose }: PushPanelProps) {
  const [model, setModel] = useState('gemini-1.5-pro');
  const panelRef = useRef<HTMLDivElement>(null);
  const isOpen = selectedNodes.length > 0;

  useEffect(() => {
    if (!panelRef.current) return;

    if (isOpen) {
      gsap.fromTo(
        panelRef.current,
        { x: 380, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, ease: "power3.out" }
      );
    }
  }, [isOpen]);

  const handleClose = () => {
    if (panelRef.current) {
      gsap.to(panelRef.current, {
        x: 380,
        opacity: 0,
        duration: 0.2,
        ease: "power2.in",
        onComplete: onClose
      });
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Push Protocol"
      className="absolute right-0 top-0 bottom-0 w-80 bg-white/90 backdrop-blur-xl border-l border-[rgba(10,10,10,0.08)] z-50 flex flex-col shadow-2xl"
    >
      <div className="p-6 border-b border-[rgba(10,10,10,0.06)] flex items-center justify-between">
        <h3 className="text-[16px] font-semibold text-[var(--color-ink)] flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--color-ink)]" />
          Push Protocol
        </h3>
        <button
          onClick={handleClose}
          className="text-[#6B7280] hover:text-[var(--color-ink)] transition-colors p-1"
          aria-label="Close push panel"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <label className="text-[11px] font-mono font-medium text-[#6B7280] uppercase tracking-wider mb-3 block">
            Assembled Context ({selectedNodes.length})
          </label>
          <div className="space-y-3">
            {selectedNodes.map((node) => (
              <div key={node.id} className="p-3 bg-[rgba(10,10,10,0.02)] rounded-xl border border-[rgba(10,10,10,0.06)]">
                <div className="text-[13px] font-medium text-[var(--color-ink)] mb-1">{node.data?.label || node.id}</div>
                <div className="text-[11px] text-[#6B7280] line-clamp-2">{node.data?.summary || ""}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="text-[11px] font-mono font-medium text-[#6B7280] uppercase tracking-wider mb-3 block">
            Model Engine
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-[rgba(10,10,10,0.02)] border border-[rgba(10,10,10,0.08)] rounded-xl p-2.5 text-[13px] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-ink)] transition-colors"
          >
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            <option value="claude-3-opus">Claude 3 Opus</option>
            <option value="gpt-4o">GPT-4o</option>
          </select>
        </div>
      </div>

      <div className="p-6 border-t border-[rgba(10,10,10,0.06)] bg-white/95">
        <button
          onClick={() => onPush(model)}
          className="w-full bg-[#111315] hover:bg-[#2A2E33] text-white font-medium py-3 px-4 rounded-full flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <Send size={16} />
          Push Context
        </button>
      </div>
    </div>
  );
}
