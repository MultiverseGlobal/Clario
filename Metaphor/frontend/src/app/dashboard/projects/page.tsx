"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Folder, Plus, ChevronRight, ChevronDown, Copy, Check, X,
  Terminal, Zap, Trash2, Archive, Pencil, Clock, History,
  ListChecks, CircleDot, PauseCircle, CheckCircle2
} from "lucide-react";
import { ChatGPTIcon, ClaudeIcon, CursorIcon, GeminiIcon, AntigravityIcon, AtlasIcon, WilliamIcon, ClarioIcon } from "@/components/ui/BrandIcons";
import { fetchFromMetaphor, getBackendUrl } from "@/app/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type ProjectStatus = "active" | "paused" | "completed";

type Project = {
  id?: string;
  title: string;
  name?: string;
  summary?: string;
  status?: string;
  project_status?: ProjectStatus;
  created_at?: string;
  attachedAIs?: string[];
};

type TaskHandoff = {
  id: string;
  source_ai: string;
  target_ai: string;
  payload: string;
  instructions: string;
  status: string;
  resolution_summary?: string;
  created_at: string;
  resolved_at?: string;
};

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const AI_ICON_MAP: Record<string, React.ReactNode> = {
  ChatGPT:     <ChatGPTIcon className="w-4 h-4" />,
  Claude:      <ClaudeIcon  className="w-4 h-4" />,
  Cursor:      <CursorIcon  className="w-4 h-4" />,
  Gemini:      <GeminiIcon  className="w-4 h-4" />,
  Antigravity: <AntigravityIcon className="w-4 h-4" />,
  Atlas:       <AtlasIcon   className="w-4 h-4" />,
  William:     <WilliamIcon className="w-4 h-4" />,
  Clario:      <ClarioIcon  className="w-4 h-4" />,
};

const AI_TOOLS        = ["ChatGPT", "Claude", "Cursor", "Gemini", "Antigravity"];
const ECOSYSTEM_TOOLS = ["Atlas", "William", "Clario"];
const ALL_AI_TOOLS    = [...AI_TOOLS, ...ECOSYSTEM_TOOLS];

const STATUS_CONFIG: Record<ProjectStatus, { label: string; icon: React.ReactNode; color: string }> = {
  active:    { label: "Active",    icon: <CircleDot className="w-3 h-3" />,     color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" },
  paused:    { label: "Paused",    icon: <PauseCircle className="w-3 h-3" />,   color: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
  completed: { label: "Completed", icon: <CheckCircle2 className="w-3 h-3" />, color: "text-muted border-border-subtle bg-surface-1" },
};

// â”€â”€â”€ HandoffCard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function HandoffCard({ handoff: h }: { handoff: TaskHandoff }) {
  const ICON_SM: Record<string, React.ReactNode> = {
    ChatGPT:     <ChatGPTIcon className="w-3.5 h-3.5" />,
    Claude:      <ClaudeIcon  className="w-3.5 h-3.5" />,
    Cursor:      <CursorIcon  className="w-3.5 h-3.5" />,
    Gemini:      <GeminiIcon  className="w-3.5 h-3.5" />,
    Antigravity: <AntigravityIcon className="w-3.5 h-3.5" />,
  };
  const srcKey = Object.keys(ICON_SM).find(k => k.toLowerCase() === h.source_ai) || "";
  const tgtKey = Object.keys(ICON_SM).find(k => k.toLowerCase() === h.target_ai) || "";
  const isResolved = h.status !== "pending";
  return (
    <div className={`bg-surface-1 border rounded-xl p-4 flex gap-4 transition-opacity ${isResolved ? "opacity-60" : ""} ${h.status === "cancelled" ? "border-border-subtle" : "border-border-strong"}`}>
      <div className="shrink-0 flex flex-col items-center gap-1">
        <span className="w-7 h-7 rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center" title={h.source_ai}>
          {ICON_SM[srcKey] ?? <span className="text-[9px] font-bold">{h.source_ai[0]?.toUpperCase()}</span>}
        </span>
        <div className="w-px h-3 bg-border-strong" />
        <span className="w-7 h-7 rounded-full bg-foreground border border-background flex items-center justify-center text-background" title={h.target_ai}>
          {ICON_SM[tgtKey] ?? <span className="text-[9px] font-bold">{h.target_ai[0]?.toUpperCase()}</span>}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{h.source_ai} â†’ {h.target_ai}</p>
          <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${h.status === "pending" ? "text-amber-400 bg-amber-400/10" : h.status === "resolved" ? "text-emerald-400 bg-emerald-400/10" : "text-muted bg-surface-2"}`}>{h.status}</span>
        </div>
        <p className="text-xs text-foreground font-medium mb-1 line-clamp-2">{h.payload}</p>
        {h.instructions && <p className="text-[11px] text-emerald-400 font-mono break-words mb-1">Cmd: {h.instructions}</p>}
        {h.resolution_summary && <p className="text-[11px] text-muted italic">{h.resolution_summary}</p>}
        <p className="text-[10px] text-muted mt-2">
          {h.resolved_at ? `Resolved ${new Date(h.resolved_at).toLocaleString()}` : `Pushed ${new Date(h.created_at).toLocaleTimeString()}`}
        </p>
      </div>
    </div>
  );
}

// â”€â”€â”€ ProjectRouterPanel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ProjectRouterPanel({
  project: initialProject, ais: initialAIs, activeClients, onDelete, onUpdate,
}: {
  project: Project; ais: string[]; activeClients: any[];
  onDelete: () => void; onUpdate: (u: Partial<Project>) => void;
}) {
  const [project, setProject] = useState(initialProject);
  const [handoffs, setHandoffs] = useState<TaskHandoff[]>([]);
  const [loadingHandoffs, setLoadingHandoffs] = useState(true);
  const [historicalClients, setHistoricalClients] = useState<{client_name: string, last_seen: string}[]>([]);
  const [activeTab, setActiveTab] = useState<"queue" | "history">("queue");
  const [showConfig, setShowConfig] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(project.title);
  const renameRef = useRef<HTMLInputElement>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>((initialProject.project_status as ProjectStatus) || "active");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const loadData = () => {
    if (!project.id) return;
    setLoadingHandoffs(true);
    fetchFromMetaphor(`/graph/nodes/${project.id}/handoffs`, undefined, "GET")
      .then(res => setHandoffs(res?.handoffs || []))
      .catch(console.error)
      .finally(() => setLoadingHandoffs(false));
      
    fetchFromMetaphor(`/graph/nodes/${project.id}/connected-clients`, undefined, "GET")
      .then(res => setHistoricalClients(res?.clients || []))
      .catch(console.error);
  };

  useEffect(() => { loadData(); }, [project.id]);
  useEffect(() => { if (isRenaming && renameRef.current) renameRef.current.focus(); }, [isRenaming]);

  const pendingHandoffs  = handoffs.filter(h => h.status === "pending");
  const resolvedHandoffs = handoffs.filter(h => h.status !== "pending");

  const ecosystemBound = (initialAIs || []).filter(a => ECOSYSTEM_TOOLS.includes(a));
  const hasAtlas   = ecosystemBound.includes("Atlas");
  const hasWilliam = ecosystemBound.includes("William");

  const configSnippet = hasAtlas
    ? `# Atlas → Metaphor Handoff Config\n# Add to Atlas → supabase/functions/atlas-to-metaphor secrets:\nMETAPHOR_API_URL=${getBackendUrl()}\nMETAPHOR_API_KEY=YOUR_API_KEY_HERE\nMETAPHOR_PROJECT_ID=${project.id}`
    : hasWilliam
    ? `# William → Metaphor Config\n# Add to William server .env:\nMETAPHOR_API_URL=${getBackendUrl()}\nMETAPHOR_API_KEY=YOUR_API_KEY_HERE\nMETAPHOR_PROJECT_ID=${project.id}`
    : `{\n  "mcpServers": {\n    "metaphor": {\n      "url": "${getBackendUrl()}/mcp/sse?project_id=${project.id}&client_name=Cursor",\n      "headers": {\n        "X-API-Key": "YOUR_API_KEY_HERE"\n      }\n    }\n  }\n}`;

  const copyConfig = () => { navigator.clipboard.writeText(configSnippet); setCopiedConfig(true); setTimeout(() => setCopiedConfig(false), 2000); };

  const handleRename = async () => {
    const newTitle = renameValue.trim();
    if (!newTitle || newTitle === project.title || !project.id) { setIsRenaming(false); setRenameValue(project.title); return; }
    try {
      await fetchFromMetaphor(`/graph/nodes/${project.id}`, { title: newTitle }, "PATCH");
      setProject(p => ({ ...p, title: newTitle }));
      onUpdate({ title: newTitle });
    } catch (e) { console.error(e); }
    finally { setIsRenaming(false); }
  };



  const handleStatusChange = async (s: ProjectStatus) => {
    if (!project.id) return;
    setStatusOpen(false); setIsUpdatingStatus(true);
    try {
      await fetchFromMetaphor(`/graph/nodes/${project.id}`, { project_status: s }, "PATCH");
      setProjectStatus(s); onUpdate({ project_status: s });
    } catch (e) { console.error(e); }
    finally { setIsUpdatingStatus(false); }
  };

  const handleArchive = async () => {
    if (!project.id) return;
    setIsArchiving(true);
    try { await fetchFromMetaphor(`/graph/nodes/${project.id}`, { archive: true }, "PATCH"); onDelete(); }
    catch (e) { console.error(e); }
    finally { setIsArchiving(false); setConfirmArchive(false); }
  };

  const handleDelete = async () => {
    if (!project.id) return;
    setIsDeleting(true);
    try { await fetchFromMetaphor(`/graph/nodes/${project.id}`, undefined, "DELETE"); onDelete(); }
    catch (e) { console.error(e); }
    finally { setIsDeleting(false); setConfirmDelete(false); }
  };

  const handleClearQueue = async () => {
    if (!project.id) return;
    setIsClearing(true);
    try { await fetchFromMetaphor(`/graph/nodes/${project.id}/handoffs/clear`, undefined, "POST"); loadData(); }
    catch (e) { console.error(e); }
    finally { setIsClearing(false); }
  };

  if (!project.id) {
    return (
      <div className="border-t border-border-subtle bg-background p-6">
        <p className="text-xs text-muted italic">This project hasn't been saved to the backend yet. Re-create it using the form above.</p>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[projectStatus];

  return (
    <div className="border-t border-border-subtle bg-background animate-in fade-in slide-in-from-top-1 duration-150">

      {/* â”€â”€ Management Bar â”€â”€ */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between gap-3 border-b border-border-subtle/50">
        <div className="flex items-center gap-3 min-w-0">
          {/* Inline rename */}
          {isRenaming ? (
            <input ref={renameRef} value={renameValue} onChange={e => setRenameValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") { setIsRenaming(false); setRenameValue(project.title); } }}
              className="text-sm font-semibold text-foreground bg-transparent border-b border-foreground focus:outline-none max-w-[200px]"
            />
          ) : (
            <button onClick={() => { setIsRenaming(true); setRenameValue(project.title); }} className="flex items-center gap-1.5 group" title="Rename project">
              <span className="text-sm font-semibold text-foreground truncate max-w-[180px]">{project.title}</span>
              <Pencil className="w-3 h-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}
          {/* Status dropdown */}
          <div className="relative">
            <button onClick={() => setStatusOpen(v => !v)} className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border transition-all ${statusCfg.color}`}>
              {isUpdatingStatus ? <div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" /> : statusCfg.icon}
              {statusCfg.label}
            </button>
            {statusOpen && (
              <div className="absolute top-full left-0 mt-1 bg-surface-1 border border-border-subtle rounded-xl overflow-hidden shadow-lg z-20 w-36">
                {(Object.entries(STATUS_CONFIG) as [ProjectStatus, typeof statusCfg][]).map(([key, cfg]) => (
                  <button key={key} onClick={() => handleStatusChange(key)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium hover:bg-surface-2 transition-colors ${key === projectStatus ? "text-foreground" : "text-muted"}`}>
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => setShowConfig(!showConfig)}
            className="text-[10px] uppercase font-bold text-muted hover:text-foreground border border-border-subtle px-2 py-1 rounded-md transition-colors">
            {showConfig ? "Hide Config" : "MCP Config"}
          </button>
          {/* Archive */}
          {!confirmArchive ? (
            <button onClick={() => setConfirmArchive(true)} title="Archive" className="w-6 h-6 flex items-center justify-center rounded-md text-muted hover:text-amber-400 hover:bg-amber-400/10 transition-all">
              <Archive className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted">Archive?</span>
              <button onClick={handleArchive} disabled={isArchiving} className="text-[10px] font-bold text-amber-400 border border-amber-400/40 px-1.5 py-0.5 rounded disabled:opacity-50">{isArchiving ? "…" : "Yes"}</button>
              <button onClick={() => setConfirmArchive(false)} className="text-[10px] font-bold text-muted border border-border-subtle px-1.5 py-0.5 rounded">No</button>
            </div>
          )}
          {/* Delete */}
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} title="Delete" className="w-6 h-6 flex items-center justify-center rounded-md text-muted hover:text-red-400 hover:bg-red-400/10 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted">Delete?</span>
              <button onClick={handleDelete} disabled={isDeleting} className="text-[10px] font-bold text-red-400 border border-red-400/40 px-1.5 py-0.5 rounded disabled:opacity-50">{isDeleting ? "…" : "Yes"}</button>
              <button onClick={() => setConfirmDelete(false)} className="text-[10px] font-bold text-muted border border-border-subtle px-1.5 py-0.5 rounded">No</button>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* — Bound AI Tools (Auto-tracked via MCP) — */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Bound AI Tools</p>
            <span className="text-[10px] text-muted border border-border-subtle bg-surface-2 px-2 py-0.5 rounded-full">Auto-tracked via MCP</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {ALL_AI_TOOLS.map(ai => {
              const hasConnected = historicalClients.some(c => c.client_name?.toLowerCase() === ai.toLowerCase());
              const isLive = activeClients.some(c => c.project_id === project.id && c.client_name?.toLowerCase() === ai.toLowerCase());
              return (
                <div key={ai} title={ai}
                  className={`relative w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-150 cursor-default ${hasConnected ? isLive ? "bg-surface-1 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] text-foreground opacity-100" : "bg-surface-1 border-border-subtle text-foreground opacity-60" : "bg-surface-2 border-border-subtle text-muted opacity-25"}`}>
                  {AI_ICON_MAP[ai]}
                  {isLive && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-background" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* â”€â”€ MCP Config â”€â”€ */}
        {showConfig && (
          <div className="bg-surface-1 border border-border-subtle rounded-xl p-4">
            <p className="text-xs font-medium text-foreground mb-1">Bind {project.title} to your AI tools</p>
            <p className="text-xs text-muted leading-relaxed mb-4">Paste into your AI client's MCP settings. This scopes all tool calls to this project only.</p>
            <div className="relative group">
              <pre className="font-mono text-[11px] text-muted whitespace-pre-wrap">{configSnippet}</pre>
              <button onClick={copyConfig} className="absolute top-0 right-0 p-1.5 bg-background border border-border-subtle rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                {copiedConfig ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-muted" />}
              </button>
            </div>
          </div>
        )}

        {/* â”€â”€ Handoff Queue / History â”€â”€ */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1 bg-surface-1 border border-border-subtle rounded-lg p-1">
              <button onClick={() => setActiveTab("queue")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${activeTab === "queue" ? "bg-background text-foreground border border-border-subtle shadow-sm" : "text-muted hover:text-foreground"}`}>
                <ListChecks className="w-3 h-3" />
                Queue
                {pendingHandoffs.length > 0 && (
                  <span className="ml-0.5 w-4 h-4 rounded-full bg-foreground text-background text-[9px] font-bold flex items-center justify-center">{pendingHandoffs.length}</span>
                )}
              </button>
              <button onClick={() => setActiveTab("history")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${activeTab === "history" ? "bg-background text-foreground border border-border-subtle shadow-sm" : "text-muted hover:text-foreground"}`}>
                <History className="w-3 h-3" />
                History
                {resolvedHandoffs.length > 0 && <span className="ml-0.5 text-[10px] text-muted">({resolvedHandoffs.length})</span>}
              </button>
            </div>
            {activeTab === "queue" && pendingHandoffs.length > 0 && (
              <button onClick={handleClearQueue} disabled={isClearing}
                className="flex items-center gap-1.5 text-[10px] font-bold text-muted hover:text-foreground border border-border-subtle px-2 py-1 rounded-md transition-colors disabled:opacity-50">
                <X className="w-3 h-3" />
                {isClearing ? "Clearingâ€¦" : "Clear All"}
              </button>
            )}
          </div>

          {loadingHandoffs ? (
            <p className="text-xs text-muted animate-pulse">Loading handoffsâ€¦</p>
          ) : activeTab === "queue" ? (
            pendingHandoffs.length === 0 ? (
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 text-center">
                <Zap className="w-5 h-5 text-muted mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-foreground">Queue is empty</p>
                <p className="text-xs text-muted mt-1">No active tasks waiting in {project.title}.</p>
              </div>
            ) : (
              <div className="space-y-3">{pendingHandoffs.map(h => <HandoffCard key={h.id} handoff={h} />)}</div>
            )
          ) : (
            resolvedHandoffs.length === 0 ? (
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 text-center">
                <Clock className="w-5 h-5 text-muted mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-foreground">No history yet</p>
                <p className="text-xs text-muted mt-1">Completed and cancelled handoffs will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">{resolvedHandoffs.map(h => <HandoffCard key={h.id} handoff={h} />)}</div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ ProjectsPage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeClients, setActiveClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAIs, setNewAIs] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProjects();
    loadActiveClients();
    const interval = setInterval(loadActiveClients, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadActiveClients() {
    try {
      const res = await fetchFromMetaphor("/mcp/active-clients", undefined, "GET");
      if (res?.clients) setActiveClients(res.clients);
    } catch (e) {}
  }

  async function loadProjects() {
    setIsLoading(true);
    if (typeof window !== "undefined") {
      const local = localStorage.getItem("metaphor_projects");
      if (local) { try { setProjects(JSON.parse(local)); } catch (e) {} }
    }
    try {
      const res = await fetchFromMetaphor("/graph/nodes?type=project", undefined, "GET");
      if (res?.nodes && Array.isArray(res.nodes)) {
        const backendProjects: Project[] = res.nodes.map((n: any) => {
          const aiBound = n.summary?.startsWith("Bound to: ")
            ? n.summary.replace("Bound to: ", "").split(", ").filter(Boolean)
            : [];
          return {
            id: n.id, title: n.title, summary: n.summary, status: n.status,
            project_status: n.project_status || "active",
            created_at: n.created_at,
            attachedAIs: aiBound.filter((a: string) => a !== "No AI tools yet"),
          };
        });
        if (backendProjects.length > 0) setProjects(backendProjects);
      }
    } catch (e) { console.warn("Could not fetch projects from backend:", e); }
    finally { setIsLoading(false); }
  }

  const handleCreateProject = async () => {
    const name = newName.trim();
    if (!name) return;
    setIsSaving(true);
    try {
      const res = await fetchFromMetaphor("/graph/nodes", {
        type: "project", title: name,
        summary: `Bound to: ${newAIs.join(", ") || "No AI tools yet"}`,
        content: "", metadata: { attached_ais: newAIs }
      }, "POST");
      const projectId = res?.id || crypto.randomUUID();
      const newProject: Project = { id: projectId, title: name, project_status: "active", attachedAIs: newAIs };
      setProjects(prev => {
        const updated = [...prev, newProject];
        if (typeof window !== "undefined") localStorage.setItem("metaphor_projects", JSON.stringify(updated));
        return updated;
      });
      setNewName(""); setNewAIs([]); setShowCreate(false);
      setExpandedId(projectId);
    } catch (e) { 
      console.warn("Failed to create project on backend, generating local ID (Sovereign mode):", e);
      const projectId = crypto.randomUUID();
      const newProject: Project = { id: projectId, title: name, project_status: "active", attachedAIs: newAIs };
      setProjects(prev => {
        const updated = [...prev, newProject];
        if (typeof window !== "undefined") localStorage.setItem("metaphor_projects", JSON.stringify(updated));
        return updated;
      });
      setNewName(""); setNewAIs([]); setShowCreate(false);
      setExpandedId(projectId);
    }
    finally { setIsSaving(false); }
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects(prev => {
      const updated = prev.filter(p => p.id !== projectId);
      if (typeof window !== "undefined") localStorage.setItem("metaphor_projects", JSON.stringify(updated));
      return updated;
    });
    setExpandedId(null);
  };

  const handleUpdateProject = (projectId: string, updates: Partial<Project>) => {
    setProjects(prev => {
      const updated = prev.map(p => p.id === projectId ? { ...p, ...updates } : p);
      if (typeof window !== "undefined") localStorage.setItem("metaphor_projects", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="relative w-full min-h-full animate-in fade-in duration-200">
      <div className="relative z-10 w-full max-w-3xl mx-auto p-8 pb-16 flex flex-col">

        {/* Header */}
        <div className="mb-12 border-b border-border-subtle/50 pb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Folder className="w-4 h-4 text-muted" />
              <h1 className="text-sm font-semibold text-muted uppercase tracking-widest">Projects</h1>
            </div>
            <button onClick={() => { setShowCreate(v => !v); setNewName(""); setNewAIs([]); }}
              className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border-subtle hover:border-border-strong">
              {showCreate ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showCreate ? "Cancel" : "New Project"}
            </button>
          </div>
          <p className="text-2xl font-medium tracking-tight text-foreground leading-snug">Your bound projects.</p>
          <p className="text-muted text-sm mt-2 font-medium tracking-tight">
            Each project is a context scope. Manage status, bound AIs, and task handoffs from within each card.
          </p>
        </div>

        {/* Inline Create Form */}
        {showCreate && (
          <div className="mb-6 p-6 bg-surface-1 border border-border-subtle rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-4">New Project</p>
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && newName.trim()) handleCreateProject(); }}
              placeholder="e.g. Atlas Platform, Metaphor OS, Client Launch…"
              className="w-full bg-transparent text-foreground text-base font-medium placeholder:text-muted focus:outline-none border-b border-border-strong pb-3 mb-6 focus:border-foreground transition-colors"
            />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Bind AI Tools</p>
            <div className="flex gap-2 mb-5 flex-wrap">
              {ALL_AI_TOOLS.map(ai => {
                const active = newAIs.includes(ai);
                return (
                  <button key={ai} title={ai} onClick={() => setNewAIs(prev => prev.includes(ai) ? prev.filter(a => a !== ai) : [...prev, ai])}
                    className={`relative w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-150 ${active ? "bg-foreground text-background border-foreground" : "bg-surface-2 text-muted border-border-subtle hover:border-border-strong hover:text-foreground"}`}>
                    {AI_ICON_MAP[ai]}
                    {active && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-foreground border-2 border-background flex items-center justify-center">
                        <Check className="w-1.5 h-1.5 text-background stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <button onClick={handleCreateProject} disabled={!newName.trim() || isSaving}
              className="w-full py-3 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-all disabled:opacity-30 flex items-center justify-center gap-2">
              {isSaving ? <><div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" /> Creatingâ€¦</> : <>Create Project <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {/* Project List */}
        {isLoading && projects.length === 0 ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-surface-1 border border-border-subtle animate-pulse" />)}
          </div>
        ) : projects.length === 0 && !showCreate ? (
          <div className="flex flex-col items-center text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-surface-1 border border-border-subtle flex items-center justify-center mb-6">
              <Folder className="w-5 h-5 text-muted" />
            </div>
            <h2 className="text-base font-semibold text-foreground tracking-tight mb-2">No projects yet</h2>
            <p className="text-sm text-muted max-w-xs leading-relaxed mb-8">Projects give your AI tools a shared context scope. Create your first one to launch a session.</p>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-6 py-3 bg-foreground text-background text-sm font-medium rounded-xl hover:opacity-90 transition-all">
              <Plus className="w-4 h-4" /> Create your first project
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project, idx) => {
              const id = project.id || String(idx);
              const title = project.title || project.name || "Untitled";
              const ais = project.attachedAIs || [];
              const isOpen = expandedId === id;
              const pStatus = (project.project_status || "active") as ProjectStatus;
              const pStatusCfg = STATUS_CONFIG[pStatus];

              return (
                <div key={id} className="rounded-xl border border-border-subtle overflow-hidden transition-all duration-200">
                  <button onClick={async () => {
                    const newId = expandedId === id ? null : id;
                    setExpandedId(newId);
                    if (newId) {
                      try {
                        await fetchFromMetaphor("/system/active-context", { project_id: newId }, "POST");
                      } catch (e) {
                        console.warn("Failed to auto-sync sovereign context:", e);
                      }
                    }
                  }}
                    className="w-full flex items-center justify-between p-5 bg-surface-1 hover:bg-surface-2 transition-colors text-left">
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-lg bg-background border border-border-subtle flex items-center justify-center shrink-0">
                        <Folder className="w-4 h-4 text-foreground" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground tracking-tight">{title}</span>
                          <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${pStatusCfg.color}`}>
                            {pStatusCfg.icon}{pStatusCfg.label}
                          </span>
                        </div>
                        <div className="flex gap-1.5 items-center">
                          {ais.length > 0 ? ais.map(ai => {
                            const isActive = activeClients.some(c => c.project_id === id && c.client_name?.toLowerCase() === ai.toLowerCase());
                            return (
                              <span key={ai} title={isActive ? `${ai} (Active)` : ai}
                                className={`w-5 h-5 rounded-full bg-surface-2 border flex items-center justify-center text-foreground transition-all duration-300 ${isActive ? "border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] opacity-100" : "border-border-subtle opacity-40"}`}>
                                {AI_ICON_MAP[ai] ?? <span className="text-[8px] font-bold">{ai[0]}</span>}
                              </span>
                            );
                          }) : <span className="text-[11px] text-muted italic">No AI tools bound</span>}
                        </div>
                      </div>
                    </div>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-muted shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted shrink-0" />}
                  </button>

                  {isOpen && (
                    <ProjectRouterPanel
                      project={project} ais={ais} activeClients={activeClients}
                      onDelete={() => handleDeleteProject(id)}
                      onUpdate={(updates) => handleUpdateProject(id, updates)}
                    />
                  )}
                </div>
              );
            })}

            {!showCreate && (
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-4 p-5 w-full rounded-xl border border-dashed border-border-subtle hover:border-border-strong text-muted hover:text-foreground transition-all duration-200 cursor-pointer group">
                <div className="w-9 h-9 rounded-lg bg-surface-1 border border-border-subtle flex items-center justify-center shrink-0 group-hover:bg-surface-2 transition-colors">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Add another project</span>
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
