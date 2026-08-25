import React from 'react';
import type { Journey, LibraryItem, MemoryNode } from '@william/types';
import { 
  Brain, Globe, BookOpen, CheckCircle2, Circle, 
  ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';

export interface GenerativeCardPayload {
  type: 'journey' | 'belief' | 'world' | 'focus' | 'library';
  data: any;
}

interface GenerativeCardProps {
  payload: GenerativeCardPayload;
  onToggleMilestone?: (journeyId: string, milestoneId: string) => void;
  onToggleTask?: (taskId: string) => void;
  onSelectEntity?: (nodeId: string) => void;
}

export const GenerativeCard: React.FC<GenerativeCardProps> = ({
  payload,
  onToggleMilestone,
  onToggleTask,
  onSelectEntity
}) => {
  switch (payload.type) {
    case 'journey':
      return <JourneyGenCard journey={payload.data as Journey} onToggleMilestone={onToggleMilestone} />;
    case 'belief':
      return <BeliefGenCard beliefs={Array.isArray(payload.data) ? payload.data : [payload.data]} />;
    case 'world':
      return <WorldEntityGenCard nodes={Array.isArray(payload.data) ? payload.data : [payload.data]} onSelectEntity={onSelectEntity} />;
    case 'focus':
      return <FocusGenCard tasks={payload.data} onToggleTask={onToggleTask} />;
    case 'library':
      return <LibraryGenCard item={payload.data as LibraryItem} />;
    default:
      return null;
  }
};

/**
 * 1. Journey Generative Card (Natural AI in-stream widget)
 */
export const JourneyGenCard: React.FC<{
  journey: Journey;
  onToggleMilestone?: (journeyId: string, milestoneId: string) => void;
}> = ({ journey, onToggleMilestone }) => {
  if (!journey) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        marginTop: '12px',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
        width: '100%'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px'
          }}>
            {journey.icon || '🧭'}
          </div>
          <div>
            <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255, 255, 255, 0.45)' }}>
              Active Pathway
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {journey.title}
            </h4>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '1.125rem', fontWeight: 300, color: 'var(--text-primary)' }}>
            {journey.progress}%
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${journey.progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)' }}
        />
      </div>

      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
        <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Vision: </span>{journey.vision}
      </div>

      {/* Interactive Milestones Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255, 255, 255, 0.4)' }}>
          Milestones
        </span>
        {journey.milestones.slice(0, 4).map((m) => (
          <div
            key={m.id}
            onClick={() => onToggleMilestone && onToggleMilestone(journey.id, m.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              opacity: m.completed ? 0.45 : 1,
              padding: '4px 6px',
              borderRadius: '8px',
              transition: 'background 0.2s ease',
              background: 'rgba(255, 255, 255, 0.02)'
            }}
          >
            {m.completed ? (
              <CheckCircle2 size={16} color="#a855f7" />
            ) : (
              <Circle size={16} color="rgba(255, 255, 255, 0.3)" />
            )}
            <span style={{
              textDecoration: m.completed ? 'line-through' : 'none',
              color: 'var(--text-primary)'
            }}>
              {m.text}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/**
 * 2. Belief Generative Card (Theory of Mind Beliefs)
 */
export const BeliefGenCard: React.FC<{
  beliefs: Array<{ belief: string; strength: number; evolution: string; lastTested?: string }>;
}> = ({ beliefs }) => {
  if (!beliefs || beliefs.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        marginTop: '12px',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
        width: '100%'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Brain size={16} color="#c084fc" />
        <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#c084fc', fontWeight: 600 }}>
          Active Belief System
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {beliefs.map((b, idx) => (
          <div key={idx} style={{
            padding: '12px 14px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
                "{b.belief}"
              </span>
              <span style={{
                fontSize: '0.6875rem',
                background: 'rgba(192, 132, 252, 0.15)',
                color: '#d8b4fe',
                border: '1px solid rgba(192, 132, 252, 0.25)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600
              }}>
                {Math.round(b.strength * 100)}% Conviction
              </span>
            </div>

            {/* Strength bar */}
            <div style={{ width: '100%', height: '3px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.round(b.strength * 100)}%`, height: '100%', background: '#c084fc' }} />
            </div>

            <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', margin: 0 }}>
              Evolution: {b.evolution}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/**
 * 3. World Entity Generative Card (Knowledge Graph nodes)
 */
export const WorldEntityGenCard: React.FC<{
  nodes: MemoryNode[];
  onSelectEntity?: (nodeId: string) => void;
}> = ({ nodes, onSelectEntity }) => {
  if (!nodes || nodes.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        marginTop: '12px',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
        width: '100%'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Globe size={16} color="#38bdf8" />
        <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#38bdf8', fontWeight: 600 }}>
          Mapped World Entities
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
        {nodes.map(n => (
          <div
            key={n.id}
            onClick={() => onSelectEntity && onSelectEntity(n.id)}
            style={{
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.4)' }}>
                {n.type}
              </span>
              <span style={{ fontSize: '0.625rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: '6px' }}>
                {Math.round(n.confidence * 100)}%
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              {n.label}
            </div>
            {n.description && (
              <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', margin: 0, lineHeight: 1.3 }}>
                {n.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/**
 * 4. Focus Tasks Generative Card
 */
export const FocusGenCard: React.FC<{
  tasks: Array<{ id: string; text: string; completed: boolean }>;
  onToggleTask?: (taskId: string) => void;
}> = ({ tasks, onToggleTask }) => {
  if (!tasks || tasks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        marginTop: '12px',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
        width: '100%'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ShieldCheck size={16} color="#34d399" />
        <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#34d399', fontWeight: 600 }}>
          Today's Core Focus
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tasks.map(t => (
          <div
            key={t.id}
            onClick={() => onToggleTask && onToggleTask(t.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.875rem',
              cursor: 'pointer',
              opacity: t.completed ? 0.45 : 1,
              padding: '6px 10px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.04)'
            }}
          >
            {t.completed ? (
              <CheckCircle2 size={16} color="#34d399" />
            ) : (
              <Circle size={16} color="rgba(255, 255, 255, 0.3)" />
            )}
            <span style={{
              textDecoration: t.completed ? 'line-through' : 'none',
              color: 'var(--text-primary)'
            }}>
              {t.text}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/**
 * 5. Library Generative Card
 */
export const LibraryGenCard: React.FC<{
  item: LibraryItem;
}> = ({ item }) => {
  if (!item) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        marginTop: '12px',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
        width: '100%'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <BookOpen size={14} color="#f59e0b" />
          <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b', fontWeight: 600 }}>
            {item.type}
          </span>
        </div>
        {item.author && (
          <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }}>
            By {item.author}
          </span>
        )}
      </div>

      <h4 style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
        {item.title}
      </h4>

      <p style={{
        fontSize: '0.875rem',
        color: 'rgba(255, 255, 255, 0.8)',
        fontStyle: 'italic',
        fontFamily: 'var(--font-serif)',
        lineHeight: 1.6,
        margin: '4px 0 0 0',
        padding: '8px 12px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '8px',
        borderLeft: '2px solid #f59e0b'
      }}>
        "{item.content}"
      </p>

      {item.tags && item.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          {item.tags.map(t => (
            <span key={t} style={{
              fontSize: '0.625rem',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '2px 8px',
              borderRadius: '12px',
              color: 'rgba(255, 255, 255, 0.5)'
            }}>
              #{t}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
};
