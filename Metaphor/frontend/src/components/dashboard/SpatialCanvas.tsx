import React from "react";

interface SpatialCanvasProps {
  snapshot: any;
  selectedNode: any;
  onSelectNode: (node: any) => void;
}

export default function SpatialCanvas({ snapshot, selectedNode, onSelectNode }: SpatialCanvasProps) {
  const radius = 170; // Reduced from 220 to prevent collision with side panels
  const numNodes = snapshot?.active_projects?.length || 0;

  return (
    <>
      {/* Ambient glow */}
      <div className="fixed top-[55%] left-[45%] -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-primary/10 rounded-full blur-[120px] pointer-events-none z-0" />
      
      {/* Dot Grid */}
      <div className="fixed inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:40px_40px] opacity-20 pointer-events-none z-0" />

      {/* Main Graph Canvas */}
      <div className="fixed top-[55%] left-[45%] -translate-x-1/2 -translate-y-1/2 z-10 w-[600px] h-[600px]">
        
        {/* SVG Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          {snapshot?.active_projects?.map((p: any, i: number) => {
            const angle = (i * Math.PI * 2) / numNodes - (Math.PI / 4);
            const x = 300 + Math.cos(angle) * radius;
            const y = 300 + Math.sin(angle) * radius;
            return (
              <line 
                key={`line-${p.id}`}
                x1="300" y1="300" 
                x2={x} y2={y} 
                stroke="url(#line-grad)" 
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="animate-pulse"
              />
            );
          })}
        </svg>

        {/* Nodes */}
        <div className="absolute inset-0">
          <div 
            onClick={() => onSelectNode({ name: "System Core", type: "Root", desc: snapshot?.mission, confidence: snapshot?.confidence })}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer z-20 group
              ${selectedNode?.name === "System Core" ? "bg-surface/90 border-primary shadow-[0_0_40px_rgba(6,182,212,0.4)] scale-105" : "bg-surface/60 backdrop-blur-3xl border-border shadow-[0_0_20px_rgba(0,0,0,0.5)]"} 
              border-[1px] hover:border-primary/60`}
          >
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-[ping_3s_ease-in-out_infinite]" />
            <span className="font-bold text-2xl text-foreground text-center leading-tight tracking-tight z-10 drop-shadow-md">
              Metaphor<br/>Core
            </span>
          </div>
          
          {snapshot?.active_projects?.map((p: any, i: number) => {
            const angle = (i * Math.PI * 2) / numNodes - (Math.PI / 4);
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const isSelected = selectedNode?.name === p.name;
            
            return (
              <div 
                key={p.id} 
                onClick={() => onSelectNode({ name: p.name, type: p.type, desc: `Continuously indexed ${p.type.toLowerCase()} across all integrated data sources.`, confidence: p.confidence })}
                className={`absolute top-1/2 left-1/2 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer hover:scale-110 group z-10 border-[1px]
                  ${isSelected ? "bg-primary/20 backdrop-blur-2xl border-primary shadow-[0_0_30px_rgba(6,182,212,0.4)] z-30" : "bg-surface/40 backdrop-blur-xl border-white/5 hover:border-white/20 shadow-xl"}`}
                style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-sm font-semibold text-center px-4 leading-tight text-muted-foreground group-hover:text-foreground transition-colors">{p.name}</span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  );
}
