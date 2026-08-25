"use client";

import React, { useState } from "react";
import { Lightning } from "@phosphor-icons/react";
import type { VacationMetrics } from "@/lib/types";
import { SkeletonCard } from "@/components/ui/Skeleton";

interface VacationEligibilityProps {
  metrics?: VacationMetrics | null;
  isLoading?: boolean;
}

export const VacationEligibility: React.FC<VacationEligibilityProps> = ({
  metrics,
  isLoading = false,
}) => {
  const [tab, setTab] = useState<"days" | "hours">("days");

  if (isLoading) {
    return <SkeletonCard />;
  }

  const daysLeft = metrics?.daysLeft ?? 14;
  const hoursLeft = metrics?.hoursLeft ?? 112;
  const value = tab === "days" ? daysLeft : hoursLeft;
  const label = tab === "days" ? "Days left" : "Hours left";

  return (
    <div className="aurora-glass-card p-6 w-full flex flex-col justify-between h-full min-h-[260px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase text-[var(--aurora-text-sub)]">
          <Lightning size={16} weight="bold" className="text-amber-500" />
          <span>Vacation Eligibility</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="bg-black/5 dark:bg-white/5 p-1 rounded-xl flex items-center justify-between my-2 text-xs font-semibold">
        <button
          onClick={() => setTab("days")}
          className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
            tab === "days"
              ? "bg-white dark:bg-stone-800 text-[var(--aurora-text-main)] shadow-sm"
              : "text-[var(--aurora-text-muted)] hover:text-[var(--aurora-text-main)]"
          }`}
        >
          Days
        </button>
        <button
          onClick={() => setTab("hours")}
          className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
            tab === "hours"
              ? "bg-white dark:bg-stone-800 text-[var(--aurora-text-main)] shadow-sm"
              : "text-[var(--aurora-text-muted)] hover:text-[var(--aurora-text-main)]"
          }`}
        >
          Hours
        </button>
      </div>

      {/* Radial Arc Progress Gauge */}
      <div className="flex-1 flex flex-col items-center justify-center relative py-2">
        <svg className="w-32 h-24" viewBox="0 0 100 65">
          {/* Background Arc */}
          <path
            d="M 15 55 A 40 40 0 0 1 85 55"
            fill="none"
            stroke="rgba(120, 113, 108, 0.2)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* Active Gradient Arc */}
          <path
            d="M 15 55 A 40 40 0 0 1 85 55"
            fill="none"
            stroke="url(#vacationGradient)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray="110"
            strokeDashoffset={tab === "days" ? "35" : "15"}
            className="transition-all duration-700 ease-out"
          />
          <defs>
            <linearGradient id="vacationGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Text Overlay */}
        <div className="absolute top-7 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-bold tracking-tight text-[var(--aurora-text-main)]">
            {value}
          </span>
          <span className="text-[11px] font-medium text-[var(--aurora-text-sub)] mt-0.5">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
};

