"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { CheckCircle2, Clock, Play, AlertCircle, ArrowUpRight } from "lucide-react";

export interface TaskNodeData {
  id: string;
  title: string;
  objective?: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  requiredCapabilities?: string[];
  ownerName?: string;
  onDispatch?: (taskId: string) => void;
}

export const TaskNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as TaskNodeData;
  const isRunning = nodeData.status === "in_progress";
  const isCompleted = nodeData.status === "completed";

  return (
    <div
      className={`flora-node min-w-[260px] max-w-[300px] select-none text-foreground p-3.5 transition-all ${
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
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center ${
              isCompleted
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                : isRunning
                ? "bg-sky-500/10 border border-sky-500/30 text-sky-400"
                : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : isRunning ? (
              <Clock className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Clock className="w-3.5 h-3.5" />
            )}
          </div>
          <div>
            <div className="text-xs font-semibold tracking-tight text-white line-clamp-1">
              {nodeData.title}
            </div>
            <div className="text-[10px] font-mono text-zinc-400">
              Task Objective
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-mono capitalize border ${
            isCompleted
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
              : isRunning
              ? "bg-sky-950/40 border-sky-500/30 text-sky-300"
              : "bg-amber-950/40 border-amber-500/30 text-amber-300"
          }`}
        >
          {nodeData.status.replace("_", " ")}
        </span>
      </div>

      {/* Objective text */}
      {nodeData.objective && (
        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-2.5">
          {nodeData.objective}
        </p>
      )}

      {/* Required capabilities */}
      {nodeData.requiredCapabilities && nodeData.requiredCapabilities.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {nodeData.requiredCapabilities.map((req, i) => (
            <span
              key={i}
              className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/10 text-[9px] font-mono text-zinc-400"
            >
              req:{req}
            </span>
          ))}
        </div>
      )}

      {/* Footer / Assigned Owner or Dispatch CTA */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
        <span className="text-zinc-500">
          Owner: <span className="text-zinc-300">{nodeData.ownerName || "Unassigned"}</span>
        </span>
        {nodeData.status === "pending" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              nodeData.onDispatch?.(nodeData.id);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            <span>Dispatch</span>
          </button>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="flora-handle !-right-2"
      />
    </div>
  );
});

TaskNode.displayName = "TaskNode";
