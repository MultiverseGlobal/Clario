"use client";

import React from "react";
import { MousePointer, Hand, Bot, Wrench, CheckSquare, FileText, Plus } from "lucide-react";

export type CanvasMode = "select" | "pan";

interface DockPaletteProps {
  mode: CanvasMode;
  onSetMode: (mode: CanvasMode) => void;
  onAddAgent: () => void;
  onAddTool: () => void;
  onAddTask: () => void;
  onAddContext: () => void;
}

export function DockPalette({
  mode,
  onSetMode,
  onAddAgent,
  onAddTool,
  onAddTask,
  onAddContext,
}: DockPaletteProps) {
  return (
    <div className="fixed left-5 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 p-1.5 rounded-2xl flora-glass shadow-2xl">
      {/* Selection Mode */}
      <button
        onClick={() => onSetMode("select")}
        title="Select Tool (V)"
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
          mode === "select"
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
            : "text-zinc-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <MousePointer className="w-4 h-4" />
      </button>

      {/* Pan Mode */}
      <button
        onClick={() => onSetMode("pan")}
        title="Pan Tool (H)"
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
          mode === "pan"
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
            : "text-zinc-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <Hand className="w-4 h-4" />
      </button>

      <div className="w-5 h-[1px] bg-white/10 my-1" />

      {/* Add Agent */}
      <button
        onClick={onAddAgent}
        title="Add AI Agent Node (A)"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all cursor-pointer group"
      >
        <Bot className="w-4 h-4 group-hover:scale-110 transition-transform" />
      </button>

      {/* Add Tool (MCP) */}
      <button
        onClick={onAddTool}
        title="Add MCP Tool Node (T)"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer group"
      >
        <Wrench className="w-4 h-4 group-hover:scale-110 transition-transform" />
      </button>

      {/* Add Task */}
      <button
        onClick={onAddTask}
        title="Add Objective / Task Node (K)"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer group"
      >
        <CheckSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
      </button>

      {/* Add Context */}
      <button
        onClick={onAddContext}
        title="Add Context Reference (C)"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-sky-400 hover:bg-sky-500/10 transition-all cursor-pointer group"
      >
        <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
      </button>
    </div>
  );
}
