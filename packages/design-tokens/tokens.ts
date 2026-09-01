/**
 * packages/design-tokens/tokens.ts
 * PDS-v5 — Pseudonyms Design System Token Source of Truth
 * Light-first. Dark via .dark class.
 */

export const PDS = {
  mode: {
    default: 'light' as const,
    darkClass: 'dark',
  },

  colors: {
    // Light mode (default)
    light: {
      canvas:    '#F8F7F4',
      surface1:  '#FFFFFF',
      surface2:  '#F1F0EC',
      surface3:  '#EBEBE6',
      surface4:  '#E3E2DC',
      borderSubtle: 'rgba(17, 19, 24, 0.06)',
      borderMid:    'rgba(17, 19, 24, 0.12)',
      borderStrong: 'rgba(17, 19, 24, 0.20)',
      textPrimary:   '#111318',
      textSecondary: '#6B7280',
      textMuted:     '#9CA3AF',
      textDisabled:  '#D1D5DB',
      accent:     '#111318',
      accentInv:  '#F8F7F4',
      accentDim:  'rgba(17, 19, 24, 0.06)',
      accentGlow: 'rgba(17, 19, 24, 0.12)',
    },

    // Dark mode (.dark class on <html>)
    dark: {
      canvas:    '#07080c',
      surface1:  'rgba(14, 16, 24, 0.60)',
      surface2:  'rgba(20, 23, 32, 0.75)',
      surface3:  'rgba(27, 31, 44, 0.85)',
      surface4:  'rgba(35, 40, 55, 0.95)',
      borderSubtle: 'rgba(255, 255, 255, 0.055)',
      borderMid:    'rgba(255, 255, 255, 0.10)',
      borderStrong: 'rgba(255, 255, 255, 0.18)',
      textPrimary:   '#eef0f8',
      textSecondary: 'rgba(238, 240, 248, 0.60)',
      textMuted:     'rgba(238, 240, 248, 0.40)',
      textDisabled:  'rgba(238, 240, 248, 0.20)',
      accent:     '#ffffff',
      accentInv:  '#07080c',
      accentDim:  'rgba(255, 255, 255, 0.10)',
      accentGlow: 'rgba(255, 255, 255, 0.15)',
    },

    // Semantic status (same both modes)
    status: {
      success: '#22c55e',
      warning: '#f59e0b',
      danger:  '#ef4444',
      info:    '#38bdf8',
    },
  },

  /**
   * Per-app typography pairings.
   * These are licensed/system fonts — CSS declares @font-face names.
   * Fallbacks included for environments without licensed fonts.
   */
  typography: {
    atlas: {
      display: "'Epic Pro', Impact, 'Arial Black', sans-serif",
      body:    "'Arial', Helvetica, sans-serif",
      mono:    "'JetBrains Mono', 'Courier New', monospace",
      personality: 'War room. Block caps authority. Dense data.',
    },
    clario: {
      display: "'Vanguard', Impact, Oswald, sans-serif",
      body:    "'Athelas', Georgia, 'Times New Roman', serif",
      mono:    "'JetBrains Mono', 'Courier New', monospace",
      personality: "Editor's studio. Cinematic editorial weight.",
    },
    metaphor: {
      display: "'Times New Roman MT', 'Times New Roman', Times, serif",
      body:    "'Inter', -apple-system, system-ui, sans-serif",
      mono:    "'JetBrains Mono', 'Courier New', monospace",
      personality: "Writer's canvas. Canonical literary serif.",
    },
    pseudonymsID: {
      display: "'STIX', 'STIX Two Text', Georgia, 'Times New Roman', serif",
      body:    "'Archivo', 'Helvetica Neue', Arial, sans-serif",
      mono:    "'JetBrains Mono', 'Courier New', monospace",
      personality: 'Identity layer. Institutional gravity.',
    },
    orion: {
      display: "'Tempting', cursive, Georgia, serif",
      body:    "'Switzer', 'Inter', system-ui, sans-serif",
      mono:    "'JetBrains Mono', 'Courier New', monospace",
      personality: 'Voice interface. Fluid italic script energy.',
    },
  },

  tracking: {
    ui:      '-0.015em',
    display: '-0.025em',
    tight:   '-0.035em',
    mono:    '+0.05em',
  },

  motion: {
    easeSpring: 'cubic-bezier(0.175, 0.885, 0.32, 1.05)',
    easeOut:    'cubic-bezier(0.16, 1, 0.3, 1)',
    tFast:  150,
    tBase:  300,
    tSlow:  500,
  },

  shadows: {
    light: {
      sm:    '0 1px 2px rgba(17,19,24,0.04)',
      md:    '0 4px 12px rgba(17,19,24,0.06), 0 1px 3px rgba(17,19,24,0.03)',
      lg:    '0 16px 32px rgba(17,19,24,0.08), 0 4px 8px rgba(17,19,24,0.04)',
      float: '0 24px 48px rgba(17,19,24,0.10), 0 8px 16px rgba(17,19,24,0.05)',
    },
    dark: {
      sm:   '0 1px 2px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.05)',
      md:   '0 4px 12px rgba(0,0,0,0.50), 0 0 0 1px rgba(255,255,255,0.08)',
      lg:   '0 16px 32px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.10)',
      glow: '0 0 24px -4px rgba(255,255,255,0.15)',
    },
  },

  radii: {
    sm:  '6px',
    md:  '8px',
    lg:  '12px',
    xl:  '16px',
    full: '9999px',
  },
} as const;

export type PDSApp = keyof typeof PDS.typography;
