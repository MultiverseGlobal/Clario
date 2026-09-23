"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { NodeCanvas } from "@/components/canvas/NodeCanvas";

function CanvasPageContent() {
  const searchParams = useSearchParams();
  const projectName = searchParams.get("project") || "Pseudonyms Network";

  return <NodeCanvas projectName={projectName} />;
}

export default function CanvasPage() {
  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen bg-white/90 backdrop-blur-md flex items-center justify-center text-[12px] font-mono uppercase tracking-widest text-[#AEB7BC]">
          Initializing Metaphor Canvas Studio...
        </div>
      }
    >
      <CanvasPageContent />
    </Suspense>
  );
}
