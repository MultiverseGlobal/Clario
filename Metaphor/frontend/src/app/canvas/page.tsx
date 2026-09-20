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
        <div className="w-screen h-screen bg-[#06070a] flex items-center justify-center text-xs font-mono text-zinc-500">
          Initializing Flora Canvas Studio...
        </div>
      }
    >
      <CanvasPageContent />
    </Suspense>
  );
}
