'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PaperPlaneTilt, Plus, Microphone } from '@phosphor-icons/react';
import type { Portrait, ChatMessage } from '@/lib/types';
import { GenerativeCard } from './GenerativeCards';
import { DynamicQuickActions } from './DynamicQuickActions';

interface Props {
  portrait: Portrait | null;
  lastReply: string;
  messages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  onSend: (text?: string) => void;
  isSending: boolean;
  onOpenFocus: () => void;
  onOpenVoice: () => void;
}

export function CompanionView({
  portrait,
  lastReply,
  messages,
  chatInput,
  setChatInput,
  onSend,
  isSending,
  onOpenFocus,
  onOpenVoice,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, lastReply]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  const williamMessages = messages.filter(m => m.sender === 'william');
  const displayReply = lastReply || (williamMessages.at(-1)?.text ?? '');

  const parseMessageData = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (parsed.type && parsed.data) return parsed;
      return null;
    } catch {
      return null;
    }
  };

  return (
    <div style={{ height: 'calc(100vh - var(--header-h))', display: 'flex', flexDirection: 'column', position: 'relative', background: '#000000' }}>
      {/* Immersive empty canvas — click to open focus mode */}
      <div
        onClick={onOpenFocus}
        style={{
          position: 'absolute',
          inset: 0,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
        title="Enter Focus Mode"
      >
        {displayReply && messages.length === 0 && (
          <motion.div
            key={displayReply}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              position: 'relative',
              maxWidth: 480,
              padding: '0 32px',
              textAlign: 'center',
            }}
          >
            <p style={{
              fontFamily: 'var(--font-sans), system-ui, -apple-system, sans-serif',
              fontSize: 22,
              lineHeight: 1.5,
              color: '#ffffff',
              fontWeight: 400,
              letterSpacing: '-0.02em'
            }}>
              {displayReply}
            </p>
          </motion.div>
        )}
      </div>

      {/* Chat Stream Overlay */}
      <div 
        ref={scrollRef}
        style={{
          position: 'absolute',
          inset: '0 0 100px 0',
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          zIndex: 3,
          pointerEvents: 'none'
        }}
      >
        <div style={{ flex: 1 }} />
        {messages.slice(-6).map(m => {
          const payload = parseMessageData(m.text);
          const isWilliam = m.sender === 'william';
          
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                alignSelf: isWilliam ? 'flex-start' : 'flex-end',
                maxWidth: '85%',
                pointerEvents: 'auto'
              }}
            >
              {payload ? (
                <GenerativeCard payload={payload} />
              ) : (
                <div style={{
                  background: isWilliam ? 'transparent' : '#1c1c1e',
                  padding: isWilliam ? '8px 0' : '14px 20px',
                  borderRadius: isWilliam ? '0' : '24px',
                  color: isWilliam ? '#ffffff' : '#ffffff',
                  fontSize: isWilliam ? '1.125rem' : '1rem',
                  lineHeight: 1.5,
                  fontFamily: 'var(--font-sans), system-ui, -apple-system, sans-serif',
                  fontWeight: isWilliam ? 400 : 500,
                  letterSpacing: '-0.01em',
                  maxWidth: isWilliam ? '100%' : '100%',
                }}>
                  {m.text}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div style={{ position: 'absolute', bottom: '90px', width: '100%', zIndex: 10, pointerEvents: 'auto' }}>
        <DynamicQuickActions 
          hasMessages={messages.length > 0} 
          lastTopic="current focus"
          onSelectAction={(p) => { setChatInput(p); setTimeout(() => onSend(p), 50); }}
        />
      </div>

      {/* Floating input bar */}
      <div className="floating-bar-wrapper" style={{ zIndex: 10, display: 'flex', justifyContent: 'center', padding: '0 16px 24px' }}>
        <div 
          onClick={e => e.stopPropagation()}
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#1c1c1e',
            borderRadius: '9999px',
            padding: '8px 16px',
            width: '100%',
            maxWidth: '600px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}
        >
          <button 
            onClick={onOpenFocus}
            style={{ background: 'transparent', border: 'none', color: '#666666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}
            title="Enter Focus Mode"
            type="button"
          >
            <Plus size={20} weight="bold" />
          </button>
          <input
            ref={inputRef}
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message William..."
            disabled={isSending}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '1rem',
              padding: '0 12px',
              fontFamily: 'var(--font-sans), system-ui, sans-serif'
            }}
          />
          <button
            onClick={onOpenVoice}
            style={{ background: 'transparent', border: 'none', color: '#aaaaaa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}
            title="Use Voice"
            type="button"
          >
            <Microphone size={20} weight="fill" />
          </button>
          <button
            onClick={() => onSend()}
            disabled={isSending || !chatInput.trim()}
            style={{
              background: chatInput.trim() ? '#ffffff' : '#333333',
              color: chatInput.trim() ? '#000000' : '#666666',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: chatInput.trim() ? 'pointer' : 'default',
              marginLeft: '8px',
              transition: 'background 0.2s'
            }}
            aria-label="Send"
          >
            <PaperPlaneTilt size={16} weight="fill" />
          </button>
        </div>
      </div>
    </div>
  );
}
