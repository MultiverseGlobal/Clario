'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Journey } from '@/lib/types';
import {
  Brain, Compass, Target, Heart, Lightning, BookOpen,
  Star, Leaf, Fire, Diamond, Atom, Rocket, Trophy, Clock
} from '@phosphor-icons/react';

const JOURNEY_ICONS: Record<string, React.ElementType> = {
  Brain, Compass, Target, Heart, Lightning, BookOpen,
  Star, Leaf, Fire, Diamond, Atom, Rocket, Trophy, Clock,
};

function JourneyIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = JOURNEY_ICONS[name] ?? Compass;
  return <Icon size={size} weight="duotone" />;
}

function ProgressRing({ value, size = 44 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-subtle)" strokeWidth={3} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={3}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
    </svg>
  );
}

interface Props {
  journeys: Journey[];
  onUpdate?: (journey: Journey) => void;
}

export function JourneysView({ journeys, onUpdate }: Props) {
  const [selected, setSelected] = useState<Journey | null>(journeys[0] ?? null);

  const handleToggleMilestone = (milestoneId: string) => {
    if (!selected || !onUpdate) return;
    
    const updatedMilestones = selected.milestones.map(m => 
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    
    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const totalCount = updatedMilestones.length;
    const newProgress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
    
    const updatedJourney = {
      ...selected,
      milestones: updatedMilestones,
      progress: newProgress
    };
    
    setSelected(updatedJourney);
    onUpdate(updatedJourney);
  };

  return (
    <div className="page-content" style={{ paddingBottom: 40 }}>
      <h1 className="page-title">Journeys</h1>
      <p className="page-subtitle">Your long arcs — the things you are becoming.</p>

      <div className="journeys-layout">
        {/* Left: Journey list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {journeys.map(j => {
            // Optimistically show the updated progress for the selected item in the list
            const isSelected = selected?.id === j.id;
            const progressToDisplay = isSelected ? selected.progress : j.progress;
            
            return (
              <div
                key={j.id}
                className={`journey-list-item ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelected(j)}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: isSelected ? 'var(--accent-subtle)' : 'var(--bg-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                }}>
                  <JourneyIcon name={j.icon} size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{j.category}</p>
                </div>
                <ProgressRing value={progressToDisplay} size={36} />
              </div>
            );
          })}

          {journeys.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: 12 }}>No journeys yet.</p>
          )}
        </div>

        {/* Right: Journey detail */}
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                  background: 'var(--accent-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)',
                }}>
                  <JourneyIcon name={selected.icon} size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>{selected.title}</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{selected.currentState}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>{selected.progress}%</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>progress</p>
                </div>
              </div>

              {selected.vision && (
                <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
                  <p className="label" style={{ marginBottom: 6 }}>Vision</p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selected.vision}</p>
                </div>
              )}
            </div>

            {/* Milestones */}
            {selected.milestones.length > 0 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <p className="label" style={{ marginBottom: 12 }}>Milestones</p>
                {selected.milestones.map(m => (
                  <div 
                    key={m.id} 
                    className={`milestone-row ${m.completed ? 'done' : ''} cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-md p-1 -mx-1 transition-colors`}
                    onClick={() => handleToggleMilestone(m.id)}
                  >
                    <div className={`milestone-check ${m.completed ? 'checked' : ''}`}>
                      {m.completed && (
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                          <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span>{m.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Lessons */}
            {selected.lessons.length > 0 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <p className="label" style={{ marginBottom: 12 }}>Lessons learned</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selected.lessons.map((lesson, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--accent)', fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>"</span>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>{lesson}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            {selected.timeline.length > 0 && (
              <div className="card">
                <p className="label" style={{ marginBottom: 14 }}>Timeline</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {selected.timeline.map((entry, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', marginTop: 4, flexShrink: 0 }} />
                        {i < selected.timeline.length - 1 && (
                          <div style={{ flex: 1, width: 1, background: 'var(--border)', margin: '4px 0' }} />
                        )}
                      </div>
                      <div style={{ paddingBottom: i < selected.timeline.length - 1 ? 16 : 0 }}>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{entry.date}</p>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{entry.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
