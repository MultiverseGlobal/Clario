"use client";

import React, { useState } from "react";
import { X, Play, Copy, Check, Terminal, Shield, Zap, Sparkles, Activity } from "lucide-react";

export interface SelectedEntity {
  type: "agent" | "tool" | "task" | "context" | "handoff";
  id: string;
  data: any;
}

interface InspectorDrawerProps {
  entity: SelectedEntity | null;
  onClose: () => void;
  onUpdateEntity?: (id: string, updatedData: any) => void;
  onTestToolCall?: (toolId: string, actionName: string, args: any) => Promise<any>;
}

export function InspectorDrawer({
  entity,
  onClose,
  onUpdateEntity,
  onTestToolCall,
}: InspectorDrawerProps) {
  const [testArgs, setTestArgs] = useState<string>("{}");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!entity) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const executeTest = async () => {
    if (!onTestToolCall) return;
    try {
      setIsExecuting(true);
      const parsed = JSON.parse(testArgs || "{}");
      const res = await onTestToolCall(
        entity.id,
        entity.data.capabilities?.[0] || "execute",
        parsed
      );
      setTestResult(JSON.stringify(res, null, 2));
    } catch (err: any) {
      setTestResult(`Error: ${err.message || String(err)}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <aside className="fixed top-5 right-5 bottom-5 w-[360px] z-50 rounded-2xl flora-glass shadow-2xl flex flex-col overflow-hidden text-foreground animate-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-indigo-400">
            Inspector • {entity.type}
          </div>
          <div className="text-sm font-semibold text-white tracking-tight line-clamp-1">
            {entity.data.name || entity.data.title || entity.id}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
        {/* AGENT VIEW */}
        {entity.type === "agent" && (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Model Identifier
              </label>
              <div className="p-2 rounded-lg bg-black/40 border border-white/5 font-mono text-zinc-300">
                {entity.data.model || "gpt-4o"}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Role & Identity
              </label>
              <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-zinc-300">
                Coordinator Host Agent (Handles task delegation and execution verification)
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Declared Capabilities
              </label>
              <div className="flex flex-wrap gap-1">
                {entity.data.capabilities?.map((cap: string, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-500/20 text-indigo-300 font-mono text-[10px]"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* TOOL VIEW (MCP) */}
        {entity.type === "tool" && (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Connection Transport
              </label>
              <div className="p-2 rounded-lg bg-black/40 border border-white/5 font-mono text-emerald-400 flex items-center justify-between">
                <span>{entity.data.transport || "stdio (Local Process)"}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Registered Tool Actions
              </label>
              <div className="space-y-1">
                {entity.data.capabilities?.map((cap: string, i: number) => (
                  <div
                    key={i}
                    className="p-2 rounded bg-zinc-900 border border-white/5 font-mono text-[11px] text-zinc-300 flex items-center justify-between"
                  >
                    <span>{cap}</span>
                    <span className="text-[9px] text-zinc-500 uppercase">MCP RPC</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Invocation Sandbox */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-indigo-400" />
                  <span>Test Invocation</span>
                </label>
                <button
                  onClick={executeTest}
                  disabled={isExecuting}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[10px] transition-colors cursor-pointer"
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>{isExecuting ? "Calling..." : "Test Call"}</span>
                </button>
              </div>

              <textarea
                value={testArgs}
                onChange={(e) => setTestArgs(e.target.value)}
                placeholder='{"param": "value"}'
                className="w-full h-20 p-2 rounded-lg bg-black/60 border border-white/10 font-mono text-[11px] text-zinc-300 focus:outline-none focus:border-indigo-500 resize-none"
              />

              {testResult && (
                <div className="p-2 rounded bg-black/80 border border-white/10 font-mono text-[10px] text-zinc-300 max-h-32 overflow-y-auto">
                  <pre>{testResult}</pre>
                </div>
              )}
            </div>
          </>
        )}

        {/* TASK VIEW */}
        {entity.type === "task" && (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Objective
              </label>
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-zinc-300 leading-relaxed">
                {entity.data.objective || "No detailed objective provided."}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Required Capabilities
              </label>
              <div className="flex flex-wrap gap-1">
                {entity.data.requiredCapabilities?.map((req: string, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/20 text-amber-300 font-mono text-[10px]"
                  >
                    {req}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Current Status
              </label>
              <div className="p-2 rounded-lg bg-black/40 border border-white/5 font-mono text-zinc-300 capitalize flex items-center justify-between">
                <span>{entity.data.status}</span>
                <span className="text-[10px] text-zinc-500">
                  Assigned: {entity.data.ownerName || "None"}
                </span>
              </div>
            </div>
          </>
        )}

        {/* HANDOFF VIEW */}
        {entity.type === "handoff" && (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Context Payload
              </label>
              <pre className="p-2.5 rounded-lg bg-black/50 border border-white/10 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                {JSON.stringify(entity.data.contextRefs || { docs: "auth-spec" }, null, 2)}
              </pre>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Expected Output Specification
              </label>
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-zinc-300 leading-relaxed">
                {entity.data.expectedOutput || "Scaffold complete auth route handlers."}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Copy Payload CTA */}
      <div className="p-4 border-t border-white/10 bg-black/20 flex items-center justify-between">
        <span className="text-[10px] font-mono text-zinc-500">ID: {entity.id.slice(0, 8)}...</span>
        <button
          onClick={() => handleCopy(JSON.stringify(entity.data, null, 2))}
          className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied JSON" : "Copy Payload"}</span>
        </button>
      </div>
    </aside>
  );
}
