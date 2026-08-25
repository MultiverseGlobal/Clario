interface ClarioLogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}

export function ClarioLogo({ size = 24, className = '', showWordmark = false }: ClarioLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Sovereign Refractive Aperture Mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="clario-primary-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4E6CF2" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>
          <linearGradient id="clario-subtle-grad" x1="28" y1="4" x2="4" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C084FC" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#4E6CF2" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Outer Sovereign Hex / Lens Ring */}
        <rect
          x="3"
          y="3"
          width="26"
          height="26"
          rx="7"
          stroke="url(#clario-primary-grad)"
          strokeWidth="2"
          strokeOpacity="0.85"
        />

        {/* Intersecting Precision Deconstruction Blades / Facets */}
        <path
          d="M3 13L13 3M19 29L29 19"
          stroke="url(#clario-primary-grad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Central Kinetic Focal Core */}
        <rect
          x="11"
          y="11"
          width="10"
          height="10"
          rx="3"
          fill="url(#clario-primary-grad)"
          style={{ filter: 'drop-shadow(0 0 6px rgba(78, 108, 242, 0.6))' }}
        />

        <circle cx="16" cy="16" r="2" fill="#FFFFFF" />
      </svg>

      {showWordmark && (
        <div className="flex flex-col text-left">
          <span className="font-display font-bold text-sm tracking-tight text-foreground leading-tight">
            Clario
          </span>
          <span className="text-[9px] font-mono font-medium text-muted tracking-wider uppercase">
            Sovereign Media
          </span>
        </div>
      )}
    </div>
  );
}
