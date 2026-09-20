/**
 * @pseudonyms/ui — Design Tokens
 *
 * Single source of truth for the Pseudonyms Cognitive Design System (PDS-v3).
 * Import from '@pseudonyms/ui/tokens' in any app.
 *
 * Rules (see ecosystem_design.md):
 *  - Canvas: Deep Obsidian — no pure black, no white backgrounds
 *  - Each app has exactly one accent colour — cross-contamination is banned
 *  - No generic saturated blues, no AI-purple (#8b5cf6 verbatim)
 */

// Canvas & Surface
export const COLOR = {
  // Base colors (Quiet Command Center)
  canvasLight:   '#F7F6F2',
  surfaceLight:  '#FFFFFF',
  canvasDark:    '#111318',
  surfaceDark:   '#1A1D24',
  
  // Text
  textPrimaryLight:   '#111318',
  textSecondaryLight: '#6B7280',
  textPrimaryDark:    '#F4F1EA',
  textSecondaryDark:  '#9CA3AF',
  textMuted:          '#6B7280', // Shared fallback

  // Borders
  borderLight:   'rgba(17, 19, 24, 0.1)',
  borderDark:    'rgba(244, 241, 234, 0.1)',
  
  // Accent & Semantic
  primaryAction: '#4F46E5', // Electric Cobalt/Violet
  success:       '#10B981', // Green for confirmed state
  warning:       '#F59E0B', // Amber for attention
  danger:        '#EF4444', // Red for destructive

  // Legacy App Colors (Kept for backwards compatibility but deprioritized)
  orion:     '#00f0ff',
  atlas:     '#10b981',
  clario:    '#ec4899',
  metaphor:  'hsl(260, 70%, 62%)',
  weave:     '#f59e0b',
  id:        '#6366f1',
} as const;

export const FONT = {
  sans:    "'Inter', system-ui, -apple-system, sans-serif",
  mono:    "'IBM Plex Mono', 'JetBrains Mono', monospace",
  display: "'Fraunces', Georgia, serif",
} as const;

export const TRACKING = {
  tight:   '-0.025em',
  normal:  '-0.015em',
  relaxed: '0em',
  wide:    '0.05em',
  widest:  '0.15em',
} as const;

export const SPACE = {
  1:  4,  2:  8,  3:  12, 4:  16,
  5:  20, 6:  24, 8:  32, 10: 40,
  12: 48, 16: 64, 20: 80,
} as const;

export const RADIUS = {
  sm: 6,
  control: 12,
  card: 20,
  full: 9999,
} as const;

export const SPRING = {
  micro:    { damping: 18, stiffness: 200, mass: 1 },
  standard: { damping: 22, stiffness: 160, mass: 1 },
  fluid:    { damping: 12, stiffness: 80,  mass: 1.2 },
} as const;

export const DURATION = {
  instant:  80,
  fast:     150,
  normal:   200,
  slow:     220,
} as const;

export const GLOW = {
  orion:    (opacity = 0.35) => `0 0 40px rgba(0, 240, 255, ${opacity})`,
  atlas:    (opacity = 0.3)  => `0 0 32px rgba(16, 185, 129, ${opacity})`,
  clario:   (opacity = 0.3)  => `0 0 32px rgba(236, 72, 153, ${opacity})`,
  metaphor: (opacity = 0.3)  => `0 0 32px hsla(260, 70%, 62%, ${opacity})`,
  neutral:  (opacity = 0.5)  => `0 8px 32px rgba(0, 0, 0, ${opacity})`,
} as const;

export type AppId = 'orion' | 'atlas' | 'clario' | 'metaphor' | 'weave' | 'id';

export const APPS: Record<AppId, {
  label: string;
  description: string;
  accent: string;
  url: string;
}> = {
  orion:    { label: 'Orion',          description: 'Your AI executioner',          accent: COLOR.orion,    url: 'orion://' },
  atlas:    { label: 'Atlas',          description: 'CRM & Deal intelligence',      accent: COLOR.atlas,    url: 'http://localhost:5173' },
  clario:   { label: 'Clario',         description: 'Media pipeline & transcription', accent: COLOR.clario, url: 'http://localhost:5174' },
  metaphor: { label: 'Metaphor',       description: 'Context OS & neural graph',    accent: COLOR.metaphor, url: 'http://localhost:3000' },
  weave:    { label: 'Weave',          description: 'Content & publishing',          accent: COLOR.weave,    url: 'http://localhost:3001' },
  id:       { label: 'Pseudonyms ID',  description: 'Identity & settings',          accent: COLOR.id,       url: 'http://localhost:3005' },
} as const;
