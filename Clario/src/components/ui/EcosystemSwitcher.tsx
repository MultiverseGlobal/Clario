import { useState, useRef, useEffect } from 'react';
import { ExternalLink, Database } from 'lucide-react';

// ── Authentic Pseudonyms Brand Marks (mirrors Atlas EcosystemIcons.tsx) ──────

type IconProps = { size?: number; color?: string };

const PseudonymsSovereignMark = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3.5 2.5" opacity="0.75" />
    <path d="M12 5.5L18.5 12L12 18.5L5.5 12L12 5.5Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="2" fill={color} />
  </svg>
);

const PseudonymsIDIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
    <path d="M12 6L18 12L12 18L6 12L12 6Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="2" fill={color} />
  </svg>
);

const AtlasIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size * 1.25} viewBox="0 0 24 32" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
    <circle cx="12" cy="12" r="3" fill={color} />
    <line x1="12" y1="22" x2="12" y2="30" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeDasharray="1.5 3" />
  </svg>
);

const MetaphorIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
    <circle cx="12" cy="12" r="5.5" stroke={color} strokeWidth="1.5" />
    <circle cx="12" cy="12" r="2" fill={color} />
  </svg>
);

const ClarioIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
    <rect x="4.5" y="6.5" width="2" height="2" rx="0.5" fill={color} opacity="0.8" />
    <rect x="4.5" y="11" width="2" height="2" rx="0.5" fill={color} opacity="0.8" />
    <rect x="4.5" y="15.5" width="2" height="2" rx="0.5" fill={color} opacity="0.8" />
    <rect x="17.5" y="6.5" width="2" height="2" rx="0.5" fill={color} opacity="0.8" />
    <rect x="17.5" y="11" width="2" height="2" rx="0.5" fill={color} opacity="0.8" />
    <rect x="17.5" y="15.5" width="2" height="2" rx="0.5" fill={color} opacity="0.8" />
    <path d="M10 9.5L15.5 12L10 14.5V9.5Z" fill={color} />
  </svg>
);

const OrionIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 46" fill="none" aria-hidden="true">
    <path
      fill={color}
      d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"
    />
  </svg>
);

const WeaveIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="5" cy="5" r="1.5" fill={color} />
    <circle cx="12" cy="5" r="1.5" fill={color} />
    <circle cx="19" cy="5" r="1.5" fill={color} />
    <circle cx="5" cy="12" r="1.5" fill={color} />
    <circle cx="12" cy="12" r="1.5" fill={color} />
    <circle cx="19" cy="12" r="1.5" fill={color} />
    <circle cx="5" cy="19" r="1.5" fill={color} />
    <circle cx="12" cy="19" r="1.5" fill={color} />
    <circle cx="19" cy="19" r="1.5" fill={color} />
    <line x1="5" y1="5" x2="12" y2="12" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4" />
    <line x1="12" y1="5" x2="19" y2="12" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4" />
    <line x1="5" y1="12" x2="12" y2="19" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4" />
    <line x1="12" y1="12" x2="19" y2="19" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4" />
    <line x1="5" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.3" />
    <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.3" />
    <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.3" />
  </svg>
);

// ── App registry ──────────────────────────────────────────────────────────────

export const ECOSYSTEM_APPS = [
  {
    id: 'pseudonyms_id',
    name: 'Pseudonyms ID',
    tagline: 'Master Sovereign Account & Hub',
    url: 'http://localhost:3005',
    status: 'live' as const,
    Icon: PseudonymsIDIcon,
  },
  {
    id: 'clario',
    name: 'Clario',
    tagline: 'Creative Video Studio & Canvas',
    url: 'http://localhost:49843',
    status: 'current' as const,
    Icon: ClarioIcon,
  },
  {
    id: 'atlas',
    name: 'Atlas io',
    tagline: 'Demand Generation & CRM',
    url: 'http://localhost:5173',
    status: 'live' as const,
    Icon: AtlasIcon,
  },
  {
    id: 'metaphor',
    name: 'Metaphor OS',
    tagline: 'Universal Context Engine',
    url: 'http://localhost:3000',
    status: 'live' as const,
    Icon: MetaphorIcon,
  },
  {
    id: 'orion',
    name: 'Orion',
    tagline: 'Skia Fluid Mobile Companion',
    url: 'exp://localhost:8081',
    status: 'building' as const,
    Icon: OrionIcon,
  },
  {
    id: 'weave',
    name: 'Weave',
    tagline: 'Context Graph & Knowledge Weave',
    url: 'http://localhost:3000/weave',
    status: 'live' as const,
    Icon: WeaveIcon,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        setIsOpen(o => !o);
      }
      if (e.key === 'Escape') setIsOpen(false);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      {/* Sovereign trigger — Pseudonyms diamond mark */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Switch Sovereign App (⌘.)"
        aria-expanded={isOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 10px',
          borderRadius: 7,
          border: isOpen
            ? '1px solid var(--pds-text-secondary)'
            : '1px solid var(--pds-border-subtle)',
          background: isOpen ? 'var(--pds-surface-2)' : 'transparent',
          color: isOpen ? 'var(--pds-text-primary)' : 'var(--pds-text-secondary)',
          cursor: 'pointer',
          transition: 'all 150ms ease',
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.04em',
          fontWeight: 600,
        }}
        title="Pseudonyms Sovereign Network (⌘.)"
      >
        <PseudonymsSovereignMark size={14} color="currentColor" />
        <span>Hub</span>
        <span style={{ opacity: 0.4, fontSize: 9 }}>⌘.</span>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            background: 'rgba(0,0,0,0.25)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Popover panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            marginTop: 8,
            width: 340,
            background: 'var(--pds-panel, #ffffff)',
            border: '1px solid var(--pds-border-mid)',
            borderRadius: 16,
            padding: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            animation: 'clario-popover-in 120ms ease',
          }}
        >
          <style>{`
            @keyframes clario-popover-in {
              from { opacity: 0; transform: translateY(-4px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0)    scale(1); }
            }
          `}</style>

          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--pds-border-subtle)',
            paddingBottom: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <PseudonymsSovereignMark size={13} color="var(--pds-text-primary)" />
              <span style={{
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--pds-text-muted)',
                fontWeight: 700,
              }}>
                Sovereign Network
              </span>
            </div>
            <a
              href="http://localhost:3005"
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: 11,
                color: 'var(--pds-text-secondary)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <span>Master ID</span>
              <ExternalLink size={10} />
            </a>
          </div>

          {/* App grid — 3 columns, brand marks */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {ECOSYSTEM_APPS.map((app) => {
              const { Icon } = app;
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
                    padding: '10px 8px',
                    borderRadius: 12,
                    textDecoration: 'none',
                    background: isCurrent ? 'var(--pds-surface-2)' : 'var(--pds-surface-1, #f5f4f1)',
                    border: isCurrent
                      ? '1px solid var(--pds-border-mid)'
                      : '1px solid transparent',
                    color: 'var(--pds-text-primary)',
                    transition: 'all 140ms ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    if (!isCurrent) {
                      e.currentTarget.style.background = 'var(--pds-surface-2)';
                      e.currentTarget.style.border = '1px solid var(--pds-border-subtle)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isCurrent) {
                      e.currentTarget.style.background = 'var(--pds-surface-1, #f5f4f1)';
                      e.currentTarget.style.border = '1px solid transparent';
                    }
                  }}
                >
                  {/* Icon container */}
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 6,
                    background: isCurrent ? 'var(--pds-accent-dim)' : 'var(--pds-surface-2)',
                    border: '1px solid var(--pds-border-subtle)',
                    color: 'var(--pds-text-primary)',
                    transition: 'transform 140ms ease',
                  }}>
                    <Icon size={17} color="currentColor" />
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.2,
                    color: 'var(--pds-text-primary)',
                  }}>
                    {app.name}
                  </span>
                  <span style={{
                    fontSize: 9,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: isCurrent ? 'var(--pds-success, #10b981)' : 'var(--pds-text-muted)',
                    marginTop: 3,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: isCurrent ? 700 : 400,
                  }}>
                    {isCurrent ? 'Active' : app.status}
                  </span>
                </a>
              );
            })}
          </div>

          {/* Footer vault link */}
          <div style={{
            borderTop: '1px solid var(--pds-border-subtle)',
            paddingTop: 10,
            textAlign: 'center',
          }}>
            <a
              href="http://localhost:3005/vault"
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                color: 'var(--pds-text-muted)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Database size={11} />
              <span>Universal Shared Context Vault</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
