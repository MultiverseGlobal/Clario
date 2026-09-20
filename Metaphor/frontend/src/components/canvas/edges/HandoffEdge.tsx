"use client";

import React from "react";
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from "@xyflow/react";

export interface HandoffEdgeData {
  handoffId?: string;
  status?: "pending" | "flowing" | "completed" | "failed";
  label?: string;
}

export function HandoffEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = (data as HandoffEdgeData) || {};
  const isFlowing = edgeData.status === "flowing";
  const isCompleted = edgeData.status === "completed";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          strokeWidth: isFlowing ? 2.5 : 1.5,
          stroke: isFlowing ? "#818cf8" : isCompleted ? "#10b981" : "#3f3f46",
          transition: "all 0.3s ease",
          ...style,
        }}
        className={isFlowing ? "flora-wire-active" : ""}
      />

      {/* Floating interactive edge label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#0c0d14] border border-white/10 text-[10px] font-mono shadow-lg select-none"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isFlowing
                ? "bg-indigo-400 animate-ping"
                : isCompleted
                ? "bg-emerald-400"
                : "bg-zinc-500"
            }`}
          />
          <span className="text-zinc-300">
            {edgeData.label || "Handoff Relay"}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
