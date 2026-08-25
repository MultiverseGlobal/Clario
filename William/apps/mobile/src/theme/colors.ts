/**
 * Orion — Warm Dark Design System
 * Derived from Pillowtalk's verified color palette (#231B18 hero, #E3FF92 accent)
 * adapted for Orion's executive/reflective identity.
 */
export const Colors = {
  // ── Core Backgrounds ────────────────────────────────────────────────
  /** Hero/page background — Pillowtalk's #231B18 darkened for OLED depth */
  bg:            '#0E0B09',
  /** Warm dark card surface */
  bgCard:        '#1C1612',
  /** Slightly elevated surface */
  bgElevated:    '#241E19',
  /** Modal / sheet surface */
  bgSheet:       '#2A2219',

  // ── Accent ──────────────────────────────────────────────────────────
  /** Primary CTA — Pillowtalk's pale-lime #E3FF92 shifted warmer for Orion */
  accent:        '#D4F57A',
  /** Text/icons on accent background */
  accentText:    '#0B0E04',
  /** Accent at reduced opacity for borders/glows */
  accentMuted:   'rgba(212, 245, 122, 0.2)',

  // ── Typography ──────────────────────────────────────────────────────
  /** High-contrast headings */
  textPrimary:   '#F0EDE8',
  /** Body copy */
  textSecondary: '#A39990',
  /** Timestamps, captions, subtitles */
  textMuted:     '#645C58',
  /** Text on accent pill */
  textInverse:   '#0B0E04',

  // ── Section / Card Backgrounds (Pillowtalk section palette) ─────────
  /** Pillowtalk product-showcase bg — teal */
  sectionTeal:   '#57868E',
  /** Pillowtalk community bg — sage */
  sectionSage:   '#A2B2A6',
  /** Pillowtalk guided-prompts bg — lavender */
  sectionLavender: '#9496E8',
  /** Warm peach card */
  sectionPeach:  '#F2A594',
  /** Acid green card */
  sectionLime:   '#D5EF8A',
  /** Pale green card */
  sectionMint:   '#D5FFC1',
  /** Warm brown card */
  sectionBrown:  '#C2C2A9',
  /** Deep navy card */
  sectionNavy:   '#222D40',
  /** Warm yellow card */
  sectionYellow: '#EFE6B1',

  // ── Borders & Dividers ───────────────────────────────────────────────
  borderSubtle:  'rgba(240, 237, 232, 0.06)',
  borderLight:   'rgba(240, 237, 232, 0.12)',
  borderAccent:  'rgba(212, 245, 122, 0.25)',

  // ── Semantic States ──────────────────────────────────────────────────
  /** Success */
  success:       '#6FCF97',
  /** Error */
  error:         '#EB5757',
  /** Warning */
  warning:       '#F2994A',

  // ── Legacy aliases (keep for components not yet migrated) ───────────
  /** @deprecated use bg */
  porcelain:        '#0E0B09',
  /** @deprecated use bgCard */
  porcelainCard:    '#1C1612',
  /** @deprecated use bgElevated */
  porcelainSubtle:  '#241E19',
  /** @deprecated use bg */
  obsidian:         '#0E0B09',
  /** @deprecated use accent */
  signalAmber:      '#D4F57A',
};
