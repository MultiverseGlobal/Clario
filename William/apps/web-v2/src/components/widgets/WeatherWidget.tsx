"use client";

import React from "react";
import { Cloud, Sun, CloudSun, CloudRain } from "@phosphor-icons/react";
import type { WeatherData } from "@/lib/types";
import { SkeletonCard } from "@/components/ui/Skeleton";

interface WeatherWidgetProps {
  data?: WeatherData | null;
  isLoading?: boolean;
}

const CONDITION_ICONS: Record<string, React.ElementType> = {
  cloudy: Cloud,
  sunny: Sun,
  'partly-cloudy': CloudSun,
  rain: CloudRain,
};

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  data,
  isLoading = false,
}) => {
  if (isLoading) {
    return <SkeletonCard className="max-w-xl mx-auto" />;
  }

  const weather = data ?? {
    city: "Lisbon",
    temp: "22°C",
    condition: "Cloudy",
    description: "Will get sunnier as the day progresses.",
    hourly: [
      { time: "Now", temp: "22°", condition: "cloudy", isNow: true },
      { time: "10:00", temp: "22°", condition: "partly-cloudy" },
      { time: "11:00", temp: "23°", condition: "partly-cloudy" },
      { time: "12:00", temp: "24°", condition: "sunny" },
      { time: "13:00", temp: "26°", condition: "sunny" },
    ],
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 animate-fade-slide-up">
      {/* Overview Main Card */}
      <div className="aurora-glass-card p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-4xl font-bold tracking-tight text-[var(--aurora-text-main)]">
            {weather.temp}
          </span>
          <div>
            <h4 className="text-lg font-bold text-[var(--aurora-text-main)]">
              {weather.condition}
            </h4>
            <p className="text-xs text-[var(--aurora-text-sub)]">
              {weather.description}
            </p>
          </div>
        </div>
        <div className="p-3 bg-amber-500/10 rounded-2xl">
          <CloudSun size={38} weight="duotone" className="text-amber-500 animate-pulse" />
        </div>
      </div>

      {/* Hourly Forecast Pills Row */}
      <div className="aurora-glass-card p-4 flex items-center justify-between gap-2 overflow-x-auto">
        {weather.hourly.map((h, i) => {
          const Icon = CONDITION_ICONS[h.condition] ?? CloudSun;
          if (h.isNow) {
            return (
              <div
                key={i}
                className="aurora-glass-pill px-4 py-3 flex flex-col items-center gap-1.5 min-w-[72px] bg-white/90 dark:bg-stone-800 shadow-md"
              >
                <span className="text-[11px] font-bold text-[var(--aurora-text-main)]">Now</span>
                <Icon size={22} weight="duotone" className="text-stone-400" />
                <span className="text-xs font-bold text-[var(--aurora-text-main)]">{h.temp}</span>
              </div>
            );
          }
          return (
            <div key={i} className="px-3 py-2 flex flex-col items-center gap-1.5 min-w-[64px]">
              <span className="text-[11px] font-medium text-[var(--aurora-text-sub)]">{h.time}</span>
              <Icon size={20} weight="duotone" className="text-amber-400" />
              <span className="text-xs font-bold text-[var(--aurora-text-main)]">{h.temp}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

