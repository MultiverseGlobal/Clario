"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type AppNode = {
  id: string;
  name: string;
  slug: string;
  url: string;
  color: string;
};

const APPS: AppNode[] = [
  { id: "orion", name: "Orion", slug: "orion", url: "http://localhost:5174", color: "var(--pds-accent-blue, #3b82f6)" },
  { id: "atlas", name: "Atlas", slug: "atlas", url: "http://localhost:5173", color: "var(--pds-accent-purple, #8b5cf6)" },
  { id: "clario", name: "Clario", slug: "clario", url: "http://localhost:5175", color: "var(--pds-accent-emerald, #10b981)" },
];

export function PseudonymWheel({ identityName }: { identityName: string }) {
  const [hoveredApp, setHoveredApp] = useState<string | null>(null);

  return (
    <div className="relative w-full max-w-2xl mx-auto h-[400px] flex items-center justify-center my-12">
      {/* Central Identity Node */}
      <div className="absolute z-20 flex flex-col items-center justify-center pointer-events-none">
        <div className="w-24 h-24 rounded-full bg-[var(--pds-bg-elevated)] border border-[var(--pds-border-default)] shadow-2xl flex items-center justify-center relative overflow-hidden transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/5" />
          <span className="text-xl font-medium tracking-tight text-[var(--pds-text-primary)]">
            {identityName.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="mt-4 text-sm font-medium tracking-wide text-[var(--pds-text-secondary)]">
          PSEUDONYMS
        </span>
      </div>

      {/* Orbit / Wheel */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        {APPS.map((app, index) => {
          // Calculate positions for a semi-circle/triangle layout
          const angle = (index * 120 + 270) * (Math.PI / 180);
          const radius = 140; // distance from center
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          const isHovered = hoveredApp === app.id;
          const isFaded = hoveredApp !== null && hoveredApp !== app.id;

          return (
            <div
              key={app.id}
              className="absolute"
              style={{
                transform: `translate(${x}px, ${y}px)`,
                transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                opacity: isFaded ? 0.3 : 1,
                zIndex: isHovered ? 30 : 10,
              }}
            >
              <Link
                href={app.url}
                onMouseEnter={() => setHoveredApp(app.id)}
                onMouseLeave={() => setHoveredApp(null)}
                className="group relative flex flex-col items-center justify-center w-20 h-20 rounded-full bg-[var(--pds-bg-base)] border border-[var(--pds-border-default)] shadow-sm hover:shadow-xl hover:border-transparent transition-all duration-300"
              >
                {/* Glow Effect */}
                <div 
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"
                  style={{ backgroundColor: app.color }}
                />
                
                <span className="text-sm font-medium tracking-tight text-[var(--pds-text-primary)]">
                  {app.name}
                </span>
                
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[var(--pds-bg-elevated)] border border-[var(--pds-border-default)] flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300">
                  <ArrowUpRight size={12} className="text-[var(--pds-text-secondary)]" />
                </div>
              </Link>
            </div>
          );
        })}
      </div>
      
      {/* Background Orbit Ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[280px] h-[280px] rounded-full border border-[var(--pds-border-default)] opacity-20 border-dashed" />
      </div>
    </div>
  );
}
