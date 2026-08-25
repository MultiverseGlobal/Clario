'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Sun, Moon, Coffee, Brain, Compass, BookOpen, Heart } from 'lucide-react';

interface QuickAction {
  label: string;
  prompt: string;
  icon: React.ReactNode;
}

interface DynamicQuickActionsProps {
  onSelectAction: (prompt: string) => void;
  hasMessages?: boolean;
  lastTopic?: string;
}

export const DynamicQuickActions: React.FC<DynamicQuickActionsProps> = ({
  onSelectAction,
  hasMessages = false,
  lastTopic
}) => {
  const actions = useMemo(() => {
    const hour = new Date().getHours();

    const morningActions: QuickAction[] = [
      { label: 'Morning clarity', prompt: 'Help me set my intentions for today', icon: <Sun size={14} /> },
      { label: 'Dream journal', prompt: 'I had a dream last night I want to explore', icon: <Sparkles size={14} /> },
      { label: 'Focus ritual', prompt: 'Guide me through a morning focus ritual', icon: <Brain size={14} /> },
    ];

    const afternoonActions: QuickAction[] = [
      { label: 'Energy check', prompt: 'How can I optimize my energy this afternoon?', icon: <Coffee size={14} /> },
      { label: 'Navigate challenge', prompt: 'I need to work through a challenge I\'m facing', icon: <Compass size={14} /> },
      { label: 'Creative burst', prompt: 'Help me brainstorm something creative', icon: <Sparkles size={14} /> },
    ];

    const eveningActions: QuickAction[] = [
      { label: 'Day reflection', prompt: 'Help me reflect on what happened today', icon: <Moon size={14} /> },
      { label: 'Gratitude', prompt: 'Let\'s do a gratitude practice together', icon: <Heart size={14} /> },
      { label: 'Wind down', prompt: 'Guide me through an evening wind-down ritual', icon: <BookOpen size={14} /> },
    ];

    const contextualActions: QuickAction[] = [];

    if (hasMessages && lastTopic) {
      contextualActions.push({
        label: `Continue on ${lastTopic}`,
        prompt: `Let's continue our conversation about ${lastTopic}`,
        icon: <Compass size={14} />
      });
    }

    let timeActions: QuickAction[];
    if (hour >= 5 && hour < 12) {
      timeActions = morningActions;
    } else if (hour >= 12 && hour < 18) {
      timeActions = afternoonActions;
    } else {
      timeActions = eveningActions;
    }

    return [...contextualActions, ...timeActions].slice(0, 4);
  }, [hasMessages, lastTopic]);

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap',
      justifyContent: 'center',
      padding: '0 16px',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      {actions.map((action, idx) => (
        <motion.button
          key={action.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.06, duration: 0.25 }}
          whileHover={{ scale: 1.03, background: '#333333' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelectAction(action.prompt)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '9999px',
            background: '#1c1c1e',
            border: 'none',
            color: '#ffffff',
            fontSize: '0.8125rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{action.icon}</span>
          {action.label}
        </motion.button>
      ))}
    </div>
  );
};
