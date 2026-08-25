'use client';

import { motion } from 'framer-motion';
import { X, PaperPlaneTilt, ArrowsClockwise } from '@phosphor-icons/react';
import type { Portrait, WorldModel, ChatMessage, MemoryNode } from '@/lib/types';
import { CognitiveOrb } from './CognitiveOrb';
import { useState } from 'react';

interface Props {
  portrait: Portrait | null;
  worldModel: WorldModel | null;
  messages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  onSend: () => void;
  isSending: boolean;
  onClose: () => void;
  onRefreshWorld: () => void;
}

export function FocusMode({
  portrait,
  worldModel,
  messages,
  chatInput,
  setChatInput,
  onSend,
  isSending,
  onClose,
  onRefreshWorld,
}: Props) {
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  const lastWilliamMsg = messages.filter(m => m.sender === 'william').at(-1)?.text ?? '';

  return (
    <motion.div
      className="focus-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="focus-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(244,244,245,0.7)', letterSpacing: '0.04em' }}>
            Focus Mode
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12 }}
            onClick={onRefreshWorld}
            title="Refresh world model"
          >
            <ArrowsClockwise size={15} />
          </button>
          <button
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 12px', color: 'rgba(244,244,245,0.8)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={onClose}
          >
            <X size={12} weight="bold" />
            Exit
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="focus-body">
        {/* Context panel */}
        <div className="focus-context">
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(161,161,170,0.85)', marginBottom: 6 }}>
              You
            </p>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'rgba(244,244,245,0.9)' }}>
              {portrait?.name ?? '—'}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(161,161,170,0.7)', marginTop: 4, lineHeight: 1.5 }}>
              {portrait?.identity ?? ''}
            </p>
          </div>

          {portrait?.dreams && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(161,161,170,0.85)', marginBottom: 6 }}>
                Building toward
              </p>
              <p style={{ fontSize: 12, color: 'rgba(161,161,170,0.8)', lineHeight: 1.6 }}>
                {portrait.dreams}
              </p>
            </div>
          )}

          {selectedNode && (
            <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6366f1', marginBottom: 6 }}>
                Selected Node
              </p>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(244,244,245,0.9)' }}>{selectedNode.label}</p>
              <p style={{ fontSize: 11, color: 'rgba(161,161,170,0.7)', marginTop: 4 }}>{selectedNode.type} · {Math.round(selectedNode.confidence * 100)}% confidence</p>
              {selectedNode.description && (
                <p style={{ fontSize: 12, color: 'rgba(161,161,170,0.8)', marginTop: 8, lineHeight: 1.5 }}>{selectedNode.description}</p>
              )}
            </div>
          )}

          {lastWilliamMsg && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(161,161,170,0.85)', marginBottom: 6 }}>
                William just said
              </p>
              <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'rgba(244,244,245,0.75)', lineHeight: 1.6 }}>
                {lastWilliamMsg}
              </p>
            </div>
          )}

          <div>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(161,161,170,0.85)', marginBottom: 6 }}>
              Memory Nodes
            </p>
            <p style={{ fontSize: 22, fontWeight: 600, color: 'rgba(244,244,245,0.9)' }}>
              {worldModel?.nodes.length ?? '—'}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(161,161,170,0.5)' }}>active concepts</p>
          </div>
        </div>

        {/* Cognitive map */}
        <div className="focus-map">
          <CognitiveOrb
            worldModel={worldModel}
            onNodeClick={setSelectedNode}
          />
        </div>
      </div>

      {/* Footer input */}
      <div className="focus-footer">
        <div style={{
          width: '100%',
          maxWidth: 720,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 28,
          padding: '6px 6px 6px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <input
            autoFocus
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell William something…"
            disabled={isSending}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'rgba(244,244,245,0.9)',
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              padding: '8px 0',
            }}
          />
          <button
            onClick={onSend}
            disabled={isSending || !chatInput.trim()}
            style={{
              width: 36, height: 36,
              borderRadius: '50%',
              background: '#6366f1',
              border: 'none',
              color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isSending || !chatInput.trim() ? 'not-allowed' : 'pointer',
              opacity: isSending || !chatInput.trim() ? 0.4 : 1,
              flexShrink: 0,
            }}
          >
            <PaperPlaneTilt size={15} weight="fill" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
