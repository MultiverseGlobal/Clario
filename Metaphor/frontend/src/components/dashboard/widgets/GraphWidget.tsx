import React from "react";
import { Network } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import SpatialCanvas from "@/components/dashboard/SpatialCanvas";

export default function GraphWidget() {
  const snapshot = {
    mission: "Develop the Metaphor universal context operating system to align all connected AI agents.",
    active_projects: [
      { id: "p1", name: "Metaphor Core", type: "Project", confidence: 0.95 },
      { id: "p2", name: "Atlas Portal", type: "Project", confidence: 0.82 },
      { id: "p3", name: "Knowledge Ingestion", type: "System", confidence: 0.77 },
      { id: "p4", name: "Neural Link", type: "Integration", confidence: 0.64 }
    ],
    confidence: 0.88
  };

  return (
    <Card className="h-full relative overflow-hidden" noPadding>
      <div className="absolute top-6 left-6 z-50">
        <CardHeader className="border-none mb-0 bg-surface-2/80 backdrop-blur rounded-lg px-4 py-2 border border-border-subtle shadow-glass">
          <Network className="w-4 h-4 text-primary" />
          <CardTitle className="mb-0">Knowledge Graph</CardTitle>
        </CardHeader>
      </div>
      
      {/* Container to scale down the absolute positioned graph */}
      <div className="absolute inset-0 flex items-center justify-center scale-75 transform-origin-center pointer-events-auto">
         <div className="relative w-[800px] h-[800px]">
            <div className="[&>div.fixed]:absolute [&>div.fixed]:top-1/2 [&>div.fixed]:left-1/2">
                <SpatialCanvas 
                  snapshot={snapshot} 
                  selectedNode={null} 
                  onSelectNode={() => {}} 
                />
            </div>
         </div>
      </div>
    </Card>
  );
}
