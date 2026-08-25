import { useState, useCallback, useEffect, useRef } from 'react';

export interface UndoRedoOptions {
  maxHistory?: number;
  enableKeyboard?: boolean;
}

export function useUndoRedo<T>(
  initialPresent: T,
  options: UndoRedoOptions = { maxHistory: 40, enableKeyboard: true }
) {
  const { maxHistory = 40, enableKeyboard = true } = options;

  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialPresent);
  const [future, setFuture] = useState<T[]>([]);

  // Keep ref to avoid stale closures in event listeners
  const pastRef = useRef(past);
  const presentRef = useRef(present);
  const futureRef = useRef(future);

  pastRef.current = past;
  presentRef.current = present;
  futureRef.current = future;

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;

    const previous = pastRef.current[pastRef.current.length - 1];
    const newPast = pastRef.current.slice(0, pastRef.current.length - 1);

    setPast(newPast);
    setFuture([presentRef.current, ...futureRef.current]);
    setPresent(previous);
  }, []);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;

    const next = futureRef.current[0];
    const newFuture = futureRef.current.slice(1);

    setPast([...pastRef.current, presentRef.current]);
    setFuture(newFuture);
    setPresent(next);
  }, []);

  const set = useCallback(
    (newPresentOrFn: T | ((prev: T) => T), recordHistory: boolean = true) => {
      const resolved =
        typeof newPresentOrFn === 'function'
          ? (newPresentOrFn as (prev: T) => T)(presentRef.current)
          : newPresentOrFn;

      if (!recordHistory) {
        setPresent(resolved);
        return;
      }

      setPast(prev => {
        const nextPast = [...prev, presentRef.current];
        if (nextPast.length > maxHistory) {
          return nextPast.slice(nextPast.length - maxHistory);
        }
        return nextPast;
      });
      setPresent(resolved);
      setFuture([]);
    },
    [maxHistory]
  );

  const reset = useCallback((newPresent: T) => {
    setPast([]);
    setPresent(newPresent);
    setFuture([]);
  }, []);

  // Global Keyboard listener for Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
  useEffect(() => {
    if (!enableKeyboard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an active input / textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (mod && e.key.toLowerCase() === 'y' && !isMac) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboard, undo, redo]);

  return {
    state: present,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    historyLength: past.length,
  };
}
