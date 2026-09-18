"use client";

import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { 
  User, 
  Calendar, 
  CheckSquare, 
  GitCommit, 
  Folder,
  FileText,
  Building2,
  Mail,
  StickyNote,
  Package,
  Target,
  Zap,
  Tag
} from "lucide-react";

interface NodeData {
  name: string;
  type: string;
  metadata?: Record<string, any>;
  status?: string;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  person: User,
  meeting: Calendar,
  decision: CheckSquare,
  commit: GitCommit,
  project: Folder,
  task: CheckSquare,
  document: FileText,
  company: Building2,
  email: Mail,
  note: StickyNote,
  product: Package,
  goal: Target,
  event: Zap
};

const CustomNodeComponent = ({ data }: { data: NodeData }) => {
  const typeLower = (data.type || "project").toLowerCase();
  const IconComponent = iconMap[typeLower] || Tag;

  return (
    <div className="px-3 py-2 flex flex-col gap-2 min-w-[180px] bg-surface-1 border border-border-subtle rounded-none hover:border-foreground transition-all group cursor-pointer shadow-sm relative">
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: "var(--color-foreground)", borderRadius: "0", width: "4px", height: "4px", border: "none" }} 
      />
      
      <div className="flex items-center gap-2 border-b border-border-subtle pb-1.5">
        <IconComponent size={12} className="text-muted" />
        <span className="text-[9px] uppercase tracking-widest font-mono text-muted">
          {data.type}
        </span>
        {data.status === "pending" && (
          <span className="ml-auto text-[8px] font-mono uppercase border border-border-strong px-1 rounded-none text-muted">
            Pending
          </span>
        )}
      </div>

      <div className="text-xs font-sans text-foreground truncate" title={data.name}>
        {data.name}
      </div>

      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ background: "var(--color-foreground)", borderRadius: "0", width: "4px", height: "4px", border: "none" }} 
      />
    </div>
  );
};

export const CustomNode = memo(CustomNodeComponent);
