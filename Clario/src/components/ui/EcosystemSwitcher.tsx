import { useState, useRef, useEffect } from 'react';
import { 
  Shield, 
  ExternalLink, 
  Network, 
  Smartphone, 
  TrendingUp, 
  Sparkles, 
  Database
} from 'lucide-react';

export const ECOSYSTEM_APPS = [
  {
    id: 'pseudonyms_id',
    name: 'Pseudonyms ID',
    tagline: 'Master Sovereign Account & Hub',
    url: 'http://localhost:3005',
    accentColor: '#8b5cf6',
    status: 'live',
    icon: Shield
  },
  {
    id: 'clario',
    name: 'Clario',
    tagline: 'Creative Video Studio & Canvas',
    url: 'http://localhost:49843',
    accentColor: '#ec4899',
    status: 'current',
    icon: Sparkles
  },
  {
    id: 'metaphor',
    name: 'Metaphor OS',
    tagline: 'Universal Context Engine',
    url: 'http://localhost:3000',
    accentColor: '#8b5cf6',
    status: 'live',
    icon: Network
  },
  {
    id: 'atlas',
    name: 'Atlas io',
    tagline: 'Demand Generation & CRM',
    url: 'http://localhost:5173',
    accentColor: '#10b981',
    status: 'live',
    icon: TrendingUp
  },
  {
    id: 'orion',
    name: 'Orion',
    tagline: 'Skia Fluid Mobile Companion',
    url: 'exp://localhost:8081',
    accentColor: '#00f0ff',
    status: 'building',
    icon: Smartphone
  }
];

export function EcosystemSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      {/* 9-Dot Google Waffle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '6px 8px',
          borderRadius: 6,
          border: isOpen ? '1px solid var(--accent)' : '1px solid var(--border)',
          background: isOpen ? 'rgba(78, 108, 242, 0.15)' : 'var(--panel)',
          color: isOpen ? 'var(--accent)' : 'var(--text-secondary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
        }}
        title="Pseudonyms Ecosystem Apps"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, width: 12, height: 12, placeItems: 'center' }}>
          <span style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: 'currentColor' }} />
          <span style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: 'currentColor' }} />
          <span style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: 'currentColor' }} />
          <span style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: 'currentColor' }} />
          <span style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: 'currentColor' }} />
          <span style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: 'currentColor' }} />
          <span style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: 'currentColor' }} />
          <span style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: 'currentColor' }} />
          <span style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: 'currentColor' }} />
        </div>
      </button>

      {/* Waffle Popover Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            marginTop: 8,
            width: 320,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 16,
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Pseudonyms Ecosystem
            </span>
            <a
              href="http://localhost:3005"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)' }}
            >
              <span>Master ID</span>
              <ExternalLink size={11} />
            </a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {ECOSYSTEM_APPS.map((app) => {
              const Icon = app.icon;
              const isCurrent = app.status === 'current';

              return (
                <a
                  key={app.id}
                  href={app.url}
                  target={isCurrent ? '_self' : '_blank'}
                  rel="noreferrer"
                  onClick={() => setIsOpen(false)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    padding: 10,
                    borderRadius: 10,
                    textDecoration: 'none',
                    background: isCurrent ? 'rgba(78, 108, 242, 0.1)' : 'var(--surface-2)',
                    border: isCurrent ? '1px solid var(--accent)' : '1px solid transparent',
                    color: 'var(--text-primary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 6,
                      background: `${app.accentColor}20`,
                      color: app.accentColor,
                      border: `1px solid ${app.accentColor}40`,
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2 }}>
                    {app.name}
                  </span>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {isCurrent ? 'Active' : app.status}
                  </span>
                </a>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, textAlign: 'center' }}>
            <a
              href="http://localhost:3005/vault"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 11, color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)' }}
            >
              <Database size={12} color="var(--accent)" />
              <span>Universal Shared Context Vault</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
