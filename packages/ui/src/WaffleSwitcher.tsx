import { useState, useEffect, useRef } from 'react';
import { Grip, Map, Video, BookOpen, Fingerprint, Mic } from 'lucide-react';

const APPS = [
  { id: 'atlas', name: 'Atlas', icon: Map, color: '#eef0f8', url: 'http://localhost:3001' },
  { id: 'clario', name: 'Clario', icon: Video, color: '#eef0f8', url: 'http://localhost:3002' },
  { id: 'metaphor', name: 'Metaphor', icon: BookOpen, color: '#eef0f8', url: 'http://localhost:3003' },
  { id: 'pseudonyms-id', name: 'Pseudonyms ID', icon: Fingerprint, color: '#eef0f8', url: 'http://localhost:3000' },
  { id: 'orion', name: 'Orion', icon: Mic, color: '#eef0f8', url: '#' },
];

export function WaffleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey && e.key === '.') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} style={{ position: 'relative', zIndex: 9999 }}>
      {/* Trigger */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: isOpen ? 'var(--pds-surface-3, rgba(27, 31, 44, 0.85))' : 'transparent',
          border: 'none',
          padding: '8px',
          borderRadius: '8px',
          cursor: 'pointer',
          color: isOpen ? 'var(--pds-text-primary, #fff)' : 'var(--pds-text-secondary, #8892a4)',
          transition: 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        aria-label="Switch App (Cmd+.)"
        title="Switch App (Cmd+.)"
      >
        <Grip size={20} strokeWidth={2.5} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div 
          className="pds-animate-enter pds-glass-elevated"
          style={{
            position: 'absolute',
            top: 'calc(100% + 12px)',
            right: 0,
            width: '320px',
            padding: '16px',
            borderRadius: '20px',
            background: 'var(--pds-surface-4, rgba(35, 40, 55, 0.95))',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: '1px solid var(--pds-border-mid, rgba(255,255,255,0.1))',
            boxShadow: 'var(--pds-shadow-float, 0 24px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1))',
            transformOrigin: 'top right'
          }}
        >
          <div style={{ marginBottom: '16px', padding: '0 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--pds-text-secondary, #8892a4)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              Ecosystem
            </span>
            <kbd style={{ fontSize: '10px', fontFamily: 'var(--pds-font-mono)', background: 'var(--pds-surface-1)', padding: '2px 6px', borderRadius: '4px', color: 'var(--pds-text-muted)' }}>⌘.</kbd>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {APPS.map((app) => (
              <a 
                key={app.id} 
                href={app.url}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '16px 8px',
                  borderRadius: '16px',
                  textDecoration: 'none',
                  color: 'var(--pds-text-primary, #fff)',
                  transition: 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)',
                  border: '1px solid transparent',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--pds-surface-2, rgba(20, 23, 32, 0.75))';
                  e.currentTarget.style.border = '1px solid var(--pds-border-subtle, rgba(255,255,255,0.05))';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.border = '1px solid transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '12px', 
                  background: 'var(--pds-surface-1, rgba(14, 16, 24, 0.6))',
                  border: '1px solid var(--pds-border-mid, rgba(255,255,255,0.1))',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: app.color,
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)'
                }}>
                  <app.icon size={20} strokeWidth={2} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '-0.01em' }}>{app.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
