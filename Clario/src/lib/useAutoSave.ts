import { useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'clario-project-state';
const SAVE_DEBOUNCE_MS = 1500;

/**
 * Serializable subset of AppState.
 * Files/blobs cannot be stored — only serializable data like
 * base64 thumbnails, text, numbers, and JSON-friendly objects.
 */
interface SavedProjectState {
  phase: string;
  mode: string;
  scriptText: string;
  savedAt: number;
  // We save only the serializable metadata, not File objects or blob URLs
  selectedAssetsMeta: Array<{
    id: string;
    type: string;
    label: string;
    thumbnail?: string; // base64 data URL
    index?: number;
    extractedText?: string;
    dominantColors?: string[];
  }>;
  slidesData: Array<{
    id: string;
    backgroundColor: string;
    showBackdrop?: boolean;
    elements: any[];
    texts: any[];
    width: number;
    height: number;
  }>;
}

/**
 * Saves project state to localStorage with debouncing.
 * Only serializable data is persisted — File/Blob objects are excluded.
 */
export function useAutoSave(
  phase: string,
  mode: string,
  scriptText: string,
  selectedAssets: any[],
  slides: any[],
) {
  const timerRef = useRef<number | null>(null);

  const save = useCallback(() => {
    if (phase === 'home') {
      // Don't save home state — nothing to persist
      return;
    }

    try {
      const state: SavedProjectState = {
        phase,
        mode,
        scriptText,
        savedAt: Date.now(),
        selectedAssetsMeta: selectedAssets.map(a => ({
          id: a.id,
          type: a.type,
          label: a.label,
          thumbnail: a.thumbnail,
          index: a.index,
          extractedText: a.extractedText,
          dominantColors: a.dominantColors,
        })),
        slidesData: slides.map(s => ({
          id: s.id,
          backgroundColor: s.backgroundColor,
          showBackdrop: s.showBackdrop,
          elements: s.elements,
          texts: s.texts,
          width: s.width,
          height: s.height,
        })),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      // localStorage full or private browsing — silently fail
      console.warn('[Clario] Auto-save failed:', err);
    }
  }, [phase, mode, scriptText, selectedAssets, slides]);

  // Debounced save on state changes
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(save, SAVE_DEBOUNCE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [save]);

  return null;
}

/**
 * Loads saved project state from localStorage.
 * Returns null if nothing is saved or data is corrupted.
 */
export function loadSavedProject(): SavedProjectState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedProjectState;
    // Reject if older than 24 hours
    if (Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clears saved project from localStorage.
 */
export function clearSavedProject() {
  localStorage.removeItem(STORAGE_KEY);
}
