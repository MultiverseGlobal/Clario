import React from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath } from '@xyflow/react';
import { motion } from 'framer-motion';

export function GlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: 'hsla(260, 70%, 62%, 0.2)',
        }}
        id={`${id}-base`}
      />
      <motion.path
        d={edgePath}
        fill="none"
        stroke="hsla(260, 70%, 62%, 0.8)"
        strokeWidth={2}
        strokeLinecap="round"
        initial={{ strokeDasharray: '0 100', strokeDashoffset: 0 }}
        animate={{
          strokeDasharray: ['0 100', '20 100', '0 100'],
          strokeDashoffset: [0, -100],
        }}
        transition={{
          duration: 3,
          ease: 'linear',
          repeat: Infinity,
        }}
      />
    </>
  );
}
