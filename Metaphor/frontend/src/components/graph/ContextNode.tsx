import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileText } from 'lucide-react';

interface ContextNodeProps {
  data: {
    label: string;
    summary?: string;
  };
  selected?: boolean;
}

export function ContextNode({ data, selected }: ContextNodeProps) {
  return (
    <div
      style={{
        backgroundColor: '#10131b',
        borderWidth: 1,
        borderColor: selected ? 'hsl(260, 70%, 62%)' : 'rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '12px',
        minWidth: '240px',
        maxWidth: '300px',
        boxShadow: selected ? '0 0 16px hsla(260, 70%, 62%, 0.3)' : 'none',
        transition: 'all 0.2s ease-in-out',
      }}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-muted !border-none" />
      
      <div className="flex items-center gap-2 mb-2">
        <div style={{ backgroundColor: 'hsla(260, 70%, 62%, 0.2)', padding: '6px', borderRadius: '6px' }}>
          <FileText size={16} color="hsl(260, 70%, 62%)" />
        </div>
        <div className="text-sm font-semibold text-foreground truncate">{data.label}</div>
      </div>
      
      {data.summary && (
        <div className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mt-2">
          {data.summary}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-muted !border-none" />
    </div>
  );
}
