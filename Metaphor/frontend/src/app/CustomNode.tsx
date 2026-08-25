"use client";

import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { 
  User, 
  Calendar, 
  Lightbulb, 
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
  idea: Lightbulb,
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

const colorMap: Record<string, string> = {
  project: "#3b82f6",   // blue
  person: "#ec4899",    // pink
  meeting: "#8b5cf6",   // purple
  decision: "#10b981",  // emerald
  commit: "#f59e0b",    // amber
  idea: "#eab308",      // yellow
  task: "#06b6d4",      // cyan
  document: "#64748b",  // slate
  company: "#6366f1",   // indigo
  goal: "#ef4444",      // red
  event: "#14b8a6"      // teal
};

const CustomNodeComponent = ({ data }: { data: NodeData }) => {
  const typeLower = (data.type || "project").toLowerCase();
  const IconComponent = iconMap[typeLower] || Tag;
  const brandColor = colorMap[typeLower] || "#d97706";

  return (
    <div 
      className="px-4 py-3 flex items-center gap-3 border shadow-md hover:shadow-lg hover:scale-105 transition-all min-w-[210px] bg-[var(--card-bg)] border-[var(--card-border)] rounded-xl relative group cursor-pointer"
      style={{
        borderLeft: `4px solid ${brandColor}`
      }}
    >
      {/* Node handles for graph edge connections */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: brandColor, borderRadius: "50%", width: "8px", height: "8px", border: "none" }} 
      />
      
      {/* Icon Container */}
      <div 
        className="p-2.5 rounded-lg flex items-center justify-center"
        style={{
          backgroundColor: brandColor + "18",
          color: brandColor
        }}
      >
        <IconComponent size={16} />
      </div>

      {/* Info Container */}
      <div className="flex flex-col text-left overflow-hidden">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span 
            className="text-[9px] uppercase tracking-wider font-mono font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: brandColor + "20", color: brandColor }}
          >
            {data.type}
          </span>
          {data.status === "pending" && (
            <span className="text-[9px] font-mono text-amber-500 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30">
              Pending
            </span>
          )}
        </div>
        <span className="text-xs font-semibold text-[var(--foreground)] truncate max-w-[150px]" title={data.name}>
          {data.name}
        </span>
      </div>

      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ background: brandColor, borderRadius: "50%", width: "8px", height: "8px", border: "none" }} 
      />
    </div>
  );
};

export const CustomNode = memo(CustomNodeComponent);

