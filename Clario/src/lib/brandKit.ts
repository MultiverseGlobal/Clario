// ── Brand Kit: persistent brand identity across Clario sessions ───────────────
// Stores brand colors, fonts, and logo in localStorage.
// Used by EditorPhase to auto-apply brand defaults to new slides.

const BRAND_KEY = 'clario-brand-kit';

export interface BrandKit {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontDisplay: string;
  fontBody: string;
  logoUrl?: string; // base64 data URL
  name: string;     // Brand/company name
}

export const DEFAULT_BRAND: BrandKit = {
  primaryColor: '#111318',    // Obsidian Primary (Swiss Black)
  accentColor:  '#4E6CF2',    // Context Blue
  backgroundColor: '#F8F7F4', // Porcelain Canvas
  textColor:    '#111318',    // Obsidian Ink
  fontDisplay:  'Space Grotesk',
  fontBody:     'Inter',
  name: '',
};

export function getBrandKit(): BrandKit {
  try {
    const raw = localStorage.getItem(BRAND_KEY);
    if (!raw) return { ...DEFAULT_BRAND };
    return { ...DEFAULT_BRAND, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_BRAND };
  }
}

export function saveBrandKit(kit: Partial<BrandKit>): BrandKit {
  const current = getBrandKit();
  const updated = { ...current, ...kit };
  localStorage.setItem(BRAND_KEY, JSON.stringify(updated));
  return updated;
}

export function clearBrandKit(): void {
  localStorage.removeItem(BRAND_KEY);
}
