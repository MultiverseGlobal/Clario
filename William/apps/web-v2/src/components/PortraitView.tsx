'use client';

import type { Portrait } from '@/lib/types';
import { Brain, Heartbeat, Compass, Users, Star, ChartLine } from '@phosphor-icons/react';

interface Props { portrait: Portrait | null; }

function ProfileCard({ label, value, Icon }: { label: string; value: string; Icon: React.ElementType }) {
  return (
    <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: 'var(--accent-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent)',
      }}>
        <Icon size={18} weight="duotone" />
      </div>
      <div style={{ flex: 1 }}>
        <p className="label" style={{ marginBottom: 6 }}>{label}</p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{value}</p>
      </div>
    </div>
  );
}

function BeliefBar({ belief, strength }: { belief: string; strength: number }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>"{belief}"</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 12 }}>{Math.round(strength * 100)}%</p>
      </div>
      <div style={{ height: 3, background: 'var(--bg-subtle)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${strength * 100}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

export function PortraitView({ portrait }: Props) {
  if (!portrait) return (
    <div className="page-content">
      <h1 className="page-title">Portrait</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No portrait data yet.</p>
    </div>
  );

  return (
    <div className="page-content">
      <h1 className="page-title">{portrait.name}</h1>
      <p className="page-subtitle">{portrait.identity}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <ProfileCard label="Values" value={portrait.values} Icon={Star} />
        <ProfileCard label="Strengths" value={portrait.strengths} Icon={ChartLine} />
        <ProfileCard label="Dreams" value={portrait.dreams} Icon={Compass} />
        <ProfileCard label="Blind spots" value={portrait.blind_spots} Icon={Brain} />
        <ProfileCard label="Relationships" value={portrait.relationships} Icon={Users} />
        <ProfileCard label="Principles" value={portrait.principles} Icon={Heartbeat} />
      </div>

      {/* Cognitive profile */}
      {portrait.cognitive_profile && (
        <div className="card" style={{ marginBottom: 14 }}>
          <p className="label" style={{ marginBottom: 14 }}>Cognitive Profile</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { label: 'Problem solving', value: portrait.cognitive_profile.problemSolvingStyle },
              { label: 'Time bias', value: portrait.cognitive_profile.temporalBias },
              { label: 'Focus', value: portrait.cognitive_profile.attentionSpan },
              { label: 'Decisions', value: portrait.cognitive_profile.decisionHeuristics },
            ].map(item => (
              <div key={item.label}>
                <p className="label" style={{ marginBottom: 4 }}>{item.label}</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active beliefs */}
      {(portrait.active_beliefs ?? []).length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <p className="label" style={{ marginBottom: 16 }}>Active Beliefs</p>
          {portrait.active_beliefs.map((b, i) => (
            <BeliefBar key={i} belief={b.belief} strength={b.strength} />
          ))}
        </div>
      )}

      {/* Growth */}
      {(portrait.growth ?? []).length > 0 && (
        <div className="card">
          <p className="label" style={{ marginBottom: 12 }}>Growth trajectory</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {portrait.growth.map((g, i) => (
              <div key={i} style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', marginTop: 7, flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{g}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
