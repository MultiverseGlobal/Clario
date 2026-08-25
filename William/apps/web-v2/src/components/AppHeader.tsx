'use client';

import { MoonStars, Sun, ArrowsOut } from '@phosphor-icons/react';

interface Props {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenFocus: () => void;
}

export function AppHeader({ theme, onToggleTheme, onOpenFocus }: Props) {
  return (
    <header className="app-header">
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }} />
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
          William
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={onOpenFocus}>
          <ArrowsOut size={13} weight="bold" />
          Focus Mode
        </button>
        <button className="btn-icon" onClick={onToggleTheme} title="Toggle theme">
          {theme === 'dark'
            ? <Sun size={15} weight="bold" />
            : <MoonStars size={15} weight="bold" />
          }
        </button>
      </div>
    </header>
  );
}
