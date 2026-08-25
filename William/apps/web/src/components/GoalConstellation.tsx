import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface GoalConstellationProps {
  goals: string[];
}

export const GoalConstellation: React.FC<GoalConstellationProps> = ({ goals }) => {
  const [selectedGoalIdx, setSelectedGoalIdx] = useState<number | null>(0);

  // Fallback goals if none exists
  const activeGoals = goals.length > 0 ? goals : ['Build high-growth engine', 'Establish clear workflow', 'Connect systems'];

  // Static positions for nodes inside a 300x200 SVG ViewBox
  const nodes = [
    { x: 150, y: 70, size: 10, isDominant: true, label: 'Dominant Objective' },
    { x: 60, y: 130, size: 7, isDominant: false, label: 'Key Strategy' },
    { x: 240, y: 130, size: 7, isDominant: false, label: 'Secondary Goal' },
    { x: 150, y: 160, size: 6, isDominant: false, label: 'Enabler Goal' }
  ];

  // Map user goals to these nodes (wrapping if more goals than nodes)
  const mappedNodes = activeGoals.slice(0, nodes.length).map((goal, idx) => ({
    ...nodes[idx],
    goalText: goal,
    idx
  }));

  // Connection links (e.g. dominant linked to everything else)
  const links = mappedNodes.slice(1).map(node => ({
    x1: mappedNodes[0].x,
    y1: mappedNodes[0].y,
    x2: node.x,
    y2: node.y
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
      
      {/* SVG Constellation Canvas */}
      <div 
        style={{
          width: '100%',
          maxWidth: '360px',
          height: '220px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: '12px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: 'var(--shadow-subtle)'
        }}
      >
        <svg viewBox="0 0 300 200" style={{ width: '100%', height: '100%' }}>
          
          {/* Subtle star field background */}
          <circle cx="40" cy="30" r="0.5" fill="var(--text-muted)" opacity="0.3" />
          <circle cx="260" cy="40" r="0.5" fill="var(--text-muted)" opacity="0.4" />
          <circle cx="100" cy="160" r="0.5" fill="var(--text-muted)" opacity="0.2" />
          <circle cx="220" cy="180" r="0.5" fill="var(--text-muted)" opacity="0.5" />
          <circle cx="80" cy="80" r="0.5" fill="var(--text-muted)" opacity="0.3" />

          {/* Dotted Connection Lines */}
          {links.map((link, idx) => (
            <motion.line
              key={idx}
              x1={link.x1}
              y1={link.y1}
              x2={link.x2}
              y2={link.y2}
              stroke="var(--text-muted)"
              strokeWidth="0.75"
              strokeDasharray="2,3"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.4 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          ))}

          {/* Goals Nodes */}
          {mappedNodes.map((node) => {
            const isSelected = selectedGoalIdx === node.idx;
            
            return (
              <g key={node.idx} style={{ cursor: 'pointer' }} onClick={() => setSelectedGoalIdx(node.idx)}>
                {/* Glow ring around dominant or selected nodes */}
                {(node.isDominant || isSelected) && (
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={node.size + 6}
                    fill="none"
                    stroke="var(--accent-color)"
                    strokeWidth="0.5"
                    opacity="0.15"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.05, 0.15] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                {/* Main Node Circle */}
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={isSelected ? node.size + 1.5 : node.size}
                  fill={node.isDominant ? 'var(--accent-color)' : 'transparent'}
                  stroke="var(--accent-color)"
                  strokeWidth="1.5"
                  animate={{
                    y: [node.y - 2, node.y + 2, node.y - 2]
                  }}
                  transition={{
                    duration: 3 + node.idx,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  whileHover={{ scale: 1.2 }}
                />

                {/* Numeric Indicator */}
                <text
                  x={node.x}
                  y={node.y + 3}
                  textAnchor="middle"
                  fontSize="7"
                  fontWeight="600"
                  fill={node.isDominant ? 'var(--accent-text)' : 'var(--text-primary)'}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {node.idx + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Node Details callout card */}
      <div 
        style={{
          width: '100%',
          padding: '16px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: '8px',
          minHeight: '80px',
          boxShadow: 'var(--shadow-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}
      >
        {selectedGoalIdx !== null && mappedNodes[selectedGoalIdx] ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="zen-caption" style={{ textTransform: 'uppercase', fontSize: '0.6875rem', fontWeight: 600 }}>
                {mappedNodes[selectedGoalIdx].label}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Index: 0{selectedGoalIdx + 1}
              </span>
            </div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 400, color: 'var(--text-primary)', marginTop: '4px' }}>
              "{mappedNodes[selectedGoalIdx].goalText}"
            </div>
          </>
        ) : (
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '48px' }}>
            Click a constellation node to query goal parameters...
          </div>
        )}
      </div>

    </div>
  );
};
