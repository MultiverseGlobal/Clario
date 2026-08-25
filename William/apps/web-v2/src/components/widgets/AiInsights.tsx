"use client";

import React, { useState } from "react";
import { Sparkle, CaretLeft, CaretRight } from "@phosphor-icons/react";
import type { AiInsight } from "@/lib/types";
import { SkeletonCard } from "@/components/ui/Skeleton";

interface AiInsightsProps {
  insights: AiInsight[];
  isLoading?: boolean;
}

export const AiInsights: React.FC<AiInsightsProps> = ({
  insights,
  isLoading = false,
}) => {
  const [pageIndex, setPageIndex] = useState(0);

  if (isLoading) {
    return <SkeletonCard />;
  }

  const list = insights.length > 0 ? insights : [
    {
      pct: "90%",
      pctSub: "System aligned & ready.",
      taskCompleted: "12/15",
      taskSub: "Objectives completed.",
      tip: "Stay focused on core priorities.",
    }
  ];

  const safeIndex = Math.min(pageIndex, list.length - 1);
  const current = list[safeIndex];

  return (
    <div className="aurora-glass-card p-6 w-full flex flex-col justify-between h-full min-h-[260px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase text-[var(--aurora-text-sub)]">
          <Sparkle size={16} weight="bold" className="text-pink-500 animate-pulse" />
          <span>AI Insights</span>
        </div>
        {list.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
              disabled={safeIndex === 0}
              className={`p-1 rounded-full hover:bg-black/5 cursor-pointer ${
                safeIndex === 0 ? "opacity-30" : "text-[var(--aurora-text-main)]"
              }`}
            >
              <CaretLeft size={14} weight="bold" />
            </button>
            <button
              onClick={() => setPageIndex((prev) => Math.min(list.length - 1, prev + 1))}
              disabled={safeIndex === list.length - 1}
              className={`p-1 rounded-full hover:bg-black/5 cursor-pointer ${
                safeIndex === list.length - 1 ? "opacity-30" : "text-[var(--aurora-text-main)]"
              }`}
            >
              <CaretRight size={14} weight="bold" />
            </button>
          </div>
        )}
      </div>

      {/* Primary Metric */}
      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight text-[var(--aurora-text-main)]">
            {current.pct}
          </span>
        </div>
        <p className="text-xs text-[var(--aurora-text-sub)] font-medium">
          {current.pctSub}
        </p>
      </div>

      {/* Progress Line Divider */}
      <div className="w-full h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden my-3">
        <div
          className="h-full bg-gradient-to-r from-pink-400 to-amber-400 transition-all duration-500"
          style={{ width: current.pct.includes('%') ? current.pct : '75%' }}
        />
      </div>

      {/* Secondary Metric */}
      <div className="space-y-1 mb-3">
        <p className="text-lg font-bold text-[var(--aurora-text-main)]">
          {current.taskCompleted}
        </p>
        <p className="text-xs text-[var(--aurora-text-sub)]">
          {current.taskSub}
        </p>
      </div>

      {/* Focus Pill Callout */}
      <div className="aurora-glass-pill px-3.5 py-2 text-[11px] font-medium text-center text-[var(--aurora-text-sub)] shadow-inner truncate">
        {current.tip}
      </div>
    </div>
  );
};

