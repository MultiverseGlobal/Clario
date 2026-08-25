'use client';

import { useEffect } from 'react';
import { ArrowsOut } from '@phosphor-icons/react';
import type { WorldModel } from '@/lib/types';
import { CognitiveOrb } from './CognitiveOrb';

interface Props {
  worldModel: WorldModel | null;
  onLoad: () => void;
  onOpenFocus: () => void;
}

export function WorldView({ worldModel, onLoad, onOpenFocus }: Props) {
  useEffect(() => { onLoad(); }, [onLoad]);

  const nodeCount = worldModel?.nodes.length ?? 0;
  const edgeCount = worldModel?.edges.length ?? 0;

  return (
    <div style={{ height: 'calc(100vh - var(--header-h))', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ padding: '20px 32px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>World Model</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            {nodeCount} nodes · {edgeCount} connections
          </p>
        </div>
        <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={onOpenFocus}>
          <ArrowsOut size={13} weight="bold" />
          Full Focus View
        </button>
      </div>

      {/* Full graph */}
      <div style={{ flex: 1, minHeight: 0, padding: '16px 32px 24px' }}>
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <CognitiveOrb worldModel={worldModel} />

          {!worldModel && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 8,
              pointerEvents: 'none',
            }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading world model…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
