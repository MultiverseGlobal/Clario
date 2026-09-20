"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Wrench, Terminal, Cpu, CheckCircle2, Zap } from "lucide-react";

export interface ToolNodeData {
  id: string;
  name: string;
  transport?: "stdio" | "sse" | "http";
  status: "active" | "standby" | "running" | "error";
  capabilities: string[];
  latencyMs?: number;
  commandSnippet?: string;
}

export const ToolNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as ToolNodeData;
  const isRunning = nodeData.status === "running";

  return (
    <div
      className={`flora-node min-w-[240px] max-w-[280px] select-none text-foreground p-3.5 transition-all ${
        selected ? "selected" : ""
      } ${isRunning ? "flora-node-running" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="flora-handle !-left-2"
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Wrench className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-tight text-white flex items-center gap-1.5">
              {nodeData.name}
            </div>
            <div className="text-[10px] font-mono text-zinc-400 uppercase">
              MCP Tool • {nodeData.transport || "stdio"}
            </div>
          </div>
        </div>

        {/* Latency / Ping Pill */}
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 border border-white/5 text-[9px] font-mono text-emerald-400">
          <Zap className="w-2.5 h-2.5" />
          <span>{nodeData.latencyMs ? `${nodeData.latencyMs}ms` : "online"}</span>
        </div>
      </div>

      {/* Exposed Capabilities */}
      <div className="space-y-1.5">
        <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">
          Tool Functions
        </div>
        <div className="flex flex-wrap gap-1">
          {nodeData.capabilities && nodeData.capabilities.length > 0 ? (
            nodeData.capabilities.map((cap, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/20 text-[10px] font-mono text-emerald-300"
              >
                {cap}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-zinc-500 italic">No functions discovered</span>
          )}
        </div>
      </div>

      {/* Command Preview */}
      {nodeData.commandSnippet && (
        <div className="mt-2.5 pt-2 border-t border-white/5 text-[10px] text-zinc-400 font-mono truncate">
          <span className="text-zinc-600">$ </span>
          <span className="text-zinc-300">{nodeData.commandSnippet}</span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="flora-handle !-right-2"
      />
    </div>
  );
});

ToolNode.displayName = "ToolNode";
