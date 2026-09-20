"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Bot, Sparkles, Activity } from "lucide-react";

export interface AgentNodeData {
  id: string;
  name: string;
  model?: string;
  type?: string;
  status: "idle" | "running" | "ready" | "error";
  capabilities: string[];
  lastAction?: string;
}

export const AgentNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as AgentNodeData;
  const isRunning = nodeData.status === "running";

  return (
    <div
      className={`flora-node min-w-[240px] max-w-[280px] select-none text-foreground p-3.5 transition-all ${
        selected ? "selected" : ""
      } ${isRunning ? "flora-node-running" : ""}`}
    >
      {/* Target handle for receiving task delegations */}
      <Handle
        type="target"
        position={Position.Left}
        className="flora-handle !-left-2"
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-tight text-white flex items-center gap-1.5">
              {nodeData.name}
            </div>
            <div className="text-[10px] font-mono text-zinc-400">
              {nodeData.model || "Host AI Agent"}
            </div>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900 border border-white/5 text-[10px] font-mono">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isRunning
                ? "bg-sky-400 animate-ping"
                : nodeData.status === "error"
                ? "bg-rose-500"
                : "bg-emerald-400"
            }`}
          />
          <span className="capitalize text-zinc-300">
            {isRunning ? "active" : nodeData.status || "idle"}
          </span>
        </div>
      </div>

      {/* Capabilities section */}
      <div className="space-y-1.5">
        <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">
          Capabilities
        </div>
        <div className="flex flex-wrap gap-1">
          {nodeData.capabilities && nodeData.capabilities.length > 0 ? (
            nodeData.capabilities.slice(0, 4).map((cap, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-300"
              >
                {cap}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-zinc-500 italic">No declared tags</span>
          )}
          {nodeData.capabilities && nodeData.capabilities.length > 4 && (
            <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-mono text-zinc-400">
              +{nodeData.capabilities.length - 4}
            </span>
          )}
        </div>
      </div>

      {/* Last Action / Telemetry Footnote */}
      {nodeData.lastAction && (
        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center gap-1 text-[10px] text-zinc-400 font-mono truncate">
          <Activity className="w-3 h-3 text-indigo-400 shrink-0" />
          <span className="truncate">{nodeData.lastAction}</span>
        </div>
      )}

      {/* Source handle for dispatching handoffs */}
      <Handle
        type="source"
        position={Position.Right}
        className="flora-handle !-right-2"
      />
    </div>
  );
});

AgentNode.displayName = "AgentNode";
