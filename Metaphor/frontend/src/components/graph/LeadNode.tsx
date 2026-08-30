import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { UserCircle2 } from 'lucide-react';

interface LeadNodeProps {
  data: {
    label: string;
    summary?: string;
  };
  selected?: boolean;
}

export function LeadNode({ data, selected }: LeadNodeProps) {
  return (
    <div
      style={{
        backgroundColor: '#10131b',
        borderWidth: 1,
        borderColor: selected ? '#10b981' : 'rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '12px',
        minWidth: '240px',
        maxWidth: '300px',
        boxShadow: selected ? '0 0 16px rgba(16, 185, 129, 0.3)' : 'none',
        transition: 'all 0.2s ease-in-out',
      }}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-muted !border-none" />
      
      <div className="flex items-center gap-2 mb-2">
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '6px', borderRadius: '6px' }}>
          <UserCircle2 size={16} color="#10b981" />
        </div>
        <div className="text-sm font-semibold text-foreground truncate">{data.label}</div>
        <div className="ml-auto text-[10px] text-emerald-500 uppercase tracking-widest font-mono">Lead</div>
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
