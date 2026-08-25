import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, Compass, Globe, ShieldCheck, Sun, Moon, Zap } from 'lucide-react';

interface DynamicQuickActionsProps {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  lastReplyText?: string;
  onSelectPrompt: (prompt: string) => void;
  isOpen: boolean;
}

interface ActionChip {
  id: string;
  icon: React.ReactNode;
  label: string;
  prompt: string;
}

export const DynamicQuickActions: React.FC<DynamicQuickActionsProps> = ({
  timeOfDay,
  lastReplyText,
  onSelectPrompt,
  isOpen
}) => {
  if (!isOpen) return null;

  // Generate contextual suggestion chips based on time of day and conversation context
  const getDynamicChips = (): ActionChip[] => {
    const chips: ActionChip[] = [];

    // Contextual chips based on keywords in William's last reply
    const lowerReply = (lastReplyText || '').toLowerCase();

    if (lowerReply.includes('journey') || lowerReply.includes('milestone') || lowerReply.includes('progress')) {
      chips.push({
        id: 'journey-drill',
        icon: <Compass size={13} />,
        label: 'Show Active Journeys',
        prompt: 'Show my active journeys and milestone progress.'
      });
    }

    if (lowerReply.includes('belief') || lowerReply.includes('principle') || lowerReply.includes('identity')) {
      chips.push({
        id: 'belief-drill',
        icon: <Brain size={13} />,
        label: 'Explore Active Beliefs',
        prompt: 'What active beliefs and convictions have we recorded?'
      });
    }

    if (lowerReply.includes('entity') || lowerReply.includes('relation') || lowerReply.includes('world')) {
      chips.push({
        id: 'world-drill',
        icon: <Globe size={13} />,
        label: 'View World Graph',
        prompt: 'Show the entities and world model you mapped for me.'
      });
    }

    // Time of day specific recommendations
    if (timeOfDay === 'morning') {
      chips.push(
        { id: 'm-intent', icon: <Sun size={13} />, label: 'Morning Intention', prompt: "Let's set a single non-negotiable intention for today." },
        { id: 'm-focus', icon: <ShieldCheck size={13} />, label: 'Today’s Focus', prompt: "Show my primary focus items for the morning." },
        { id: 'm-pathway', icon: <Compass size={13} />, label: 'Compound Growth', prompt: "How does my priority today move the highest-leverage journey forward?" }
      );
    } else if (timeOfDay === 'afternoon') {
      chips.push(
        { id: 'a-friction', icon: <Zap size={13} />, label: 'Diagnose Friction', prompt: "I feel some friction or resistance right now. Help me untangle it." },
        { id: 'a-journey', icon: <Compass size={13} />, label: 'Show Journeys', prompt: "Show my active pathways and milestone checklist." },
        { id: 'a-patterns', icon: <Sparkles size={13} />, label: 'Recognize Patterns', prompt: "What behavioral or decision patterns are you noticing in my workflow?" }
      );
    } else {
      // Evening / Night
      chips.push(
        { id: 'e-reflect', icon: <Moon size={13} />, label: 'Evening Reflection', prompt: "Let's conduct our evening strategy reflection." },
        { id: 'e-beliefs', icon: <Brain size={13} />, label: 'Evolve Beliefs', prompt: "Based on what happened today, what beliefs should we update in my portrait?" },
        { id: 'e-synthesis', icon: <Sparkles size={13} />, label: 'Daily Synthesis', prompt: "What deserves remembering from today's efforts?" }
      );
    }

    // Always include a general high-agency prompt
    chips.push(
      { id: 'g-world', icon: <Globe size={13} />, label: 'World Knowledge', prompt: "Show the mapped entities and systems in my world model." }
    );

    return chips.slice(0, 5); // Return top 5 most relevant
  };

  const chips = getDynamicChips();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        padding: '6px 8px',
        marginBottom: '10px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        maxWidth: '640px',
        width: '100%'
      }}
    >
      {chips.map(chip => (
        <button
          key={chip.id}
          onClick={() => onSelectPrompt(chip.prompt)}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '7px 14px',
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '0.75rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span style={{ color: '#c084fc' }}>{chip.icon}</span>
          <span>{chip.label}</span>
        </button>
      ))}
    </motion.div>
  );
};
