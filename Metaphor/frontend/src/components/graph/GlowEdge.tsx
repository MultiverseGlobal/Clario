import React from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath } from '@xyflow/react';

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
          stroke: 'rgba(17, 19, 21, 0.12)',
        }}
        id={`${id}-base`}
      />
      <path
        d={edgePath}
        fill="none"
        stroke="rgba(17, 19, 21, 0.6)"
        strokeWidth={1.5}
        strokeLinecap="round"
        className="flora-wire-active"
      />
    </>
  );
}
