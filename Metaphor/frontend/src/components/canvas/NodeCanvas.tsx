"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AgentNode } from "./nodes/AgentNode";
import { ToolNode } from "./nodes/ToolNode";
import { TaskNode } from "./nodes/TaskNode";
import { ContextNode } from "./nodes/ContextNode";
import { HandoffEdge } from "./edges/HandoffEdge";
import { DockPalette, CanvasMode } from "./DockPalette";
import { CanvasToolbar } from "./CanvasToolbar";
import { InspectorDrawer, SelectedEntity } from "./InspectorDrawer";
import { TelemetryDrawer, TelemetryEvent } from "./TelemetryDrawer";

const nodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
  task: TaskNode,
  context: ContextNode,
};

const edgeTypes = {
  handoff: HandoffEdge,
};

// Initial demonstration nodes showcasing Metaphor's coordination substrate
const INITIAL_NODES: Node[] = [
  {
    id: "agent-chatgpt",
    type: "agent",
    position: { x: 80, y: 180 },
    data: {
      id: "agent-chatgpt",
      name: "ChatGPT",
      model: "gpt-4o",
      status: "ready",
      capabilities: ["planning", "coordination", "code_review"],
      lastAction: "Awaiting task dispatch",
    },
  },
  {
    id: "task-auth",
    type: "task",
    position: { x: 420, y: 150 },
    data: {
      id: "task-auth",
      title: "Implement NextAuth in Pseudonyms",
      objective: "Scaffold OAuth providers and session callback in app/api/auth/[...nextauth]/route.ts",
      status: "pending",
      requiredCapabilities: ["generate_auth_scaffold", "setup_oauth"],
      ownerName: "ChatGPT",
    },
  },
  {
    id: "tool-auth-mcp",
    type: "tool",
    position: { x: 780, y: 180 },
    data: {
      id: "tool-auth-mcp",
      name: "Auth Generator MCP",
      transport: "stdio",
      status: "active",
      capabilities: ["generate_auth_scaffold", "setup_oauth"],
      latencyMs: 14,
      commandSnippet: "node auth_mcp_server.js",
    },
  },
  {
    id: "context-spec",
    type: "context",
    position: { x: 420, y: 380 },
    data: {
      id: "context-spec",
      name: "auth_contract.json",
      category: "spec",
      tokens: 420,
      snippet: '{\n  "provider": "google",\n  "scopes": ["profile", "email"]\n}',
      uri: "specs/auth.json",
    },
  },
];

const INITIAL_EDGES: Edge[] = [
  {
    id: "e-agent-task",
    source: "agent-chatgpt",
    target: "task-auth",
    type: "handoff",
    data: {
      label: "Baton Pass",
      status: "pending",
      contextRefs: { goal: "OAuth setup" },
    },
  },
  {
    id: "e-task-tool",
    source: "task-auth",
    target: "tool-auth-mcp",
    type: "handoff",
    data: {
      label: "MCP RPC Invoke",
      status: "pending",
      expectedOutput: "Route handler scaffold",
    },
  },
  {
    id: "e-context-task",
    source: "context-spec",
    target: "task-auth",
    type: "handoff",
    data: {
      label: "Grounded Ref",
      status: "completed",
    },
  },
];

function CanvasInner({ projectName = "Pseudonyms Rebuild" }: { projectName?: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [mode, setMode] = useState<CanvasMode>("select");
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const { fitView } = useReactFlow();

  const [telemetryEvents, setTelemetryEvents] = useState<TelemetryEvent[]>([
    {
      id: "ev-init",
      timestamp: "14:40:02",
      type: "system",
      sender: "Metaphor Hub",
      summary: "Studio initialized. 2 Participants connected, 1 active task registered.",
      status: "success",
    },
  ]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "handoff",
            data: { label: "Handoff Relay", status: "pending" },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Selection handlers
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedEntity({
      type: node.type as any,
      id: node.id,
      data: node.data,
    });
  }, []);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEntity({
      type: "handoff",
      id: edge.id,
      data: edge.data,
    });
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedEntity(null);
  }, []);

  // Adding nodes from palette
  const handleAddAgent = useCallback(() => {
    const id = `agent-${Date.now()}`;
    const newNode: Node = {
      id,
      type: "agent",
      position: { x: 100 + Math.random() * 50, y: 150 + Math.random() * 50 },
      data: {
        id,
        name: "Claude 3.7",
        model: "claude-3-7-sonnet",
        status: "ready",
        capabilities: ["architecture", "refactoring", "frontend"],
        lastAction: "Ready",
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const handleAddTool = useCallback(() => {
    const id = `tool-${Date.now()}`;
    const newNode: Node = {
      id,
      type: "tool",
      position: { x: 750 + Math.random() * 50, y: 200 + Math.random() * 50 },
      data: {
        id,
        name: "GitHub PR MCP",
        transport: "stdio",
        status: "active",
        capabilities: ["create_pull_request", "read_issue"],
        latencyMs: 18,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const handleAddTask = useCallback(() => {
    const id = `task-${Date.now()}`;
    const newNode: Node = {
      id,
      type: "task",
      position: { x: 420 + Math.random() * 50, y: 200 + Math.random() * 50 },
      data: {
        id,
        title: "Database Migration Review",
        objective: "Verify SQLModel schemas match PostgreSQL production migration",
        status: "pending",
        requiredCapabilities: ["architecture"],
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const handleAddContext = useCallback(() => {
    const id = `context-${Date.now()}`;
    const newNode: Node = {
      id,
      type: "context",
      position: { x: 420 + Math.random() * 50, y: 450 + Math.random() * 50 },
      data: {
        id,
        name: "DESIGN.md",
        category: "spec",
        tokens: 310,
        snippet: "PDS-v3 obsidian theme specifications.",
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  // Dispatch flow simulation (Task -> Handoff -> Tool -> Complete)
  const handleDispatchAll = useCallback(() => {
    if (isDispatching) return;
    setIsDispatching(true);

    const time = new Date().toTimeString().split(" ")[0];

    // 1. Mark edges flowing and task in_progress
    setNodes((nds) =>
      nds.map((n) =>
        n.id === "task-auth"
          ? { ...n, data: { ...n.data, status: "in_progress" } }
          : n.id === "agent-chatgpt"
          ? { ...n, data: { ...n.data, status: "running", lastAction: "Delegating task via Metaphor" } }
          : n
      )
    );

    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        data: { ...e.data, status: "flowing" },
      }))
    );

    setTelemetryEvents((evs) => [
      ...evs,
      {
        id: `ev-${Date.now()}-1`,
        timestamp: time,
        type: "handoff",
        sender: "ChatGPT",
        receiver: "Auth Generator MCP",
        summary: "Transferred task 'Implement NextAuth' with auth_contract.json context.",
        status: "pending",
      },
    ]);

    // 2. Complete after 1.5s
    setTimeout(() => {
      const finishTime = new Date().toTimeString().split(" ")[0];

      setNodes((nds) =>
        nds.map((n) =>
          n.id === "task-auth"
            ? { ...n, data: { ...n.data, status: "completed" } }
            : n.id === "agent-chatgpt"
            ? { ...n, data: { ...n.data, status: "ready", lastAction: "Handoff verified and closed" } }
            : n.id === "tool-auth-mcp"
            ? { ...n, data: { ...n.data, status: "active" } }
            : n
        )
      );

      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          data: { ...e.data, status: "completed" },
        }))
      );

      setTelemetryEvents((evs) => [
        ...evs,
        {
          id: `ev-${Date.now()}-2`,
          timestamp: finishTime,
          type: "execution",
          sender: "Auth Generator MCP",
          summary: "Successfully generated auth boilerplate in route.ts (1.4s). Task marked completed.",
          status: "success",
        },
      ]);

      setIsDispatching(false);
    }, 1500);
  }, [isDispatching, setNodes, setEdges]);

  return (
    <div className="relative w-screen h-screen flora-canvas-bg overflow-hidden select-none">
      {/* Top Floating Chrome */}
      <CanvasToolbar
        projectName={projectName}
        isDispatching={isDispatching}
        activeCount={nodes.length}
        onDispatchAll={handleDispatchAll}
        onNewTask={handleAddTask}
        onFitView={() => fitView({ duration: 500 })}
      />

      {/* Left Tool Dock */}
      <DockPalette
        mode={mode}
        onSetMode={setMode}
        onAddAgent={handleAddAgent}
        onAddTool={handleAddTool}
        onAddTask={handleAddTask}
        onAddContext={handleAddContext}
      />

      {/* Main Interactive React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        panOnDrag={mode === "pan"}
        selectionOnDrag={mode === "select"}
        minZoom={0.2}
        maxZoom={2}
        defaultViewport={{ x: 80, y: 120, zoom: 0.9 }}
        className="w-full h-full"
      >
        <Background gap={24} size={1} color="rgba(255, 255, 255, 0.05)" />
        <Controls
          showInteractive={false}
          className="!bottom-20 !right-5 !bg-black/60 !border !border-white/10 !rounded-xl overflow-hidden !shadow-2xl"
        />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(n) => {
            if (n.type === "agent") return "#818cf8";
            if (n.type === "tool") return "#10b981";
            if (n.type === "task") return "#f59e0b";
            return "#64748b";
          }}
          maskColor="rgba(6, 7, 10, 0.85)"
          className="!bottom-20 !left-5 !bg-[#0c0e17] !border !border-white/10 !rounded-xl !overflow-hidden !shadow-2xl"
        />
      </ReactFlow>

      {/* Right Contextual Inspector Drawer */}
      <InspectorDrawer
        entity={selectedEntity}
        onClose={() => setSelectedEntity(null)}
        onTestToolCall={async (toolId, action, args) => {
          return {
            success: true,
            action,
            status: "executed",
            payload: args,
            output: "Mock MCP proxy execution verified.",
          };
        }}
      />

      {/* Bottom Live Telemetry & Event Stream Drawer */}
      <TelemetryDrawer
        events={telemetryEvents}
        onClear={() => setTelemetryEvents([])}
      />
    </div>
  );
}

export function NodeCanvas(props: { projectName?: string }) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
