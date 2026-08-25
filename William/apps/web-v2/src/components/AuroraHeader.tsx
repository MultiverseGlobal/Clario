"use client";

import React, { useState, useEffect } from "react";
import { Clock, Moon, Sun, SquaresFour } from "@phosphor-icons/react";

interface AuroraHeaderProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenSettings?: () => void;
}

export const AuroraHeader: React.FC<AuroraHeaderProps> = ({
  theme,
  onToggleTheme,
  onOpenSettings,
}) => {
  const [timeString, setTimeString] = useState<string>("Thursday 11, 2024 • 09:23AM");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        day: "numeric",
        year: "numeric",
      };
      const datePart = now.toLocaleDateString("en-US", options);
      const timePart = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).replace(" ", "");

      setTimeString(`${datePart} • ${timePart}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full flex items-center justify-between px-8 py-3 z-30">
      {/* Brand Logo */}
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold tracking-tight text-[var(--aurora-text-main)] font-sans">
          William
        </span>
      </div>


      {/* Date & Time Pill */}
      <div className="aurora-glass-pill px-5 py-2 hidden sm:flex items-center gap-2.5 text-xs font-medium text-[var(--aurora-text-sub)] shadow-sm">
        <Clock size={15} weight="bold" className="text-[var(--aurora-text-muted)]" />
        <span>{timeString}</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleTheme}
          aria-label="Toggle Theme"
          className="aurora-glass-pill p-2.5 hover:scale-105 active:scale-95 transition-transform text-[var(--aurora-text-main)] cursor-pointer"
        >
          {theme === "light" ? (
            <Moon size={18} weight="bold" />
          ) : (
            <Sun size={18} weight="bold" />
          )}
        </button>

        <button
          onClick={onOpenSettings}
          aria-label="Grid Menu"
          className="aurora-glass-pill p-2.5 hover:scale-105 active:scale-95 transition-transform text-[var(--aurora-text-main)] cursor-pointer"
        >
          <SquaresFour size={18} weight="bold" />
        </button>
      </div>
    </header>
  );
};
