/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Map to PDS CSS vars — works in both light and dark via the .dark class
        background: "var(--pds-canvas)",
        foreground: "var(--pds-text-primary)",
        surface: {
          1: "var(--pds-surface-1)",
          2: "var(--pds-surface-2)",
          3: "var(--pds-surface-3)",
          4: "var(--pds-surface-4)",
        },
        border: {
          subtle: "var(--pds-border-subtle)",
          mid:    "var(--pds-border-mid)",
          strong: "var(--pds-border-strong)",
        },
        accent: {
          DEFAULT: "var(--pds-accent)",
          inv:     "var(--pds-accent-inv)",
          dim:     "var(--pds-accent-dim)",
          glow:    "var(--pds-accent-glow)",
        },
        muted: "var(--pds-text-muted)",
        status: {
          success: "var(--pds-success)",
          warning: "var(--pds-warning)",
          danger:  "var(--pds-danger)",
          info:    "var(--pds-info)",
        },
      },
      fontFamily: {
        // Clario: Vanguard display, Athelas body, Inter UI, JetBrains Mono data
        display: ["Vanguard", "Impact", "Oswald", "sans-serif"],
        body:    ["Athelas", "Georgia", "Times New Roman", "serif"],
        sans:    ["Inter", "-apple-system", "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "Courier New", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter:  "-0.03em",
        tight:    "-0.025em",
        ui:       "-0.015em",
        mono:     "0.05em",
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      boxShadow: {
        // No purple/neon glows — ink shadows (light) or white glow (dark via .dark)
        sm:         "var(--pds-shadow-sm)",
        card:       "var(--pds-shadow-sm)",
        "card-hover": "var(--pds-shadow-md)",
        md:         "var(--pds-shadow-md)",
        lg:         "var(--pds-shadow-lg)",
        float:      "var(--pds-shadow-float)",
        glow:       "var(--pds-shadow-glow)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "noise": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
      borderRadius: {
        sm:   "6px",
        md:   "8px",
        lg:   "12px",
        xl:   "16px",
        full: "9999px",
      },
      animation: {
        "fade-in":    "fadeIn 0.25s ease-out",
        "slide-up":   "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "enter":      "slideUpFade 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.05) both",
        "blur-in":    "blurIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn:      { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp:     { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideUpFade: { from: { opacity: "0", transform: "translateY(12px) scale(0.98)", filter: "blur(4px)" }, to: { opacity: "1", transform: "translateY(0) scale(1)", filter: "blur(0)" } },
        blurIn:      { from: { opacity: "0", filter: "blur(8px)" }, to: { opacity: "1", filter: "blur(0)" } },
      },
    },
  },
  plugins: [],
}
