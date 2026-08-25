'use client';

import { Sun, MoonStars } from '@phosphor-icons/react';
import type { Portrait } from '@/lib/types';

interface Props {
  portrait: Portrait | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export function SettingsView({ portrait, theme, onToggleTheme }: Props) {
  return (
    <div className="page-content">
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Configuration for William.</p>

      <div className="card" style={{ marginBottom: 14 }}>
        <p className="label" style={{ marginBottom: 14 }}>Appearance</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Theme</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Currently: {theme} mode</p>
          </div>
          <button className="btn btn-secondary" onClick={onToggleTheme} style={{ gap: 8 }}>
            {theme === 'dark' ? <Sun size={15} weight="bold" /> : <MoonStars size={15} weight="bold" />}
            Switch to {theme === 'dark' ? 'light' : 'dark'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <p className="label" style={{ marginBottom: 14 }}>Identity</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Name', value: portrait?.name },
            { label: 'Identity', value: portrait?.identity },
          ].map(f => (
            <div key={f.label}>
              <p className="label" style={{ marginBottom: 6 }}>{f.label}</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{f.value ?? '—'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <p className="label" style={{ marginBottom: 14 }}>Backend</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>API Server</p>
            <code style={{ fontSize: 12, background: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: 6, color: 'var(--text-muted)' }}>
              {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005'}
            </code>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Database</p>
            <code style={{ fontSize: 12, background: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: 6, color: 'var(--text-muted)' }}>
              william.db
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
