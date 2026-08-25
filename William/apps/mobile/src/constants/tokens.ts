import { Colors } from '../theme/colors';
// Orion Design System Tokens — Natural Light & Command Amber Themes

export const TOKENS = {
  colors: {
    // Natural Light Theme (Glebich Voice AI Design)
    background: Colors.porcelainSubtle,     // Soft crisp white mist
    surface: Colors.porcelainCard,        // Pure white card surfaces
    elevated: Colors.porcelainSubtle,       // Subtle grey container
    border: Colors.borderMedium,         // Soft border stroke
    textPrimary: Colors.textPrimary,    // High-contrast slate black
    textMuted: Colors.textSecondary,      // Muted slate text
    textFaint: Colors.textMuted,      // Faint placeholder text
    accent: '#2563EB',         // Vibrant natural blue
    accentGlow: 'rgba(37, 99, 235, 0.25)',
    accentGlowSoft: 'rgba(37, 99, 235, 0.08)',
    waveDark: '#2C2D30',       // Dark liquid wave path
    waveMid: '#5C5E64',        // Mid liquid wave path
    waveLight: '#9CA0A8',      // Light liquid wave ribbon
    particle: 'rgba(50, 50, 60, 0.45)', // Floating particle dust
  },
  fonts: {
    display: 'System',
    ui: 'System',
    data: 'System',
  },
  animation: {
    easingExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
    entranceDuration: 500,
    microDuration: 150,
  },
} as const;

