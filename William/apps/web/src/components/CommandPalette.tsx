import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (actionKey: string) => void;
}

interface CommandItem {
  key: string;
  name: string;
  category: string;
  shortcut?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onAction }) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    { key: 'go-home', name: 'Go to Home', category: 'Navigation', shortcut: 'G H' },
    { key: 'go-timeline', name: 'Go to Timeline', category: 'Navigation', shortcut: 'G T' },
    { key: 'go-memory', name: 'Go to Memory', category: 'Navigation', shortcut: 'G M' },
    { key: 'go-settings', name: 'Go to Settings', category: 'Navigation', shortcut: 'G S' },
    { key: 'toggle-theme', name: 'Toggle Dark / Light Theme', category: 'System', shortcut: 'T T' },
    { key: 'complete-task', name: 'Complete Next Focal Mission', category: 'Execution', shortcut: 'Enter' },
    { key: 'reset', name: 'Reset Workspace Setup', category: 'Danger', shortcut: 'R S' }
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.name.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      setSearch('');
    }
  }, [isOpen]);

  // Handle arrow keys and navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onAction(filteredCommands[selectedIndex].key);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh' }}>
          {/* Glass Overlay backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)'
            }}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              width: '100%',
              maxWidth: '500px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-subtle)',
              zIndex: 101,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border-hairline)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px', opacity: 0.6 }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command or search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  width: '100%',
                  fontSize: '0.9375rem',
                  color: 'var(--text-primary)'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px solid var(--border-hairline)', padding: '2px 6px', borderRadius: '4px' }}>
                ESC
              </span>
            </div>

            {/* Commands List feed */}
            <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '8px' }}>
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd, idx) => (
                  <div
                    key={cmd.key}
                    onClick={() => {
                      onAction(cmd.key);
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: selectedIndex === idx ? 'var(--focus-glow)' : 'transparent',
                      transition: 'background 0.1s ease'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: selectedIndex === idx ? 500 : 400, color: 'var(--text-primary)' }}>
                        {cmd.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {cmd.category}
                      </span>
                    </div>

                    {cmd.shortcut && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-canvas)', border: '1px solid var(--border-hairline)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                        {cmd.shortcut}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No commands found.
                </div>
              )}
            </div>

            {/* Console Footer */}
            <div style={{ padding: '10px 18px', background: 'var(--bg-canvas)', borderTop: '1px solid var(--border-hairline)', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Use ↑↓ to navigate, Enter to select</span>
              <span>Cmd+K to close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
