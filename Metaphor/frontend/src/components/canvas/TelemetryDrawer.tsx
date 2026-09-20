"use client";

import React, { useState } from "react";
import { ChevronUp, ChevronDown, Terminal, CheckCircle2, Clock, Trash2, ShieldCheck, Activity } from "lucide-react";

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  type: "handoff" | "execution" | "mcp_rpc" | "system";
  sender: string;
  receiver?: string;
  summary: string;
  status: "success" | "pending" | "error";
  raw?: any;
}

interface TelemetryDrawerProps {
  events: TelemetryEvent[];
  onClear?: () => void;
}

export function TelemetryDrawer({ events, onClear }: TelemetryDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"traces" | "evidence">("traces");
  const latestEvent = events[events.length - 1];

  return (
    <div
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-4xl rounded-2xl flora-glass shadow-2xl transition-all duration-300 flex flex-col overflow-hidden text-foreground ${
        isExpanded ? "h-[280px]" : "h-[42px]"
      }`}
    >
      {/* Collapsed Top Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-[42px] px-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors select-none shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-mono tracking-widest uppercase text-white font-semibold">
              Telemetry & Traces
            </span>
          </div>

          <div className="w-[1px] h-3.5 bg-white/10" />

          {/* Latest Event Pill */}
          {latestEvent ? (
            <div className="flex items-center gap-2 text-xs font-mono truncate max-w-[500px]">
              <span className="text-zinc-500 text-[10px]">{latestEvent.timestamp}</span>
              <span className="text-indigo-300 font-medium">[{latestEvent.sender}]</span>
              <span className="text-zinc-300 truncate">{latestEvent.summary}</span>
            </div>
          ) : (
            <span className="text-xs text-zinc-500 font-mono">No active events recorded</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onClear && isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              title="Clear Console"
              className="p-1 rounded text-zinc-400 hover:text-rose-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Content Area */}
      {isExpanded && (
        <div className="flex-1 flex flex-col overflow-hidden border-t border-white/5">
          {/* Tabs */}
          <div className="flex items-center gap-4 px-4 py-1.5 border-b border-white/5 bg-black/20 text-[10px] font-mono">
            <button
              onClick={() => setActiveTab("traces")}
              className={`pb-1 cursor-pointer transition-colors ${
                activeTab === "traces"
                  ? "text-indigo-400 border-b-2 border-indigo-500 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Live Event Traces ({events.length})
            </button>
            <button
              onClick={() => setActiveTab("evidence")}
              className={`pb-1 cursor-pointer transition-colors ${
                activeTab === "evidence"
                  ? "text-indigo-400 border-b-2 border-indigo-500 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Execution Evidence
            </button>
          </div>

          {/* Event List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-[11px]">
            {events.length === 0 ? (
              <div className="text-zinc-500 italic p-4 text-center">
                Awaiting task dispatch or agent handoff events...
              </div>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-3 p-2 rounded-lg bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <span className="text-zinc-500 text-[10px] shrink-0 mt-0.5">{ev.timestamp}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider shrink-0 mt-0.5 ${
                      ev.status === "success"
                        ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                        : ev.status === "error"
                        ? "bg-rose-950/60 text-rose-400 border border-rose-500/30"
                        : "bg-sky-950/60 text-sky-400 border border-sky-500/30"
                    }`}
                  >
                    {ev.type}
                  </span>
                  <div className="flex-1 truncate">
                    <span className="text-indigo-400 mr-1.5 font-semibold">{ev.sender}</span>
                    {ev.receiver && (
                      <span className="text-zinc-500 mr-1.5">➔ {ev.receiver}:</span>
                    )}
                    <span className="text-zinc-200">{ev.summary}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
