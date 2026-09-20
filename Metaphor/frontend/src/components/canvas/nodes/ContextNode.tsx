"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { FileCode, Database, BookOpen, Layers } from "lucide-react";

export interface ContextNodeData {
  id: string;
  name: string;
  category?: "spec" | "schema" | "repo_map" | "memory";
  snippet?: string;
  tokens?: number;
  uri?: string;
}

export const ContextNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as ContextNodeData;

  const getIcon = () => {
    switch (nodeData.category) {
      case "schema":
        return <Database className="w-3.5 h-3.5" />;
      case "repo_map":
        return <Layers className="w-3.5 h-3.5" />;
      default:
        return <FileCode className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      className={`flora-node min-w-[220px] max-w-[260px] select-none text-foreground p-3.5 transition-all ${
        selected ? "selected" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="flora-handle !-left-2"
      />

      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            {getIcon()}
          </div>
          <div>
            <div className="text-xs font-semibold tracking-tight text-white line-clamp-1">
              {nodeData.name}
            </div>
            <div className="text-[10px] font-mono text-zinc-400 uppercase">
              {nodeData.category || "Context Ref"}
            </div>
          </div>
        </div>

        {nodeData.tokens && (
          <span className="text-[10px] font-mono text-zinc-500">
            ~{nodeData.tokens} tok
          </span>
        )}
      </div>

      {nodeData.snippet && (
        <pre className="text-[11px] font-mono text-zinc-400 bg-black/40 p-2 rounded border border-white/5 line-clamp-3 overflow-hidden">
          {nodeData.snippet}
        </pre>
      )}

      {nodeData.uri && (
        <div className="mt-2 text-[10px] font-mono text-zinc-500 truncate">
          {nodeData.uri}
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

ContextNode.displayName = "ContextNode";
