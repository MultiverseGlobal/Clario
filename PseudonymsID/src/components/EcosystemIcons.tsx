// Real inline SVG icons for each ecosystem app — sourced directly from their public/ assets

type IconProps = { size?: number; color?: string };

/** Pseudonyms ID — Sovereign Geometric Core (intersecting rings / fingerprint node) */
export function PseudonymsIDIcon({ size = 20, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Outer sovereign ring */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
      {/* Core diamond */}
      <path d="M12 6L18 12L12 18L6 12L12 6Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Inner secure dot */}
      <circle cx="12" cy="12" r="2" fill={color} />
    </svg>
  );
}

/** Atlas — hollow circle + amber center dot + dotted stem (from Atlas io/public/favicon.svg) */
export function AtlasIcon({ size = 20, color = "#C4841F" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 32" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" fill="none" />
      <circle cx="12" cy="12" r="3" fill={color} />
      <line
        x1="12" y1="22" x2="12" y2="30"
        stroke={color} strokeWidth="1.75"
        strokeLinecap="round" strokeDasharray="1.5 3"
      />
    </svg>
  );
}

/** Metaphor — concentric target (dark circle / Metaphor logo mark: circle + inner fill) */
export function MetaphorIcon({ size = 20, color = "#4E6CF2" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="5.5" stroke={color} strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="2" fill={color} />
    </svg>
  );
}

/** Orion — lightning bolt (from William/apps/web/public/favicon.svg, simplified) */
export function OrionIcon({ size = 20, color = "#863bff" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 46" fill="none" aria-hidden="true">
      <path
        fill={color}
        d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"
      />
    </svg>
  );
}

/** Clario — stylised sparkle / film-frame hybrid */
export function ClarioIcon({ size = 20, color = "#ec4899" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Film frame outer */}
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Sprocket holes */}
      <rect x="4" y="6" width="2" height="2" rx="0.5" fill={color} />
      <rect x="4" y="11" width="2" height="2" rx="0.5" fill={color} />
      <rect x="4" y="16" width="2" height="2" rx="0.5" fill={color} />
      <rect x="18" y="6" width="2" height="2" rx="0.5" fill={color} />
      <rect x="18" y="11" width="2" height="2" rx="0.5" fill={color} />
      <rect x="18" y="16" width="2" height="2" rx="0.5" fill={color} />
      {/* Play triangle */}
      <path d="M10 9.5l5 2.5-5 2.5V9.5z" fill={color} />
    </svg>
  );
}

/** Weave — interlocking grid mesh */
export function WeaveIcon({ size = 20, color = "#f59e0b" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Nodes */}
      <circle cx="5"  cy="5"  r="1.5" fill={color} />
      <circle cx="12" cy="5"  r="1.5" fill={color} />
      <circle cx="19" cy="5"  r="1.5" fill={color} />
      <circle cx="5"  cy="12" r="1.5" fill={color} />
      <circle cx="12" cy="12" r="1.5" fill={color} />
      <circle cx="19" cy="12" r="1.5" fill={color} />
      <circle cx="5"  cy="19" r="1.5" fill={color} />
      <circle cx="12" cy="19" r="1.5" fill={color} />
      <circle cx="19" cy="19" r="1.5" fill={color} />
      {/* Edges */}
      <line x1="5"  y1="5"  x2="12" y2="12" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4" />
      <line x1="12" y1="5"  x2="19" y2="12" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4" />
      <line x1="5"  y1="12" x2="12" y2="19" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4" />
      <line x1="12" y1="12" x2="19" y2="19" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4" />
      <line x1="5"  y1="5"  x2="5"  y2="19" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.3" />
      <line x1="12" y1="5"  x2="12" y2="19" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.3" />
      <line x1="19" y1="5"  x2="19" y2="19" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.3" />
    </svg>
  );
}

export function getEcosystemIcon(iconName: string, size = 18, color = "#8A8F9E") {
  switch (iconName) {
    case "Pseudonyms": return <PseudonymsIDIcon size={size} color={color} />;
    case "Pseudonyms ID": return <PseudonymsIDIcon size={size} color={color} />;
    case "Atlas":    return <AtlasIcon size={size} color={color} />;
    case "Metaphor": return <MetaphorIcon size={size} color={color} />;
    case "Orion":    return <OrionIcon size={size} color={color} />;
    case "Clario":   return <ClarioIcon size={size} color={color} />;
    case "Weave":    return <WeaveIcon size={size} color={color} />;
    default:         return <MetaphorIcon size={size} color={color} />;
  }
}
