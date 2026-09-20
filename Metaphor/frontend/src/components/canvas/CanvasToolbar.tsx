"use client";

import React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Play,
  Plus,
  Maximize2,
  Share2,
  Settings,
  Sparkles,
  Activity,
  Layers,
} from "lucide-react";
import { MetaphorLogo } from "@/components/ui/MetaphorLogo";

interface CanvasToolbarProps {
  projectName?: string;
  isDispatching?: boolean;
  activeCount?: number;
  onDispatchAll?: () => void;
  onNewTask?: () => void;
  onFitView?: () => void;
  onAutoLayout?: () => void;
}

export function CanvasToolbar({
  projectName = "Pseudonyms Network",
  isDispatching = false,
  activeCount = 3,
  onDispatchAll,
  onNewTask,
  onFitView,
  onAutoLayout,
}: CanvasToolbarProps) {
  return (
    <header className="fixed top-5 left-5 right-5 z-40 flex items-center justify-between pointer-events-none select-none">
      {/* Left: Project Brand & Scope */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl flora-glass shadow-xl pointer-events-auto">
        <Link
          href="/projects"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Back to Projects"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>

        <div className="flex items-center gap-2.5 px-2">
          <MetaphorLogo size={16} />
          <div className="flex flex-col">
            <span className="text-xs font-semibold tracking-tight text-white line-clamp-1">
              {projectName}
            </span>
            <span className="text-[9px] font-mono tracking-widest text-zinc-400 uppercase">
              Flora Studio
            </span>
          </div>
        </div>

        <div className="w-[1px] h-4 bg-white/10 mx-1" />

        {/* Network telemetry badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950/60 border border-white/5 text-[10px] font-mono">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isDispatching ? "bg-sky-400 animate-ping" : "bg-emerald-400"
            }`}
          />
          <span className="text-zinc-300">
            {isDispatching
              ? "DISPATCHING FLOW"
              : `${activeCount} PARTICIPANTS`}
          </span>
        </div>
      </div>

      {/* Right: Actions & Tools */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Canvas layout controls */}
        <div className="flex items-center p-1 rounded-2xl flora-glass shadow-xl">
          {onFitView && (
            <button
              onClick={onFitView}
              title="Fit to Screen (F)"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          {onAutoLayout && (
            <button
              onClick={onAutoLayout}
              title="Auto-organize Nodes (L)"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 p-1 rounded-2xl flora-glass shadow-xl">
          {onNewTask && (
            <button
              onClick={onNewTask}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-400" />
              <span>New Task</span>
            </button>
          )}

          {onDispatchAll && (
            <button
              onClick={onDispatchAll}
              disabled={isDispatching}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              {isDispatching ? (
                <>
                  <Activity className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Dispatch Flow</span>
                </>
              )}
            </button>
          )}

          <Link
            href="/settings"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors ml-1"
            title="MCP Network Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
