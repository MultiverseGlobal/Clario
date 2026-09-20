"use client";

import React, { use } from "react";
import { NodeCanvas } from "@/components/canvas/NodeCanvas";

export default function ProjectCanvasPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.projectId;
  const displayName = projectId
    ? projectId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Metaphor Studio";

  return <NodeCanvas projectName={displayName} />;
}
